/**
 * SITE SUPPORT — Electron Preload
 * Secure contextBridge between Node (main) and browser (renderer)
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Open native file dialog and return base64 + filename
  openFile: () => ipcRenderer.invoke('open-file-dialog'),

  // Save file via native save dialog — returns { saved, name, path }
  saveFile: (b64, filename) => ipcRenderer.invoke('save-file', { b64, filename }),

  // Open a file with default OS application
  openPath: (filePath) => ipcRenderer.invoke('open-path', filePath),

  // Fullscreen — works when packaged
  toggleFullscreen: () => ipcRenderer.invoke('toggle-fullscreen'),
  isFullscreen:    () => ipcRenderer.invoke('is-fullscreen'),

  // Platform info
  platform: process.platform,
  isElectron: true,
});
