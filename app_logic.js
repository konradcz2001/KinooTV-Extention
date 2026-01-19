// === STARTUP LOG ===
console.log("%c--- Kinoo TV EXTENSION: START (V5 - OBSERVER) ---", "background: yellow; color: black; font-size: 14px; font-weight: bold;");

// === LOCAL LIBRARY IMPORTS ===
import { initializeApp } from "./libs/firebase-app.js";
import { getDatabase, ref, set, remove, onValue } from "./libs/firebase-database.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "./libs/firebase-auth.js";

// === CONFIG IMPORT ===
import { firebaseConfig, AUTO_LOGIN_EMAIL, AUTO_LOGIN_PASS, YOUTUBE_API_KEY } from "./config.js";

console.log("✅ Firebase libraries loaded from local ./libs/");

// ============================================================
// INITIALIZATION
// ============================================================
let app, db, auth;
try {
    console.log("⚙️ Initializing Firebase...");
    app = initializeApp(firebaseConfig);
    db = getDatabase(app);
    auth = getAuth(app);
    console.log("✅ Firebase initialized successfully.");
} catch (e) {
    console.error("❌ FIREBASE INITIALIZATION ERROR:", e);
}

let currentUser = null;

// ============================================================
// HELPERS
// ============================================================
function encodeUrlToKey(url) {
    const utf8Bytes = new TextEncoder().encode(url);
    const base64 = btoa(String.fromCharCode(...utf8Bytes));
    return base64
        .replace(/\//g, '_').replace(/\+/g, '-').replace(/=/g, '')
        .replace(/\./g, '').replace(/#/g, '').replace(/\$/g, '')
        .replace(/\[/g, '').replace(/\]/g, '');
}

function scrapeMovieData() {
    console.log("🕷️ Scraping data from page...");
    const url = window.location.href;
    const isSeries = url.includes('/s/');
    
    let title = "";
    if (isSeries) {
        const h2 = document.querySelector('#item-headline h2');
        title = h2 ? h2.innerText.trim() : document.title;
    } else {
        const span = document.querySelector('span[itemprop="title"]');
        title = span ? span.innerText.trim() : document.title;
    }

    const descriptionEl = document.querySelector('.description');
    const description = descriptionEl ? descriptionEl.innerText.trim() : "";

    const imgEl = document.querySelector('#single-poster img');
    let imageUrl = imgEl ? imgEl.src : "";
    if (imageUrl && !imageUrl.startsWith('http')) {
        imageUrl = window.location.origin + imageUrl;
    }

    let year = "";
    let views = "";
    const infoLis = document.querySelectorAll('.info ul li');
    infoLis.forEach((li, index) => {
        const text = li.innerText;
        if (text.includes("Rok:") || text.includes("Premiera:")) {
            if (infoLis[index + 1]) year = infoLis[index + 1].innerText.trim();
        }
        if (text.includes("Odsłony:")) {
            if (infoLis[index + 1]) views = infoLis[index + 1].innerText.trim();
        }
    });

    const ratingVal = document.querySelector('span[itemprop="ratingValue"]')?.innerText.trim() || "";
    const ratingCount = document.querySelector('span[itemprop="reviewCount"]')?.innerText.trim() || "";
    let rating = ratingVal ? `${ratingVal} (${ratingCount})` : "";

    const data = { title, description, imageUrl, moviePageUrl: url, year, rating, views, series: isSeries };
    console.log("📦 Scraped data:", data);
    return data;
}

async function getYouTubeTrailerId(query) {
    console.log(`🔎 API Searching YouTube for: ${query}`);
    
    if (!YOUTUBE_API_KEY || YOUTUBE_API_KEY === "YOUR_API_KEY_HERE") {
        console.error("❌ Missing YouTube API Key in config.js!");
        alert("Configuration Error: Missing YouTube API Key.");
        return null;
    }

    try {
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=1&key=${YOUTUBE_API_KEY}`;
        
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            console.error("❌ YouTube API Error:", data.error.message);
            return null;
        }

        if (data.items && data.items.length > 0) {
            const videoId = data.items[0].id.videoId;
            console.log(`✅ Found Video ID (API): ${videoId}`);
            return videoId;
        } else {
            console.warn("⚠️ API returned no results.");
        }
    } catch (e) {
        console.error("❌ YouTube fetch error:", e);
    }
    return null;
}

// ============================================================
// UI: MODALS
// ============================================================
function createWatchlistModal() {
    console.log("🔘 'Watchlist' button clicked");
    if (!currentUser) {
        alert("Trwa łączenie z bazą... spróbuj za chwilę.");
        return;
    }

    if (document.getElementById('filman-watchlist-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'filman-watchlist-modal';
    modal.className = 'filman-extension-modal';
    
    modal.innerHTML = `
        <div class="filman-extension-content">
            <div class="filman-extension-header">
                <span>LISTA OBSERWOWANYCH</span>
                <span class="filman-extension-close">&times;</span>
            </div>
            <div class="filman-extension-body" id="filman-watchlist-body">
                <div style="text-align: center; margin-top: 50px; color: #888;">Ładowanie...</div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);

    const close = () => document.body.removeChild(modal);
    modal.querySelector('.filman-extension-close').onclick = close;
    modal.onclick = (e) => { if (e.target === modal) close(); };

    console.log(`📡 Fetching list from DB...`);
    const dbRef = ref(db, `watchlist/${currentUser.uid}`);
    
    onValue(dbRef, (snapshot) => {
        const container = document.getElementById('filman-watchlist-body');
        if (!container) return;

        if (!snapshot.exists()) {
            console.log("ℹ️ Watchlist is empty.");
            container.innerHTML = '<div style="text-align: center; margin-top: 20px; color: #888;">Lista jest pusta</div>';
            return;
        }

        const data = snapshot.val();
        console.log(`✅ Fetched ${Object.keys(data).length} items.`);
        const movies = [];
        const serials = [];

        Object.keys(data).forEach(key => {
            const item = { ...data[key], key: key };
            if (item.series === true) serials.push(item);
            else movies.push(item);
        });

        const generateItemHTML = (item) => `
            <div class="filman-item">
                <img src="${item.imageUrl}" class="filman-item-img" onerror="this.style.display='none'">
                <div class="filman-item-info">
                    <a href="${item.moviePageUrl}" class="filman-item-title">${item.title}</a>
                    <div class="filman-item-meta">${item.year} • ★ ${item.rating}</div>
                </div>
                <button class="filman-delete-btn" data-key="${item.key}" title="Usuń">
                     <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2 2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            </div>
        `;

        let html = '';
        if (movies.length > 0) {
            html += '<div class="filman-section-title">Filmy</div>';
            movies.reverse().forEach(m => html += generateItemHTML(m));
        }
        if (serials.length > 0) {
            html += '<div class="filman-section-title">Seriale</div>';
            serials.reverse().forEach(s => html += generateItemHTML(s));
        }
        container.innerHTML = html;

        document.querySelectorAll('.filman-delete-btn').forEach(btn => {
            btn.onclick = (e) => {
                const key = e.currentTarget.getAttribute('data-key');
                if (confirm('Usunąć?')) {
                    console.log("🗑️ Deleting item:", key);
                    remove(ref(db, `watchlist/${currentUser.uid}/${key}`))
                        .catch(err => console.error("❌ Delete error:", err));
                }
            };
        });
    });
}

function createTrailerModal(videoId) {
    if (document.getElementById('filman-trailer-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'filman-trailer-modal';
    modal.className = 'filman-extension-modal';
    
    modal.innerHTML = `
        <div class="filman-extension-content" style="max-width: 800px; height: auto;">
            <div class="filman-extension-header">
                <span>ZWIASTUN</span>
                <span class="filman-extension-close">&times;</span>
            </div>
            <div class="filman-player-container">
                <iframe 
                    src="https://www.youtube.com/embed/${videoId}?autoplay=1" 
                    title="YouTube video player" 
                    frameborder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                    allowfullscreen>
                </iframe>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);

    const close = () => document.body.removeChild(modal);
    modal.querySelector('.filman-extension-close').onclick = close;
    modal.onclick = (e) => { if (e.target === modal) close(); };
}

// ============================================================
// DOM INJECTION LOGIC
// ============================================================
function injectButtons() {
    if (document.getElementById('filman-extension-container')) {
        return;
    }
    
    console.log("💉 Starting injectButtons()...");

    const allHeaders = document.querySelectorAll('#item-info h4');
    let targetHeader = null;
    
    for (const h of allHeaders) {
        if (h.innerText.trim() === "Opis" || h.innerText.trim() === "Streszczenie") { 
            targetHeader = h; 
            console.log("✅ Found header 'Opis'/'Streszczenie'.");
            break; 
        }
    }
    if (!targetHeader) {
        const descP = document.querySelector('.description');
        if (descP) {
            targetHeader = descP;
            console.log("✅ Found .description element");
        }
    }
    if (!targetHeader) {
        targetHeader = document.querySelector('#item-info');
        if(targetHeader) console.log("✅ Found #item-info container");
    }
    
    if (!targetHeader) {
        console.warn("⚠️ Target container not found yet. Observer will retry.");
        return;
    }

    const btnContainer = document.createElement('div');
    btnContainer.id = 'filman-extension-container';

    // --- BUTTON 1: TOGGLE WATCH ---
    const mainBtn = document.createElement('button');
    mainBtn.className = 'filman-btn filman-btn-grey';

    // --- BUTTON 2: SHOW LIST ---
    const listBtn = document.createElement('button');
    listBtn.innerText = "LISTA OBSERWOWANYCH";
    listBtn.className = 'filman-btn filman-btn-grey';
    listBtn.onclick = createWatchlistModal;

    // --- BUTTON 3: YOUTUBE ---
    const ytBtn = document.createElement('button');
    ytBtn.id = 'filman-yt-btn';
    ytBtn.className = 'filman-btn filman-btn-grey';
    ytBtn.innerHTML = `
        <span style="display: flex; align-items: center; justify-content: center;">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="white" style="margin-right: 8px;"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>
            YOUTUBE
        </span>
    `;
    
    ytBtn.onclick = async () => {
        if (ytBtn.disabled) return;
        
        const originalText = ytBtn.innerHTML;
        ytBtn.innerText = "SZUKANIE...";
        ytBtn.disabled = true;

        const data = scrapeMovieData();
        const rawTitle = data.title;
        
        const slashCount = (rawTitle.match(/\//g) || []).length;
        let queryTitle = rawTitle.trim();
        if (slashCount === 1) {
            queryTitle = rawTitle.split('/')[1].trim();
        }
        
        const query = `${queryTitle} trailer ${data.year}`;
        
        const videoId = await getYouTubeTrailerId(query);
        
        ytBtn.innerHTML = originalText;
        ytBtn.disabled = false;

        if (videoId) {
            createTrailerModal(videoId);
        } else {
            alert("Nie znaleziono zwiastuna.");
        }
    };

    btnContainer.appendChild(mainBtn);
    btnContainer.appendChild(listBtn);
    btnContainer.appendChild(ytBtn);

    if (targetHeader.id === 'item-info') {
        targetHeader.prepend(btnContainer);
    } else {
        targetHeader.parentNode.insertBefore(btnContainer, targetHeader);
    }
    console.log("✅ Buttons injected into DOM.");

    // === STATE HANDLING ===
    if (!currentUser) {
        console.log("🔒 State: Not logged in. Button disabled.");
        mainBtn.innerText = "Łączenie z bazą...";
        mainBtn.disabled = true;
    } else {
        console.log("🔓 State: Logged in. Checking if movie is watched...");
        mainBtn.disabled = false;
        const tempUrl = window.location.href;
        const movieKey = encodeUrlToKey(tempUrl);
        const dbRef = ref(db, `watchlist/${currentUser.uid}/${movieKey}`);

        const setUnwatchedStyle = () => {
            mainBtn.innerText = "OBSERWUJ";
            mainBtn.className = 'filman-btn filman-btn-grey';
        };

        const setWatchedStyle = () => {
            mainBtn.innerText = "OBSERWUJĘ";
            mainBtn.className = 'filman-btn filman-btn-red';
        };

        setUnwatchedStyle();

        onValue(dbRef, (snapshot) => {
            if (snapshot.exists()) {
                setWatchedStyle();
            } else {
                setUnwatchedStyle();
            }
        });

        mainBtn.onclick = () => {
            console.log("🔘 WATCH/UNWATCH clicked");
            onValue(dbRef, (snapshot) => {
                if (snapshot.exists()) {
                    console.log("🗑️ Removing movie from DB...");
                    remove(dbRef).catch(err => alert("Error: " + err));
                } else {
                    console.log("💾 Saving movie to DB...");
                    const dataToSave = scrapeMovieData();
                    set(dbRef, dataToSave).catch(err => alert("Error: " + err));
                }
            }, { onlyOnce: true });
        };
    }
}

// ============================================================
// AUTH & OBSERVERS
// ============================================================
console.log("🏁 Starting AuthStateChanged listener...");

onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("✅✅✅ AUTO-LOGIN SUCCESS! Logged as:", user.email);
        currentUser = user;
        injectButtons();
        startObservers();
    } else {
        console.log("🔄 User not logged in. Attempting background auto-login...");
        signInWithEmailAndPassword(auth, AUTO_LOGIN_EMAIL, AUTO_LOGIN_PASS)
            .then(() => console.log("🔑 SignIn called successfully."))
            .catch((error) => {
                console.error("❌❌❌ AUTO-LOGIN ERROR:", error.message);
            });
    }
});

function startObservers() {
    console.log("👀 Starting DOM Observers...");
    
    const bodyObserver = new MutationObserver((mutations) => {
        if (!document.getElementById('filman-extension-container')) {
            injectButtons();
        }
    });

    bodyObserver.observe(document.body, { childList: true, subtree: true });

    injectButtons();
}