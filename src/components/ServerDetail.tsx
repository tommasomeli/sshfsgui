import { useTranslation } from 'react-i18next';
import { CircleStop, Copy, FolderOpen, HardDrive, Loader2, Pencil, Play, Star, Trash2, X } from 'lucide-react';
import type { ServerWithStatus } from '@shared/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Props {
  server: ServerWithStatus;
  busy: boolean;
  onClose(): void;
  onToggleMount(server: ServerWithStatus): void;
  onEdit(server: ServerWithStatus): void;
  onToggleFavorite(server: ServerWithStatus): void;
  onClone(servers: ServerWithStatus[]): void;
  onDelete(servers: ServerWithStatus[]): void;
}

export function ServerDetail({ server, busy: isBusy, onClose, onToggleMount, onEdit, onToggleFavorite, onClone, onDelete }: Props) {
  const { t } = useTranslation();
  const auth = {
    agent: t('form.sshAgent'),
    key: t('form.sshKey'),
    password: t('form.password'),
  }[server.authMethod];

  const rows: [string, string][] = [
    [t('form.host'), server.host],
    [t('form.port'), String(server.port)],
    [t('form.user'), server.user],
    [t('form.authentication'), auth],
    [t('form.remotePath'), server.remotePath],
    [t('form.localMountPoint'), server.localPath],
  ];

  return (
    <div className="relative flex h-full flex-col">
      <Button variant="ghost" size="icon" title="Esc" className="absolute right-2 top-2 size-6 text-muted-foreground" onClick={onClose}>
        <X className="size-3.5" />
      </Button>
      <div className="flex flex-col items-center gap-2 px-5 pt-6 pb-5 text-center">
        <HardDrive className={cn('size-14', server.mounted ? 'text-primary' : 'text-muted-foreground')} strokeWidth={1} />
        <div className="flex max-w-full items-center gap-1">
          <h2 className="truncate text-[15px] font-semibold">{server.name}</h2>
          <button
            type="button"
            className="rounded p-0.5 outline-none hover:bg-accent"
            title={server.isFavorite ? t('tooltip.unfavorite') : t('tooltip.favorite')}
            onClick={() => onToggleFavorite(server)}
          >
            <Star
              className={cn('size-3.5', server.isFavorite ? 'fill-warning text-warning' : 'text-muted-foreground')}
              strokeWidth={server.isFavorite ? 0 : 1.75}
            />
          </button>
        </div>
        <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
          <span className={cn('size-2 rounded-full', server.mounted ? 'bg-success' : 'bg-muted-foreground/40')} />
          {server.mounted ? t('detail.mounted') : t('detail.notMounted')}
          {server.mountOnStartup && <span>· {t('server.autoMount')}</span>}
        </span>
        <div className="mt-2 flex gap-1.5">
          <Button
            variant={server.mounted ? 'outline' : 'default'}
            onClick={() => onToggleMount(server)}
            disabled={isBusy}
            className="min-w-24"
          >
            {isBusy ? <Loader2 className="animate-spin" /> : server.mounted ? <CircleStop /> : <Play />}
            {server.mounted ? t('server.unmount') : t('server.mount')}
          </Button>
          {server.mounted && (
            <Button variant="outline" size="icon" title={t('tooltip.revealInFinder')} onClick={() => window.sshfs.revealInFinder(server.localPath)}>
              <FolderOpen />
            </Button>
          )}
        </div>
      </div>

      <dl className="mx-4 overflow-hidden rounded-lg bg-muted text-[12px]">
        {rows.map(([label, value]) => (
          <div key={label} className="flex gap-3 border-b border-border/60 px-3 py-1.5 last:border-b-0">
            <dt className="w-24 shrink-0 text-muted-foreground">{label}</dt>
            <dd className="min-w-0 flex-1 truncate text-right font-mono text-[11.5px] select-text" title={value}>
              {value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-auto flex items-center justify-between gap-1 p-3">
        <Button variant="ghost" size="icon" title={t('tooltip.delete')} className="text-destructive hover:text-destructive" onClick={() => onDelete([server])}>
          <Trash2 />
        </Button>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" title={t('tooltip.clone')} onClick={() => onClone([server])}>
            <Copy />
          </Button>
          <Button variant="outline" onClick={() => onEdit(server)}>
            <Pencil />
            {t('tooltip.edit')}
          </Button>
        </div>
      </div>
    </div>
  );
}
