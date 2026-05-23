import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import keytar from 'keytar';
import type { AppSettings, ServerConfig } from '@shared/types';
import { KEYCHAIN_SERVICE } from '@shared/constants';

function configFile(): string {
  return path.join(app.getPath('userData'), 'servers.json');
}

export function loadConfigs(): ServerConfig[] {
  const file = configFile();
  if (!fs.existsSync(file)) return [];
  try {
    const raw = fs.readFileSync(file, 'utf-8');
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data;
  } catch (err) {
    console.error('Failed to load configs:', err);
    return [];
  }
}

export function saveConfigs(configs: ServerConfig[]): void {
  const file = configFile();
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(configs, null, 2), 'utf-8');
}

const DEFAULT_SETTINGS: AppSettings = {
  launchAtLogin: false,
  unmountOnQuit: false,
  showInTray: false,
  language: 'auto',
};

function settingsFile(): string {
  return path.join(app.getPath('userData'), 'settings.json');
}

export function loadSettings(): AppSettings {
  const file = settingsFile();
  if (!fs.existsSync(file)) return { ...DEFAULT_SETTINGS };
  try {
    const raw = fs.readFileSync(file, 'utf-8');
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: AppSettings): void {
  const file = settingsFile();
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(settings, null, 2), 'utf-8');
}

export async function getPassword(serverId: string): Promise<string | null> {
  return keytar.getPassword(KEYCHAIN_SERVICE, serverId);
}

export async function setPassword(serverId: string, password: string): Promise<void> {
  await keytar.setPassword(KEYCHAIN_SERVICE, serverId, password);
}

export async function deletePassword(serverId: string): Promise<void> {
  await keytar.deletePassword(KEYCHAIN_SERVICE, serverId);
}
