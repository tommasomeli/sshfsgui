import { useTranslation } from 'react-i18next';
import {
  Copy,
  CircleStop,
  Download,
  FolderOpen,
  HardDrive,
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

  async function handleMount() {
    try {
      await mount(server.id);
      toast.success(t('server.mounted', { name: server.name }));
    } catch (err) {
      toast.error(t('server.mountFailed', { error: (err as Error).message }));
    }
  }

  async function handleUnmount() {
    try {
      await unmount(server.id);
      toast.success(t('server.unmounted', { name: server.name }));
    } catch (err) {
      toast.error(t('server.unmountFailed', { error: (err as Error).message }));
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
    <Card className={`gap-2 py-3 transition-colors hover:border-primary/30 ${selected ? 'border-primary/50 bg-primary/5' : ''}`}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 min-w-0 flex-1">
            <Checkbox
              checked={selected}
              onCheckedChange={() => onToggleSelect(server.id)}
              className="mt-0.5"
            />
            <div className="min-w-0 flex-1">
              <CardTitle className="flex items-center gap-2 text-sm">
                <HardDrive className="size-4 text-muted-foreground" />
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
      <CardContent className="flex flex-wrap items-center gap-1">
        <Badge variant="outline" className="max-w-full truncate font-mono text-[10px]">
          {server.remotePath} → {server.localPath}
        </Badge>
        {server.mountOnStartup && <Badge variant="secondary" className="text-[10px]">{t('server.autoMount')}</Badge>}
      </CardContent>
      <CardFooter className="flex flex-wrap gap-1">
        {server.mounted ? (
          <Button size="sm" variant="outline" onClick={handleUnmount}>
            <CircleStop className="size-4" />
            {t('server.unmount')}
          </Button>
        ) : (
          <Button size="sm" onClick={handleMount}>
            <Play className="size-4" />
            {t('server.mount')}
          </Button>
        )}
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
