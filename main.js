/**
 * SITE SUPPORT — Electron Main Process
 * Claude Warm Edition · Negro Cálido / Crema Cálida
 */

const { app, BrowserWindow, Menu, shell, ipcMain, dialog, session } = require('electron');
const path = require('path');
const fs   = require('fs');

// ── Keep reference to avoid garbage collection ──
let mainWindow = null;

// ── Dev mode flag ──
const isDev = process.argv.includes('--dev');

// ── Offline enforcement is in app.whenReady() below ──

// ── Create main window ──
function createWindow() {
  mainWindow = new BrowserWindow({
    width:  1440,
    height: 900,
    minWidth:  900,
    minHeight: 620,
    title: 'SITE SUPPORT',
    icon: path.join(__dirname, 'src', 'icon.svg'),
    backgroundColor: '#100C09',   // Negro Cálido — shown before page loads
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color:       '#1A1108',
      symbolColor: '#D97757',
      height: 36,
    },
    webPreferences: {
      nodeIntegration:    false,
      contextIsolation:   true,
      preload:            path.join(__dirname, 'preload.js'),
      webSecurity:        !isDev,
      allowRunningInsecureContent: false,
    },
    show: false,   // show only after ready-to-show
  });

  // Load the app
  mainWindow.loadFile('index.html');

  // Show when fully loaded — avoids white flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (isDev) mainWindow.webContents.openDevTools();
  });

  // External links → browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => { mainWindow = null; });

  // Sync fullscreen icon when OS shortcut or menu changes it
  mainWindow.on('enter-full-screen', () => {
    mainWindow?.webContents.executeJavaScript('syncFsIcons(true)').catch(()=>{});
  });
  mainWindow.on('leave-full-screen', () => {
    mainWindow?.webContents.executeJavaScript('syncFsIcons(false)').catch(()=>{});
  });
}

// ── App lifecycle ──
app.whenReady().then(() => {
  // Block all external (non-local) network requests — enforce offline mode
  session.defaultSession.webRequest.onBeforeRequest(
    { urls: ['https://*/*', 'http://*/*', 'ftp://*/*'] },
    (details, callback) => { callback({ cancel: true }); }
  );

  createWindow();
  buildMenu();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ── Application Menu ──
function buildMenu() {
  const template = [
    {
      label: 'SITE SUPPORT',
      submenu: [
        { label: 'Acerca de SITE SUPPORT', role: 'about' },
        { type: 'separator' },
        {
          label: 'Pantalla de bienvenida',
          accelerator: 'CmdOrCtrl+Home',
          click: () => mainWindow?.webContents.executeJavaScript('showWelcome()'),
        },
        { type: 'separator' },
        { role: 'quit', label: 'Salir' },
      ],
    },
    {
      label: 'Archivo',
      submenu: [
        {
          label: 'Abrir Excel...',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            const { canceled, filePaths } = await dialog.showOpenDialog({
              title: 'Abrir archivo Excel',
              filters: [{ name: 'Excel', extensions: ['xlsx', 'xls'] }],
              properties: ['openFile'],
            });
            if (!canceled && filePaths[0]) {
              const buf = fs.readFileSync(filePaths[0]);
              const b64 = buf.toString('base64');
              const name = path.basename(filePaths[0]);
              mainWindow?.webContents.executeJavaScript(
                `window._electronOpenFile && window._electronOpenFile('${b64}','${name.replace(/'/g,"\\'")}')`,
              );
            }
          },
        },
        { type: 'separator' },
        {
          label: 'Exportar datos...',
          accelerator: 'CmdOrCtrl+S',
          click: () => mainWindow?.webContents.executeJavaScript('expDatos&&expDatos()'),
        },
      ],
    },
    {
      label: 'Vista',
      submenu: [
        {
          label: 'Tema: Negro Cálido',
          accelerator: 'CmdOrCtrl+Shift+D',
          click: () => mainWindow?.webContents.executeJavaScript("setTheme('dark')"),
        },
        {
          label: 'Tema: Crema Cálida',
          accelerator: 'CmdOrCtrl+Shift+L',
          click: () => mainWindow?.webContents.executeJavaScript("setTheme('light')"),
        },
        { type: 'separator' },
        { role: 'reload',       label: 'Recargar' },
        { role: 'toggleDevTools', label: 'Herramientas dev' },
        { type: 'separator' },
        { role: 'resetZoom',  label: 'Zoom normal' },
        { role: 'zoomIn',     label: 'Ampliar' },
        { role: 'zoomOut',    label: 'Reducir' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Pantalla completa' },
      ],
    },
    {
      label: 'Edición',
      submenu: [
        { role: 'undo',      label: 'Deshacer' },
        { role: 'redo',      label: 'Rehacer' },
        { type: 'separator' },
        { role: 'cut',       label: 'Cortar' },
        { role: 'copy',      label: 'Copiar' },
        { role: 'paste',     label: 'Pegar' },
        { role: 'selectAll', label: 'Seleccionar todo' },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ── IPC: file open from renderer ──
ipcMain.handle('toggle-fullscreen', () => {
  if (!mainWindow) return;
  mainWindow.setFullScreen(!mainWindow.isFullScreen());
});
ipcMain.handle('is-fullscreen', () => {
  return mainWindow ? mainWindow.isFullScreen() : false;
});

// Save file via native dialog + return path so renderer can offer "open"
ipcMain.handle('save-file', async (event, { b64, filename }) => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Guardar archivo',
    defaultPath: filename,
    filters: [{ name: 'Excel', extensions: ['xlsx'] }],
  });
  if (canceled || !filePath) return { saved: false };
  const buf = Buffer.from(b64, 'base64');
  fs.writeFileSync(filePath, buf);
  return { saved: true, name: path.basename(filePath), path: filePath };
});

// Open a file with the default OS app
ipcMain.handle('open-path', async (event, filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    await shell.openPath(filePath);
  }
});

ipcMain.handle('open-file-dialog', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Abrir archivo Excel',
    filters: [{ name: 'Excel', extensions: ['xlsx', 'xls'] }],
    properties: ['openFile'],
  });
  if (canceled || !filePaths[0]) return null;
  const buf  = fs.readFileSync(filePaths[0]);
  const b64  = buf.toString('base64');
  const name = path.basename(filePaths[0]);
  return { b64, name };
});
