import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Copy,
  CircleStop,
  Download,
  FolderOpen,
  HardDrive,
  Loader2,
  Pencil,
  Play,
  Star,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useServersStore } from '@/store/serversStore';
import type { ServerWithStatus } from '@shared/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Checkbox } from '@/components/ui/checkbox';

interface Props {
  server: ServerWithStatus;
  onEdit(server: ServerWithStatus): void;
  selected: boolean;
  onToggleSelect(id: string): void;
}

export function ServerCard({ server, onEdit, selected, onToggleSelect }: Props) {
  const { t } = useTranslation();
  const { mount, unmount, remove, toggleFavorite, clone } = useServersStore();
  const [busy, setBusy] = useState(false);

  async function handleMount() {
    setBusy(true);
    try {
      await mount(server.id);
      toast.success(t('server.mounted', { name: server.name }));
    } catch (err) {
      toast.error(t('server.mountFailed', { error: (err as Error).message }));
    } finally {
      setBusy(false);
    }
  }

  async function handleUnmount() {
    setBusy(true);
    try {
      await unmount(server.id);
      toast.success(t('server.unmounted', { name: server.name }));
    } catch (err) {
      toast.error(t('server.unmountFailed', { error: (err as Error).message }));
    } finally {
      setBusy(false);
    }
  }

  async function handleClone() {
    const cloned = await clone(server.id);
    if (cloned) toast.success(t('server.cloned', { name: cloned.name }));
  }

  async function handleDelete() {
    if (!confirm(t('server.deleteConfirm', { name: server.name }))) return;
    await remove(server.id);
    toast.success(t('server.deleted', { name: server.name }));
  }

  return (
    <Card className={`min-w-0 gap-2 py-3 transition-colors hover:border-primary/30 ${selected ? 'border-primary/50 bg-primary/5' : ''}`}>
      <CardHeader className="min-w-0">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-start gap-2">
            <Checkbox
              checked={selected}
              onCheckedChange={() => onToggleSelect(server.id)}
              className="mt-0.5 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <CardTitle className="flex min-w-0 items-center gap-2 text-sm">
                <HardDrive className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{server.name}</span>
                {server.mounted && (
                  <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_theme(colors.emerald.400)]" />
                )}
              </CardTitle>
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                {server.user}@{server.host}:{server.port}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            title={server.isFavorite ? t('tooltip.unfavorite') : t('tooltip.favorite')}
            onClick={() => toggleFavorite(server.id)}
          >
            <Star
              className={`size-4 ${server.isFavorite ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'}`}
            />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex min-w-0 flex-wrap items-center gap-1">
        <Badge variant="outline" className="min-w-0 max-w-full font-mono text-[10px]">
          <span className="block truncate">
            {server.remotePath} → {server.localPath}
          </span>
        </Badge>
        {server.mountOnStartup && <Badge variant="secondary" className="text-[10px]">{t('server.autoMount')}</Badge>}
      </CardContent>
      <CardFooter className="flex flex-wrap gap-1">
        <Button
          size="sm"
          variant={server.mounted ? 'outline' : 'default'}
          onClick={server.mounted ? handleUnmount : handleMount}
          disabled={busy}
          aria-busy={busy}
          className={busy ? 'disabled:opacity-100' : undefined}
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : server.mounted ? (
            <CircleStop className="size-4" />
          ) : (
            <Play className="size-4" />
          )}
          {server.mounted ? t('server.unmount') : t('server.mount')}
        </Button>
        {server.mounted && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="size-8"
                onClick={() => window.sshfs.revealInFinder(server.localPath)}
              >
                <FolderOpen className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('tooltip.revealInFinder')}</TooltipContent>
          </Tooltip>
        )}
        <div className="ml-auto flex gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant="ghost" className="size-8" onClick={() => onEdit(server)}>
                <Pencil className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('tooltip.edit')}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant="ghost" className="size-8" onClick={handleClone}>
                <Copy className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('tooltip.clone')}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="size-8"
                onClick={() => window.sshfs.exportData({ servers: true, serverIds: [server.id] })}
              >
                <Download className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('settings.export')}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="size-8 text-destructive hover:text-destructive"
                onClick={handleDelete}
              >
                <Trash2 className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('tooltip.delete')}</TooltipContent>
          </Tooltip>
        </div>
      </CardFooter>
    </Card>
  );
}
