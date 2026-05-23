import { contextBridge, ipcRenderer } from 'electron';
import type { SshfsApi } from '@shared/types';

const api: SshfsApi = {
  checkSystem: () => ipcRenderer.invoke('system:check'),
  installInstructions: () => ipcRenderer.invoke('system:install-instructions'),
  listServers: () => ipcRenderer.invoke('servers:list'),
  saveServer: (input) => ipcRenderer.invoke('servers:save', input),
  deleteServer: (id) => ipcRenderer.invoke('servers:delete', id),
  mountServer: (id) => ipcRenderer.invoke('servers:mount', id),
  unmountServer: (id) => ipcRenderer.invoke('servers:unmount', id),
  refreshStatus: () => ipcRenderer.invoke('servers:status'),
  revealInFinder: (localPath) => ipcRenderer.invoke('servers:reveal', localPath),
  openExternal: (url) => ipcRenderer.invoke('shell:open-external', url),
  selectDirectory: (defaultPath) => ipcRenderer.invoke('dialog:select-directory', defaultPath),
  selectFile: (defaultPath) => ipcRenderer.invoke('dialog:select-file', defaultPath),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings),
  isPackaged: () => ipcRenderer.invoke('app:is-packaged'),
  quitApp: () => ipcRenderer.invoke('app:quit'),
  onOpenSettings: (callback) => ipcRenderer.on('open-settings', callback),
  onRefresh: (callback) => ipcRenderer.on('refresh', callback),
  exportData: (opts) => ipcRenderer.invoke('app:export', opts),
  importData: () => ipcRenderer.invoke('app:import'),
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', (_e, info) => callback(info)),
};

contextBridge.exposeInMainWorld('sshfs', api);
