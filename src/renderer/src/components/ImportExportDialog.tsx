import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Upload } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useServersStore } from '@/store/serversStore';

interface Props {
  open: boolean;
  onOpenChange(open: boolean): void;
}

export function ImportExportDialog({ open, onOpenChange }: Props) {
  const { t } = useTranslation();
  const { refresh, init } = useServersStore();
  const [exportServers, setExportServers] = useState(true);
  const [exportSettings, setExportSettings] = useState(true);

  async function handleExport() {
    if (!exportServers && !exportSettings) {
      toast.error(t('settings.noDataSelected'));
      return;
    }
    const ok = await window.sshfs.exportData({
      servers: exportServers,
      settings: exportSettings,
    });
    if (ok) {
      toast.success(t('settings.exportSuccess'));
      onOpenChange(false);
    }
  }

  async function handleImport() {
    try {
      const result = await window.sshfs.importData();
      if (!result) return;
      const parts: string[] = [];
      if (result.servers !== undefined) parts.push(`${result.servers} servers`);
      if (result.settings) parts.push('settings');
      toast.success(t('settings.importSuccess'));
      await refresh();
      await init();
      onOpenChange(false);
    } catch (err) {
      toast.error(t('settings.importFailed', { error: (err as Error).message }));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('settings.importExport')}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-5">
          <div className="grid gap-3">
            <Label className="text-sm font-medium">{t('settings.export')}</Label>
            <div className="grid gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={exportServers} onCheckedChange={(v) => setExportServers(!!v)} />
                <span className="text-sm">{t('settings.exportServers')}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={exportSettings} onCheckedChange={(v) => setExportSettings(!!v)} />
                <span className="text-sm">{t('settings.exportSettings')}</span>
              </label>
            </div>
            <Button variant="outline" onClick={handleExport}>
              <Download className="size-4" />
              {t('settings.export')}
            </Button>
          </div>
          <div className="border-t" />
          <div className="grid gap-3">
            <Label className="text-sm font-medium">{t('settings.import')}</Label>
            <p className="text-xs text-muted-foreground">{t('settings.importConfirm')}</p>
            <Button variant="outline" onClick={handleImport}>
              <Upload className="size-4" />
              {t('settings.import')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
