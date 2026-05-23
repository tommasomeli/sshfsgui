import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeftRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useServersStore } from '@/store/serversStore';
import type { AppSettings } from '@shared/types';

interface Props {
  open: boolean;
  onOpenChange(open: boolean): void;
  onOpenImportExport(): void;
}

export function SettingsDialog({ open, onOpenChange, onOpenImportExport }: Props) {
  const { t } = useTranslation();
  const { settings, updateSettings } = useServersStore();
  const [packaged, setPackaged] = useState(false);

  useEffect(() => {
    window.sshfs.isPackaged().then(setPackaged);
  }, []);

  function toggle(key: keyof typeof settings) {
    updateSettings({ ...settings, [key]: !settings[key] });
  }

  function changeLanguage(lang: AppSettings['language']) {
    updateSettings({ ...settings, language: lang });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('settings.title')}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="flex items-center justify-between gap-3">
            <div className="grid gap-0.5">
              <Label htmlFor="language">{t('settings.language')}</Label>
              <p className="text-xs text-muted-foreground">{t('settings.languageDesc')}</p>
            </div>
            <select
              id="language"
              value={settings.language}
              onChange={(e) => changeLanguage(e.target.value as AppSettings['language'])}
              className="h-8 rounded-md border border-input bg-background px-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="auto">{t('settings.langAuto')}</option>
              <option value="en">{t('settings.langEn')}</option>
              <option value="it">{t('settings.langIt')}</option>
            </select>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="grid gap-0.5">
              <Label htmlFor="launch-at-login">{t('settings.launchAtLogin')}</Label>
              <p className="text-xs text-muted-foreground">{t('settings.launchAtLoginDesc')}</p>
            </div>
            <Switch
              id="launch-at-login"
              checked={settings.launchAtLogin}
              onCheckedChange={() => toggle('launchAtLogin')}
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="grid gap-0.5">
              <Label htmlFor="unmount-on-quit">{t('settings.unmountOnQuit')}</Label>
              <p className="text-xs text-muted-foreground">{t('settings.unmountOnQuitDesc')}</p>
            </div>
            <Switch
              id="unmount-on-quit"
              checked={settings.unmountOnQuit}
              onCheckedChange={() => toggle('unmountOnQuit')}
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className={`grid gap-0.5 ${!packaged ? 'opacity-50' : ''}`}>
              <Label htmlFor="show-in-tray">{t('settings.showInTray')}</Label>
              <p className="text-xs text-muted-foreground">
                {packaged ? t('settings.showInTrayDesc') : t('settings.showInTrayDisabled')}
              </p>
            </div>
            <Switch
              id="show-in-tray"
              disabled={!packaged}
              checked={settings.showInTray}
              onCheckedChange={() => toggle('showInTray')}
            />
          </div>
          <div className="border-t pt-4">
            <Button variant="outline" className="w-full" onClick={onOpenImportExport}>
              <ArrowLeftRight className="size-4" />
              {t('settings.importExport')}
            </Button>
            <p className="mt-1 text-xs text-muted-foreground text-center">{t('settings.importExportDesc')}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
