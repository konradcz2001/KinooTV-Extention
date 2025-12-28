# 🧩 Kinoo TV - Chrome Extension

![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E)
![Chrome](https://img.shields.io/badge/Chrome-4285F4?style=for-the-badge&logo=google-chrome&logoColor=white)
![Firebase](https://img.shields.io/badge/firebase-%23039BE5.svg?style=for-the-badge&logo=firebase)

**Kinoo TV Extension** to dodatek do przeglądarki Google Chrome, stworzony jako **projekt edukacyjny (Proof of Concept)**. Rozszerza on funkcjonalność serwisu [filman.cc](https://filman.cc), integrując go z chmurą Firebase w celu synchronizacji listy obserwowanych filmów czy seriali.

> **Główny cel:** Rozszerzenie pełni rolę "kompana" dla aplikacji **Kinoo TV na Android TV**. Pozwala wygodnie zarządzać biblioteką filmów na komputerze, aby natychmiast mieć do nich dostęp na dużym ekranie.

## 📱 Ekosystem Kinoo TV

To rozszerzenie ściśle współpracuje z aplikacją na TV. Dzięki wykorzystaniu wspólnej bazy danych **Firebase Realtime Database**, synchronizacja odbywa się w czasie rzeczywistym.

1. **Znajdź na PC:** Przeglądasz serwis na komputerze i znajdujesz ciekawy film.
2. **Kliknij "Obserwuj":** Rozszerzenie wstrzykuje przycisk bezpośrednio na stronę filmu.
3. **Oglądaj na TV:** Film natychmiast pojawia się w sekcji "Obserwowane" w aplikacji **Kinoo TV** na Twoim telewizorze.

## ✨ Główne Funkcjonalności

* **DOM Injection:** Automatycznie wstrzykuje przyciski interfejsu (*Obserwuj*, *Lista*) w strukturę strony, używając `MutationObserver` (działa nawet przy dynamicznym ładowaniu treści).
* **Smart Scraping:** Pobiera metadane filmu (tytuł, rok, ocena, plakat, opis) bezpośrednio ze strony, aby wyświetlić je ładnie w aplikacji TV.
* **Status Oglądania:** Przycisk zmienia kolor i status (*Obserwuj* / *Obserwuję*) w zależności od tego, czy film jest już w Twojej bazie.
* **Bezpieczna Architektura:** Wykorzystuje lokalne biblioteki Firebase (zgodność z CSP i Manifest V3) oraz izolowany kontekst skryptów dla bezpieczeństwa kluczy API.
* **Podgląd Listy:** Wbudowany modal pozwala podejrzeć i zarządzać swoją listą obserwowanych bez wychodzenia ze strony filmu.

## 📸 Screenshots

![Przyciski](readme_assets/buttons.png)

<div align="center">
  <img src="readme_assets/list.png" alt="Lista">
</div>

## 🛠️ Instalacja (Tryb Deweloperski)

Rozszerzenie nie jest dostępne w Chrome Web Store (jest to prywatny projekt edukacyjny). Aby je zainstalować:

1. **Sklonuj repozytorium**
2. **Skonfiguruj środowisko:**
   * Upewnij się, że w folderze `libs/` znajdują się pliki: `firebase-app.js`, `firebase-auth.js`, `firebase-database.js`.
   * Utwórz plik `config.js` w głównym katalogu (patrz sekcja Konfiguracja).
3. **Załaduj do Chrome:**
   * Otwórz przeglądarkę i wpisz w pasek adresu: `chrome://extensions`.
   * Włącz **Tryb dewelopera** (prawy górny róg).
   * Kliknij **Załaduj rozpakowane** (Load unpacked).
   * Wskaż folder z pobranym projektem.

## ⚙️ Konfiguracja

Ze względów bezpieczeństwa plik z kluczami API nie jest dołączony do repozytorium. Utwórz plik `config.js` w głównym katalogu projektu:

```javascript
export const firebaseConfig = {
    apiKey: "TWOJE_API_KEY",
    authDomain: "twoj-projekt.firebaseapp.com",
    databaseURL: "[https://twoj-projekt-default-rtdb.europe-west1.firebasedatabase.app](https://twoj-projekt-default-rtdb.europe-west1.firebasedatabase.app)",
    projectId: "twoj-projekt",
    storageBucket: "twoj-projekt.appspot.com",
    messagingSenderId: "NUMER",
    appId: "APP_ID",
    measurementId: "G-XXXXXX"
};

export const AUTO_LOGIN_EMAIL = "twoj_email@example.com";
export const AUTO_LOGIN_PASS = "twoje_haslo";
```

## 📄 Licencja

Ten projekt jest udostępniony na licencji MIT - zobacz plik [LICENSE](LICENSE) po więcej szczegółów.