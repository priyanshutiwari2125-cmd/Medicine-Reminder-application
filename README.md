# MediMind - Medicine Reminder Application

🌐 **Live Demo:** [Launch MediMind App](https://priyanshutiwari2125-cmd.github.io/Medicine-Reminder-application/)

MediMind is a premium, responsive medicine reminder application designed to help users track their medications, schedules, daily progress, and adherence rates. The application is built to run as both a local desktop application (via Electron) and a standalone native Android application (via Capacitor).

---

## 📱 Key Features

- **Daily Medication Checklist:** Track daily doses for the current week using an interactive Mon-Sun horizontal calendar day picker.
- **Offline Database:** Utilizes client-side `LocalStorage` to save medications, schedules, and history logs securely offline (running 100% serverless on Android).
- **Interactive Reminders & Alarms:**
  - Audible alerts with customizable styles (Chime chord, Digital beep, Soft pulse hum).
  - Text-to-Speech narration utilizing the Web Speech Synthesis API to announce medication details.
  - Native system notifications.
- **Adherence Analytics:** View live statistics (Taken count, Missed count, Adherence percentage progress bar) to monitor tracking performance.
- **Dual Platform Support:**
  - **Desktop:** Electron shell wrapping.
  - **Mobile:** Compiled into a native Android APK using Capacitor.

---

## 📂 Project Structure

```
├── www/                   # Compiled static offline web assets (WebView source)
│   ├── css/style.css      # Custom styling system and variable tokens
│   ├── js/db.js           # LocalStorage client-side database layer
│   ├── js/reminder-service.js # Alarm and reminder engine
│   ├── index.html         # Main dashboard
│   ├── medicines.html     # Medicine inventory management
│   ├── add-medicine.html  # Schedule creation form
│   ├── edit-medicine.html # Schedule edit form
│   └── history.html       # Adherence logs and statistics
├── android/               # Native Gradle wrapper project for Android Studio
├── public/                # Original Express.js static files
├── routes/                # Original Express.js API endpoints (legacy backend)
├── views/                 # Original Express.js EJS templates (legacy view templates)
├── package.json           # npm configuration and dependencies
└── README.md              # Documentation
```

---

## 🚀 Running the Application

* **Live Demo (Web App):** https://priyanshutiwari2125-cmd.github.io/Medicine-Reminder-application/ (Operates in offline/Local Storage fallback mode if no local Node server is running)

For local development with persistent database storage:

* **Local Web App:** http://localhost:3000/
* **Local Backend API:** http://localhost:3000/
* **SQLite Database:** Local SQLite3 database (`medicine_reminder.db`)

To run the local version manually:

### 1. Start the Node/Express Backend Server
Open a terminal in the root directory and execute:
```bash
npm install
npm run dev
```

### 2. Start the Desktop Application (Electron)
Open a terminal in the root directory and execute:
```bash
npm run desktop
```

### 3. Run the Standalone Android Application
The native Android wrapper is ready for deployment.
* **Open in Android Studio:** Open the `android` subfolder in Android Studio.
* **Run Emulator:** Launch an emulator (e.g. Pixel 5 / Pixel 6 running API 34) and click the green **Run (Play)** button in the top toolbar to deploy.
* **Pre-compiled APK:** You can directly install the pre-compiled debug APK located at `android/app/build/outputs/apk/debug/app-debug.apk`.

---

## 🛠️ Tech Stack

- **Frontend:** Plain HTML, CSS Variables, JavaScript, Web Audio API, Web Speech API.
- **Mobile Container:** Capacitor Core & Android Platform tools.
- **Desktop Container:** Electron Framework.
- **Build Tools:** Gradle, JDK 21.
- **Legacy Backend:** Node.js, Express, SQLite.
