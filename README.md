# 🧩 Kinoo TV - Chrome Extension

![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E)
![Chrome](https://img.shields.io/badge/Chrome-4285F4?style=for-the-badge&logo=google-chrome&logoColor=white)
![Firebase](https://img.shields.io/badge/firebase-%23039BE5.svg?style=for-the-badge&logo=firebase)

**Kinoo TV Extension** is a Google Chrome add-on created as an **educational project (Proof of Concept)**. It extends the functionality of the [filman.cc](https://filman.cc) service by integrating it with Firebase cloud for watchlist synchronization.

> **Main Purpose:** This extension acts as a "companion" for the **[Kinoo TV](https://github.com/konradcz2001/KinooTV) Android TV app**. It allows you to conveniently manage your movie library on your computer and access it instantly on the big screen.

## 📱 Kinoo TV Ecosystem

This extension works closely with the TV application. By using a shared **Firebase Realtime Database**, synchronization happens in real-time.

1. **Find on PC:** Browse the service on your computer and find an interesting movie.
2. **Click "Watchlist":** The extension injects a button directly onto the movie page.
3. **Watch on TV:** The movie immediately appears in the "Watchlist" section of the **Kinoo TV** app on your television.

## ✨ Key Features

* **DOM Injection:** Automatically injects UI buttons (*Watchlist*, *List*) into the page structure using `MutationObserver` (works even with dynamically loaded content).
* **Smart Scraping:** Extracts movie metadata (title, year, rating, poster, description) directly from the page to display it beautifully in the TV app.
* **YouTube Integration:** Searches for and plays movie trailers directly in a pop-up window using the **YouTube Data API v3**. It intelligently selects the title (omitting Polish translations) for better search results.
* **Watch Status:** The button changes color and status (*Watchlist* / *Watching*) depending on whether the movie is already in your database.
* **Secure Architecture:** Uses local Firebase libraries (Manifest V3 and CSP compliant) and an isolated script context to protect API keys.
* **List Preview:** A built-in modal allows you to view and manage your watchlist without leaving the movie page.

## 📸 Screenshots

<div align="center">
  <img src="readme_assets/buttons.png" alt="Buttons">
</div>

<div align="center">
  <img src="readme_assets/list.png" alt="List">
</div>

<div align="center">
  <img src="readme_assets/youtube.png" alt="YouTube">
</div>

## 🛠️ Installation (Developer Mode)

The extension is not available in the Chrome Web Store (it is a private educational project). To install it:

1. **Clone the repository**
2. **Configure the environment:**
   * Ensure the `libs/` folder contains: `firebase-app.js`, `firebase-auth.js`, `firebase-database.js`.
   * Create a `config.js` file in the root directory (see Configuration section).
3. **Load into Chrome:**
   * Open your browser and navigate to: `chrome://extensions`.
   * Enable **Developer mode** (top right corner).
   * Click **Load unpacked**.
   * Select the folder containing the downloaded project.

## ⚙️ Configuration

For security reasons, the file containing API keys is not included in the repository. Create a `config.js` file in the project's root directory:

```javascript
export const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    databaseURL: "DATABASE_URL" (e.g., "https://YOUR_PROJECT-default-rtdb.europe-west1.firebasedatabase.app"),
    projectId: "YOUR_PROJECT",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "SENDER_ID",
    appId: "APP_ID",
    measurementId: "G-XXXXXX"
};

export const AUTO_LOGIN_EMAIL = "your_email@example.com";
export const AUTO_LOGIN_PASS = "your_password";

export const YOUTUBE_API_KEY = "YOUR_YT_API_KEY";
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
