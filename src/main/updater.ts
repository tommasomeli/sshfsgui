import { app, BrowserWindow, dialog, net } from 'electron';
import appInfo from '@shared/app-info.json';
import { t } from './locale';

interface GithubRelease {
  tag_name: string;
  html_url: string;
}

function isNewer(remote: string, local: string): boolean {
  const r = remote.split('.').map(Number);
  const l = local.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((r[i] ?? 0) > (l[i] ?? 0)) return true;
    if ((r[i] ?? 0) < (l[i] ?? 0)) return false;
  }
  return false;
}

export async function checkForUpdates(win: BrowserWindow, manual = false): Promise<void> {
  try {
    const repoUrl = new URL(appInfo.github);
    const [owner, repo] = repoUrl.pathname.replace(/^\//, '').split('/');
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/releases/latest`;

    const response = await net.fetch(apiUrl, {
      headers: { Accept: 'application/vnd.github.v3+json' },
    });

    if (!response.ok) {
      if (!win.isDestroyed()) win.webContents.send('update-available', null);
      if (manual) dialog.showMessageBox({ type: 'warning', message: t('update.checkFailed') });
      return;
    }

    const data = (await response.json()) as GithubRelease;
    const remoteVersion = data.tag_name.replace(/^v/, '');
    const localVersion = app.getVersion();

    if (isNewer(remoteVersion, localVersion)) {
      if (!win.isDestroyed())
        win.webContents.send('update-available', {
          version: remoteVersion,
          url: data.html_url,
        });
    } else {
      if (!win.isDestroyed()) win.webContents.send('update-available', null);
      if (manual) dialog.showMessageBox({ type: 'info', message: t('update.upToDate') });
    }
  } catch {
    if (!win.isDestroyed()) win.webContents.send('update-available', null);
    if (manual) dialog.showMessageBox({ type: 'warning', message: t('update.checkFailed') });
  }
}
