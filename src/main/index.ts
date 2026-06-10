import { app, BrowserWindow, ipcMain, shell, dialog, Tray, Menu, nativeImage } from 'electron';
import { readFileSync, writeFileSync } from 'fs';
import { randomUUID } from 'crypto';
import * as path from 'path';
import { checkSystemRequirements, getInstallInstructions } from './system';
import { loadConfigs, saveConfigs, setPassword, deletePassword, loadSettings, saveSettings } from './storage';
import { collapseHome, expandHome } from '@shared/paths';
import { mountServer, unmountServer, isMounted } from './mount';
import type { AppSettings, ServerConfig, ServerInput, ServerWithStatus } from '@shared/types';
import appInfo from '@shared/app-info.json';
import {
  assertValidImportPayload,
  buildExportPayload,
  mergeImportedServers,
  mergeImportedSettings,
} from '@shared/import-export';
import { EXPORT_DEFAULT_FILENAME, IS_MAC } from '@shared/constants';
import { t, setLanguage } from './locale';
import { checkForUpdates } from './updater';

const isDev = !app.isPackaged;
let win: BrowserWindow | null = null;
let tray: Tray | null = null;
let systemReadySeen = false;

function buildTrayIcon(): Electron.NativeImage {
  const s = 18;
  const buf = Buffer.alloc(s * s * 4, 0);
  const px = (x: number, y: number, a = 255) => {
    if (x < 0 || x >= s || y < 0 || y >= s) return;
    const i = (y * s + x) * 4;
    buf[i] = 0; buf[i + 1] = 0; buf[i + 2] = 0; buf[i + 3] = a;
  };
  const hLine = (x1: number, x2: number, y: number, a = 255) => {
    for (let x = x1; x <= x2; x++) px(x, y, a);
  };
  const vLine = (x: number, y1: number, y2: number, a = 255) => {
    for (let y = y1; y <= y2; y++) px(x, y, a);
  };
  const rect = (x1: number, y1: number, x2: number, y2: number, a = 255) => {
    hLine(x1, x2, y1, a); hLine(x1, x2, y2, a);
    vLine(x1, y1, y2, a); vLine(x2, y1, y2, a);
  };

  // Server rack: 3 stacked units
  // Unit 1 (top)
  rect(3, 2, 14, 6);
  px(5, 4); px(6, 4);
  px(12, 4, 128); px(13, 4, 128);

  // Unit 2 (middle)
  rect(3, 7, 14, 11);
  px(5, 9); px(6, 9);
  px(12, 9, 128); px(13, 9, 128);

  // Unit 3 (bottom)
  rect(3, 12, 14, 16);
  px(5, 14); px(6, 14);
  px(12, 14, 128); px(13, 14, 128);

  const img = nativeImage.createFromBitmap(buf, { width: s, height: s });
  img.setTemplateImage(true);
  return img;
}

function showOrCreateWindow(): void {
  if (tray) app.dock?.show();
  if (win && !win.isDestroyed()) {
    win.show();
    win.focus();
  } else
    createWindow();
}

function enableTray(): void {
  if (tray) return;
  const icon = buildTrayIcon();
  tray = new Tray(icon);
  tray.setToolTip(appInfo.name);
  tray.on('click', showOrCreateWindow);
  tray.on('right-click', () => {
    tray?.popUpContextMenu(Menu.buildFromTemplate([
      { label: t('menu.show'), click: showOrCreateWindow },
      { type: 'separator' },
      { label: t('menu.quit', { name: appInfo.name }), click: () => app.quit() },
    ]));
  });
}

function disableTray(): void {
  if (!tray) return;
  tray.destroy();
  tray = null;
  app.dock?.show();
}

function createWindow(): void {
  win = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 600,
    minHeight: 400,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0a0a0a',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  win.on('close', () => {
    if (tray) app.dock?.hide();
  });

  if (isDev && process.env['ELECTRON_RENDERER_URL'])
    win.loadURL(process.env['ELECTRON_RENDERER_URL']);
  else
    win.loadFile(path.join(__dirname, '../renderer/index.html'));
}

function registerIpc(): void {
  ipcMain.handle('system:check', () => checkSystemRequirements());
  ipcMain.handle('system:install-instructions', () => getInstallInstructions());
  ipcMain.handle('system:ready-seen', () => systemReadySeen);
  ipcMain.handle('system:mark-ready-seen', () => { systemReadySeen = true; });

  ipcMain.handle('servers:list', async (): Promise<ServerWithStatus[]> => {
    const configs = loadConfigs();
    const statuses = await Promise.all(configs.map((c) => isMounted(c.localPath)));
    return configs.map((c, i) => ({ ...c, mounted: statuses[i] }));
  });

  ipcMain.handle('servers:save', async (_e, input: ServerInput): Promise<ServerWithStatus> => {
    const configs = loadConfigs();
    const now = Date.now();
    const existingIdx = input.id ? configs.findIndex((c) => c.id === input.id) : -1;
    const { password: _pw, id: _id, ...rest } = input;
    void _pw; void _id;
    rest.localPath = collapseHome(rest.localPath);
    if (rest.identityFile) rest.identityFile = collapseHome(rest.identityFile);

    const base: ServerConfig = existingIdx > -1
      ? { ...configs[existingIdx], ...rest, updatedAt: now }
      : { ...rest, id: input.id ?? randomUUID(), createdAt: now, updatedAt: now };

    if (existingIdx > -1) configs[existingIdx] = base;
    else configs.push(base);
    saveConfigs(configs);

    if (input.authMethod === 'password' && input.password)
      await setPassword(base.id, input.password);
    if (input.authMethod !== 'password')
      await deletePassword(base.id).catch(() => undefined);

    return { ...base, mounted: await isMounted(base.localPath) };
  });

  ipcMain.handle('servers:delete', async (_e, id: string) => {
    const configs = loadConfigs();
    const target = configs.find((c) => c.id === id);
    if (target && (await isMounted(target.localPath)))
      await unmountServer(target.localPath).catch(() => undefined);
    saveConfigs(configs.filter((c) => c.id !== id));
    await deletePassword(id).catch(() => undefined);
  });

  ipcMain.handle('servers:mount', async (_e, id: string) => {
    const config = loadConfigs().find((c) => c.id === id);
    if (!config) throw new Error('Server not found');
    await mountServer(config);
  });

  ipcMain.handle('servers:unmount', async (_e, id: string) => {
    const config = loadConfigs().find((c) => c.id === id);
    if (!config) throw new Error('Server not found');
    await unmountServer(config.localPath);
  });

  ipcMain.handle('servers:status', async (): Promise<Record<string, boolean>> => {
    const configs = loadConfigs();
    const result: Record<string, boolean> = {};
    await Promise.all(configs.map(async (c) => { result[c.id] = await isMounted(c.localPath); }));
    return result;
  });

  ipcMain.handle('servers:reveal', (_e, localPath: string) => shell.openPath(expandHome(localPath)));
  ipcMain.handle('shell:open-external', (_e, url: string) => shell.openExternal(url));

  ipcMain.handle('dialog:select-directory', async (_e, defaultPath?: string) => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      defaultPath,
    });
    return result.canceled ? null : result.filePaths[0] ?? null;
  });

  ipcMain.handle('dialog:select-file', async (_e, defaultPath?: string) => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'showHiddenFiles'],
      defaultPath,
    });
    return result.canceled ? null : result.filePaths[0] ?? null;
  });

  ipcMain.handle('settings:get', () => loadSettings());

  ipcMain.handle('settings:save', (_e, settings: AppSettings) => {
    saveSettings(settings);
    app.setLoginItemSettings({ openAtLogin: settings.launchAtLogin });
    if (settings.showInTray && app.isPackaged) enableTray();
    else disableTray();
    setLanguage(settings.language);
    buildAppMenu();
  });

  ipcMain.handle('app:is-packaged', () => app.isPackaged);

  ipcMain.handle('app:quit', () => app.quit());

  ipcMain.handle('app:export', async (_e, opts: { servers?: boolean; serverIds?: string[]; settings?: boolean }) => {
    let servers: ServerConfig[] | undefined;
    if (opts.servers) {
      servers = loadConfigs();
      if (opts.serverIds?.length)
        servers = servers.filter((c) => opts.serverIds!.includes(c.id));
    }
    const data = buildExportPayload({
      servers,
      settings: opts.settings ? loadSettings() : undefined,
    });

    const result = await dialog.showSaveDialog({
      defaultPath: EXPORT_DEFAULT_FILENAME,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (result.canceled || !result.filePath) return false;
    writeFileSync(result.filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  });

  ipcMain.handle('app:import', async (): Promise<{ servers?: number; settings?: boolean } | null> => {
    const result = await dialog.showOpenDialog({
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile'],
    });
    if (result.canceled || !result.filePaths[0]) return null;

    const raw = readFileSync(result.filePaths[0], 'utf-8');
    const data = JSON.parse(raw);
    assertValidImportPayload(data);

    const imported: { servers?: number; settings?: boolean } = {};

    if (data.servers && Array.isArray(data.servers)) {
      const { configs, added } = mergeImportedServers(loadConfigs(), data.servers, collapseHome);
      saveConfigs(configs);
      imported.servers = added;
    }

    if (data.settings && typeof data.settings === 'object') {
      saveSettings(mergeImportedSettings(loadSettings(), data.settings));
      imported.settings = true;
    }

    return imported;
  });
}

async function mountStartupServers(): Promise<void> {
  const configs = loadConfigs().filter((c) => c.mountOnStartup);
  for (const config of configs) {
    try {
      const mounted = await isMounted(config.localPath);
      if (!mounted) {
        await mountServer(config);
        console.log(`[startup] mounted ${config.name}`);
      }
    } catch (err) {
      console.error(`[startup] failed to mount ${config.name}:`, err);
    }
  }
}

async function unmountAll(): Promise<void> {
  const configs = loadConfigs();
  for (const config of configs) {
    try {
      if (await isMounted(config.localPath)) {
        await unmountServer(config.localPath);
        console.log(`[quit] unmounted ${config.name}`);
      }
    } catch (err) {
      console.error(`[quit] failed to unmount ${config.name}:`, err);
    }
  }
}

function buildAppMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: appInfo.name,
      submenu: [
        {
          label: t('menu.about', { name: appInfo.name }),
          click: () => {
            dialog.showMessageBox({
              type: 'info',
              title: t('menu.about', { name: appInfo.name }),
              message: appInfo.name,
              detail: [
                t('about.version', { version: app.getVersion() }),
                t('about.developer', { developer: appInfo.developer }),
              ].join('\n'),
              buttons: ['OK', 'GitHub'],
            }).then(({ response }) => {
              if (response === 1) shell.openExternal(appInfo.github);
            });
          },
        },
        { type: 'separator' },
        {
          label: t('menu.settings'),
          accelerator: 'Cmd+,',
          click: () => {
            showOrCreateWindow();
            if (win && !win.isDestroyed())
              win.webContents.send('open-settings');
          },
        },
        {
          label: t('menu.refresh'),
          accelerator: 'Cmd+R',
          click: () => {
            if (win && !win.isDestroyed())
              win.webContents.send('refresh');
          },
        },
        {
          label: t('menu.checkUpdates'),
          click: () => {
            if (win && !win.isDestroyed()) checkForUpdates(win, true);
          },
        },
        { type: 'separator' },
        { label: t('menu.hide', { name: appInfo.name }), role: 'hide' },
        { label: t('menu.hideOthers'), role: 'hideOthers' },
        { label: t('menu.showAll'), role: 'unhide' },
        { type: 'separator' },
        { label: t('menu.quit', { name: appInfo.name }), role: 'quit' },
      ],
    },
    {
      label: t('menu.file'),
      submenu: [
        { label: t('menu.close'), role: 'close' },
      ],
    },
    {
      label: t('menu.edit'),
      submenu: [
        { label: t('menu.undo'), role: 'undo' },
        { label: t('menu.redo'), role: 'redo' },
        { type: 'separator' },
        { label: t('menu.cut'), role: 'cut' },
        { label: t('menu.copy'), role: 'copy' },
        { label: t('menu.paste'), role: 'paste' },
        { label: t('menu.delete'), role: 'delete' },
        { type: 'separator' },
        { label: t('menu.selectAll'), role: 'selectAll' },
      ],
    },
    {
      label: t('menu.view'),
      submenu: [
        { label: t('menu.reload'), role: 'reload' },
        { type: 'separator' },
        { label: t('menu.resetZoom'), role: 'resetZoom' },
        { label: t('menu.zoomIn'), role: 'zoomIn' },
        { label: t('menu.zoomOut'), role: 'zoomOut' },
        { type: 'separator' },
        { label: t('menu.toggleFullscreen'), role: 'togglefullscreen' },
      ],
    },
    {
      label: t('menu.window'),
      submenu: [
        { label: t('menu.minimize'), role: 'minimize' },
        { label: t('menu.zoom'), role: 'zoom' },
        { type: 'separator' },
        { label: t('menu.front'), role: 'front' },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(async () => {
  const settings = loadSettings();
  setLanguage(settings.language);
  buildAppMenu();

  app.setLoginItemSettings({ openAtLogin: settings.launchAtLogin });
  if (settings.showInTray && app.isPackaged) enableTray();

  registerIpc();
  createWindow();
  await mountStartupServers();

  setTimeout(() => {
    if (win && !win.isDestroyed()) checkForUpdates(win);
  }, 3000);

  setInterval(() => {
    if (win && !win.isDestroyed()) checkForUpdates(win);
  }, 30 * 60 * 1000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', async (e) => {
  const settings = loadSettings();
  if (settings.unmountOnQuit) {
    e.preventDefault();
    await unmountAll();
    app.exit(0);
  }
});

app.on('window-all-closed', () => {
  if (tray) return;
  if (!IS_MAC) app.quit();
});
