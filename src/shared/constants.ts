import appInfo from './app-info.json';

/** Display name shown in window titles, dialogs, menus. */
export const APP_NAME = appInfo.name;

/** URL-friendly slug used for filenames and identifiers. */
export const APP_SLUG = appInfo.slug;

/** Reverse-DNS application identifier. Must match `build.appId` in package.json. */
export const APP_ID = appInfo.appId;

/** Service name used by the system keychain (keytar). */
export const KEYCHAIN_SERVICE = APP_ID;

/** Magic string identifying our import/export JSON files. */
export const EXPORT_FORMAT_KEY = APP_SLUG;

/** Default filename suggested in the export save dialog. */
export const EXPORT_DEFAULT_FILENAME = `${APP_SLUG}-export.json`;

/** Current schema version of the export JSON format. */
export const EXPORT_FORMAT_VERSION = 1;

// Local declaration so this module type-checks both in Node (main/preload) and
// in the renderer bundle, without depending on @types/node from the web tsconfig.
declare const process: { platform: string } | undefined;
const PLATFORM = typeof process !== 'undefined' ? process.platform : '';

export const IS_MAC = PLATFORM === 'darwin';
export const IS_LINUX = PLATFORM === 'linux';
export const IS_WIN = PLATFORM === 'win32';
