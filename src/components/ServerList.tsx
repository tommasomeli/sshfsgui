import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { CircleStop, Copy, Download, FolderOpen, HardDrive, Loader2, Pencil, Play, Star, Trash2 } from 'lucide-react';
import type { ServerWithStatus } from '@shared/types';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

interface Props {
  servers: ServerWithStatus[];
  selected: Set<string>;
  openId: string | null;
  busy: Set<string>;
  onOpen(id: string): void;
  onToggleSelect(id: string): void;
  onContextMenu(server: ServerWithStatus): void;
  onToggleMount(server: ServerWithStatus): void;
  onToggleFavorite(server: ServerWithStatus): void;
  onEdit(server: ServerWithStatus): void;
  onClone(servers: ServerWithStatus[]): void;
  onExport(servers: ServerWithStatus[]): void;
  onDelete(servers: ServerWithStatus[]): void;
}

function IconAction({ title, onClick, className, children }: { title: string; onClick(): void; className?: string; children: ReactNode }) {
  return (
    <Button variant="ghost" size="icon" title={title} onClick={onClick} className={cn('size-6 text-current opacity-70 hover:opacity-100', className)}>
      {children}
    </Button>
  );
}

export function ServerList({
  servers,
  selected,
  openId,
  busy,
  onOpen,
  onToggleSelect,
  onContextMenu,
  onToggleMount,
  onToggleFavorite,
  onEdit,
  onClone,
  onExport,
  onDelete,
}: Props) {
  const { t } = useTranslation();

  return (
    <ul role="listbox" aria-multiselectable className="flex flex-col p-2">
      {servers.map((server) => {
        const isSelected = selected.has(server.id);
        const isOpen = openId === server.id;
        const isBusy = busy.has(server.id);
        return (
          <li
            key={server.id}
            data-server-id={server.id}
            role="option"
            aria-selected={isSelected}
            onClick={() => onOpen(server.id)}
            onDoubleClick={() => onEdit(server)}
            onContextMenu={(e) => {
              e.preventDefault();
              onContextMenu(server);
            }}
            className={cn(
              'flex min-h-12 items-center gap-2.5 rounded-md px-2.5 py-1.5',
              isOpen ? 'bg-primary/20 ring-1 ring-inset ring-primary/45' : isSelected ? 'bg-primary/10' : 'even:bg-muted hover:bg-accent',
            )}
          >
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onToggleSelect(server.id)}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              onDoubleClick={(e) => e.stopPropagation()}
              aria-label={server.name}
            />
            <span className="relative shrink-0">
              <HardDrive
                className={cn('size-5', server.mounted ? 'text-primary' : 'text-muted-foreground')}
                strokeWidth={1.5}
              />
              {server.mounted && (
                <span
                  className="absolute -right-0.5 -bottom-0.5 size-2 rounded-full bg-success ring-2 ring-background"
                />
              )}
            </span>

            <div className="min-w-0 flex-1">
              <div className="truncate leading-tight">{server.name}</div>
              <div className="truncate text-[11px] leading-snug text-muted-foreground">
                {server.user}@{server.host}
                {server.port !== 22 && `:${server.port}`}
              </div>
            </div>

            <div
              className="flex shrink-0 items-center gap-0.5"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              onDoubleClick={(e) => e.stopPropagation()}
            >
              <IconAction
                title={server.isFavorite ? t('tooltip.unfavorite') : t('tooltip.favorite')}
                onClick={() => onToggleFavorite(server)}
                className={server.isFavorite ? 'opacity-100' : undefined}
              >
                <Star
                  className={cn('size-3.5', server.isFavorite && 'fill-warning text-warning')}
                  strokeWidth={server.isFavorite ? 0 : 1.75}
                />
              </IconAction>
              <IconAction title={t('tooltip.edit')} onClick={() => onEdit(server)}>
                <Pencil className="size-3.5" />
              </IconAction>
              <IconAction title={t('tooltip.clone')} onClick={() => onClone([server])}>
                <Copy className="size-3.5" />
              </IconAction>
              <IconAction title={t('settings.export')} onClick={() => onExport([server])}>
                <Download className="size-3.5" />
              </IconAction>
              <IconAction
                title={t('tooltip.delete')}
                onClick={() => onDelete([server])}
                className="text-destructive"
              >
                <Trash2 className="size-3.5" />
              </IconAction>
              {server.mounted && (
                <IconAction title={t('tooltip.revealInFinder')} onClick={() => window.sshfs.revealInFinder(server.localPath)}>
                  <FolderOpen className="size-3.5" />
                </IconAction>
              )}
              <Button
                variant={server.mounted ? 'outline' : 'default'}
                size="sm"
                disabled={isBusy}
                onClick={() => onToggleMount(server)}
                className="ml-1 w-[5.5rem]"
              >
                {isBusy ? <Loader2 className="size-3.5 animate-spin" /> : server.mounted ? <CircleStop className="size-3.5" /> : <Play className="size-3.5" />}
                {server.mounted ? t('server.unmount') : t('server.mount')}
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
