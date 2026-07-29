import appInfo from './app-info.json';

/** Display name shown in window titles, dialogs, menus. */
export const APP_NAME = appInfo.name;

/** URL-friendly slug used for filenames and identifiers. */
export const APP_SLUG = appInfo.slug;

/** Reverse-DNS application identifier. Must match `identifier` in src-tauri/tauri.conf.json. */
export const APP_ID = appInfo.appId;

/** Service name used by the system keychain. */
export const KEYCHAIN_SERVICE = APP_ID;

/** Magic string identifying our import/export JSON files. */
export const EXPORT_FORMAT_KEY = APP_SLUG;

/** Default filename suggested in the export save dialog. */
export const EXPORT_DEFAULT_FILENAME = `${APP_SLUG}-export.json`;

/** Current schema version of the export JSON format. */
export const EXPORT_FORMAT_VERSION = appInfo.exportFormatVersion as number;
