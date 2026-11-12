import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { SshfsApi } from '@shared/types';

/** Builds the `window.sshfs` implementation backed by Tauri commands and events. */
export function createSshfsApi(): SshfsApi {
  const api: SshfsApi = {
    listServers: () => invoke('servers_list'),
    saveServer: (input) => invoke('servers_save', { input }),
    deleteServer: (id) => invoke('servers_delete', { id }),
    mountServer: (id) => invoke('servers_mount', { id }),
    unmountServer: (id) => invoke('servers_unmount', { id }),
    refreshStatus: () => invoke('servers_status'),
    revealInFinder: (localPath) => invoke('servers_reveal', { localPath }),
    openExternal: (url) => invoke('shell_open_external', { url }),
    selectDirectory: (defaultPath) => invoke('dialog_select_directory', { defaultPath }),
    selectFile: (defaultPath) => invoke('dialog_select_file', { defaultPath }),
    getSettings: () => invoke('settings_get'),
    saveSettings: (settings) => invoke('settings_save', { settings }),
    isPackaged: () => invoke('app_is_packaged'),
    quitApp: () => invoke('app_quit'),
    onOpenSettings: (callback) => {
      void listen('open-settings', () => callback());
    },
    onRefresh: (callback) => {
      void listen('refresh', () => callback());
    },
    exportData: (opts) => invoke('app_export', {
      servers: opts.servers,
      serverIds: opts.serverIds,
      settings: opts.settings,
    }),
    importData: () => invoke('app_import'),
    onUpdateAvailable: (callback) => {
      void listen<{ version: string; url: string } | null>('update-available', (event) => callback(event.payload));
    },
  };
  return api;
}
