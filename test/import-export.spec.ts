import { describe, expect, it } from 'vitest';
import { APP_ID, APP_NAME, APP_SLUG, EXPORT_DEFAULT_FILENAME, EXPORT_FORMAT_KEY, EXPORT_FORMAT_VERSION } from '@shared/constants';
import appInfo from '@shared/app-info.json';
import {
  assertValidImportPayload,
  buildExportPayload,
  mergeImportedServers,
  mergeImportedSettings,
} from '@shared/import-export';
import { sampleServer } from './helpers/sample-server';

describe('constants', () => {
  it('matches app-info.json and package.json appId', () => {
    expect(APP_NAME).toBe(appInfo.name);
    expect(APP_SLUG).toBe(appInfo.slug);
    expect(APP_ID).toBe(appInfo.appId);
    expect(APP_ID).toBe('com.tommasomeli.sshfsgui');
    expect(EXPORT_FORMAT_KEY).toBe(APP_SLUG);
    expect(EXPORT_DEFAULT_FILENAME).toBe('sshfsgui-export.json');
    expect(EXPORT_FORMAT_VERSION).toBe(1);
  });
});

describe('buildExportPayload', () => {
  it('includes format metadata and selected sections', () => {
    const server = sampleServer();
    const payload = buildExportPayload({
      servers: [server],
      settings: { launchAtLogin: true, unmountOnQuit: false, showInTray: false, language: 'en' },
    });
    expect(payload._format).toBe(EXPORT_FORMAT_KEY);
    expect(payload._version).toBe(EXPORT_FORMAT_VERSION);
    expect(payload.servers).toEqual([server]);
    expect(payload.settings?.language).toBe('en');
  });
});

describe('assertValidImportPayload', () => {
  it('accepts payloads exported by this app', () => {
    expect(() => assertValidImportPayload(buildExportPayload({}))).not.toThrow();
  });

  it('rejects unknown formats', () => {
    expect(() => assertValidImportPayload({ _format: 'other', _version: 1 })).toThrow('Invalid file format');
    expect(() => assertValidImportPayload(null)).toThrow('Invalid file format');
  });
});

describe('mergeImportedServers', () => {
  it('skips duplicate ids and normalizes paths', () => {
    const existing = [sampleServer({ id: 'existing' })];
    const incoming = [
      sampleServer({ id: 'existing', localPath: '/Users/test/mnt/old' }),
      sampleServer({ id: 'new', localPath: '/Users/test/mnt/new', identityFile: '/Users/test/.ssh/id_rsa' }),
    ];
    const normalize = (p: string) => (p.startsWith('/Users/test/') ? `~${p.slice('/Users/test'.length)}` : p);
    const { configs, added } = mergeImportedServers(existing, incoming, normalize);
    expect(added).toBe(1);
    expect(configs).toHaveLength(2);
    expect(configs[1]?.localPath).toBe('~/mnt/new');
    expect(configs[1]?.identityFile).toBe('~/.ssh/id_rsa');
  });
});

describe('mergeImportedSettings', () => {
  it('merges partial settings over defaults', () => {
    const current = { launchAtLogin: false, unmountOnQuit: false, showInTray: false, language: 'auto' as const };
    const merged = mergeImportedSettings(current, { launchAtLogin: true, language: 'it' });
    expect(merged).toEqual({ launchAtLogin: true, unmountOnQuit: false, showInTray: false, language: 'it' });
  });

  it('ignores invalid settings payloads', () => {
    const current = { launchAtLogin: false, unmountOnQuit: false, showInTray: false, language: 'auto' as const };
    expect(mergeImportedSettings(current, null)).toEqual(current);
  });
});
