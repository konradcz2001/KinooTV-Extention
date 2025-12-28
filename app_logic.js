// === STARTUP LOG ===
console.log("%c--- Kinoo TV EXTENSION: START (V5 - OBSERVER) ---", "background: yellow; color: black; font-size: 14px; font-weight: bold;");

// === LOCAL LIBRARY IMPORTS ===
// Using local files to comply with Manifest V3 and CSP safety rules
import { initializeApp } from "./libs/firebase-app.js";
import { getDatabase, ref, set, remove, onValue } from "./libs/firebase-database.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "./libs/firebase-auth.js";

// === CONFIG IMPORT ===
import { firebaseConfig, AUTO_LOGIN_EMAIL, AUTO_LOGIN_PASS } from "./config.js";

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
    // Encodes URL to a valid Firebase Realtime Database key
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
        // Identification based on Polish labels on the website
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

// ============================================================
// UI: WATCHLIST MODAL
// ============================================================
function createWatchlistModal() {
    console.log("🔘 'Watchlist' button clicked");
    if (!currentUser) {
        alert("Trwa łączenie z bazą... spróbuj za chwilę."); // UI: "Connecting..."
        return;
    }

    if (document.getElementById('filman-watchlist-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'filman-watchlist-modal';
    modal.className = 'filman-extension-modal';
    
    // HTML Structure (UI in Polish)
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

    // Fetching data from user's node
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

        // Attach delete handlers
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

// ============================================================
// DOM INJECTION LOGIC
// ============================================================
function injectButtons() {
    // Check if buttons already exist to prevent duplicates
    if (document.getElementById('filman-extension-container')) {
        return;
    }
    
    console.log("💉 Starting injectButtons()...");

    // Finding the injection target (Header or Description)
    const allHeaders = document.querySelectorAll('#item-info h4');
    let targetHeader = null;
    
    // 1. Look for specific Polish headers
    for (const h of allHeaders) {
        if (h.innerText.trim() === "Opis" || h.innerText.trim() === "Streszczenie") { 
            targetHeader = h; 
            console.log("✅ Found header 'Opis'/'Streszczenie'.");
            break; 
        }
    }
    // 2. Fallback to description class
    if (!targetHeader) {
        const descP = document.querySelector('.description');
        if (descP) {
            targetHeader = descP;
            console.log("✅ Found .description element");
        }
    }
    // 3. Fallback to main container
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
    btnContainer.style.marginBottom = "20px";

    // --- BUTTON 1: TOGGLE WATCH ---
    const mainBtn = document.createElement('button');
    mainBtn.style.display = "block";
    mainBtn.style.width = "100%";
    mainBtn.style.padding = "12px";
    mainBtn.style.marginBottom = "10px";
    mainBtn.style.border = "none";
    mainBtn.style.borderRadius = "4px";
    mainBtn.style.fontWeight = "bold";
    mainBtn.style.cursor = "pointer";
    mainBtn.style.fontSize = "16px";
    mainBtn.style.color = "white";
    mainBtn.style.transition = "all 0.3s";

    // --- BUTTON 2: SHOW LIST ---
    const listBtn = document.createElement('button');
    listBtn.innerText = "LISTA OBSERWOWANYCH"; // UI: "Watchlist"
    listBtn.style.display = "block";
    listBtn.style.width = "100%";
    listBtn.style.padding = "12px";
    listBtn.style.border = "1px solid #666";
    listBtn.style.borderRadius = "4px";
    listBtn.style.fontWeight = "bold";
    listBtn.style.cursor = "pointer";
    listBtn.style.fontSize = "16px";
    listBtn.style.color = "white";
    listBtn.style.backgroundColor = "#333333";
    
    listBtn.onmouseover = () => listBtn.style.backgroundColor = "#666666";
    listBtn.onmouseout = () => listBtn.style.backgroundColor = "#333333";
    listBtn.onclick = createWatchlistModal;

    btnContainer.appendChild(mainBtn);
    btnContainer.appendChild(listBtn);

    // Inject into DOM
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
        mainBtn.style.backgroundColor = "#555";
        mainBtn.disabled = true;
    } else {
        console.log("🔓 State: Logged in. Checking if movie is watched...");
        mainBtn.disabled = false;
        const tempUrl = window.location.href;
        const movieKey = encodeUrlToKey(tempUrl);
        const dbRef = ref(db, `watchlist/${currentUser.uid}/${movieKey}`);

        const setUnwatchedStyle = () => {
            mainBtn.innerText = "OBSERWUJ"; // UI: "Watch"
            mainBtn.style.backgroundColor = "#333333";
            mainBtn.style.border = "1px solid #666";
            mainBtn.onmouseover = () => mainBtn.style.backgroundColor = "#666666";
            mainBtn.onmouseout = () => mainBtn.style.backgroundColor = "#333333";
        };

        const setWatchedStyle = () => {
            mainBtn.innerText = "OBSERWUJĘ"; // UI: "Watching"
            mainBtn.style.backgroundColor = "#E50914";
            mainBtn.style.border = "1px solid #E50914";
            mainBtn.onmouseover = () => mainBtn.style.backgroundColor = "#99070D";
            mainBtn.onmouseout = () => mainBtn.style.backgroundColor = "#E50914";
        };

        // Default state
        setUnwatchedStyle();

        // Listen for database changes
        onValue(dbRef, (snapshot) => {
            if (snapshot.exists()) {
                setWatchedStyle();
            } else {
                setUnwatchedStyle();
            }
        });

        // Toggle action
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
        // Trigger injection in case observer hasn't caught it yet
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
    
    // Observer: Watches for changes in the DOM body (e.g., dynamic content loading)
    const bodyObserver = new MutationObserver((mutations) => {
        // If buttons don't exist, try to inject them
        if (!document.getElementById('filman-extension-container')) {
            injectButtons();
        }
    });

    bodyObserver.observe(document.body, { childList: true, subtree: true });

    // Initial check just in case document is already ready
    injectButtons();
}