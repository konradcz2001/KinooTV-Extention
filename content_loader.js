(async () => {
    const src = chrome.runtime.getURL('app_logic.js');
    try {
        await import(src);
        console.log("🔒 Kinoo TV: Loaded safely in an isolated context.");
    } catch (e) {
        console.error("❌ Kinoo TV Error:", e);
    }
})();