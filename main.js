const { app, BrowserWindow } = require('electron');
const path = require('path');

// 1. Boot up the Express application
// Requiring app.js starts the server automatically on PORT 3000
require('./app');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    title: "MediMind - Medicine Reminder Application",
    icon: path.join(__dirname, 'public/img/icon-512.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Load the running Express application
  mainWindow.loadURL('http://localhost:3000');

  // Hide the default file/edit menus to make it feel like a native desktop app
  mainWindow.setMenuBarVisibility(false);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Wait a brief 500ms for the SQLite and Express listener to establish
  setTimeout(createWindow, 500);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'desktop') {
    app.quit();
  }
});
