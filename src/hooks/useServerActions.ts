import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useServersStore } from '@/store/serversStore';
import type { ServerWithStatus } from '@shared/types';

/** Mount, unmount, clone and delete with toasts, plus the set of servers currently busy. */
export function useServerActions() {
  const { t } = useTranslation();
  const { mount, unmount, clone, remove, toggleFavorite } = useServersStore();
  const [busy, setBusy] = useState<Set<string>>(new Set());

  const track = useCallback(async (id: string, run: () => Promise<void>) => {
    setBusy((prev) => new Set(prev).add(id));
    try {
      await run();
    } finally {
      setBusy((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, []);

  const toggleMount = useCallback(
    (server: ServerWithStatus) =>
      track(server.id, async () => {
        try {
          if (server.mounted) {
            await unmount(server.id);
            toast.success(t('server.unmounted', { name: server.name }));
          } else {
            await mount(server.id);
            toast.success(t('server.mounted', { name: server.name }));
          }
        } catch (err) {
          const key = server.mounted ? 'server.unmountFailed' : 'server.mountFailed';
          toast.error(t(key, { error: (err as Error).message }));
        }
      }),
    [mount, unmount, t, track],
  );

  const cloneMany = useCallback(
    async (servers: ServerWithStatus[]) => {
      if (servers.length === 1) {
        const cloned = await clone(servers[0].id);
        if (cloned) toast.success(t('server.cloned', { name: cloned.name }));
        return;
      }
      for (const s of servers) await clone(s.id);
      toast.success(t('server.clonedMultiple', { count: servers.length }));
    },
    [clone, t],
  );

  const removeMany = useCallback(
    async (servers: ServerWithStatus[], total: number) => {
      if (servers.length === 0) return false;
      const msg =
        servers.length === 1
          ? t('server.deleteConfirm', { name: servers[0].name })
          : servers.length === total
            ? t('server.deleteAllConfirm', { count: servers.length })
            : t('server.deleteMultipleConfirm', { count: servers.length });
      if (!confirm(msg)) return false;
      for (const s of servers) await remove(s.id);
      toast.success(
        servers.length === 1
          ? t('server.deleted', { name: servers[0].name })
          : t('server.deletedMultiple', { count: servers.length }),
      );
      return true;
    },
    [remove, t],
  );

  const exportMany = useCallback(async (servers: ServerWithStatus[]) => {
    const ok = await window.sshfs.exportData({ servers: true, serverIds: servers.map((s) => s.id) });
    if (ok) toast.success(t('settings.exportSuccess'));
  }, [t]);

  return { busy, toggleMount, cloneMany, removeMany, exportMany, toggleFavorite };
}
