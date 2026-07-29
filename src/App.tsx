import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowDownCircle, CheckSquare, Copy, Download, Plus, Power, Server, Settings, Square, Trash2, X } from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { useServersStore } from '@/store/serversStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SystemRequirementsBanner } from '@/components/SystemRequirementsBanner';
import { ServerCard } from '@/components/ServerCard';
import { ServerFormDialog } from '@/components/ServerFormDialog';
import { SettingsDialog } from '@/components/SettingsDialog';
import { ImportExportDialog } from '@/components/ImportExportDialog';
import appInfo from '@shared/app-info.json';
import type { ServerWithStatus } from '@shared/types';

type Filter = 'all' | 'favorites' | 'mounted';

export function App() {
  const { t } = useTranslation();
  const { servers, init, refresh, refreshStatuses, initialized, clone, remove } = useServersStore();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [editing, setEditing] = useState<ServerWithStatus | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [importExportOpen, setImportExportOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [updateInfo, setUpdateInfo] = useState<{ version: string; url: string } | null>(null);

  useEffect(() => {
    init();
    window.sshfs.onOpenSettings(() => setSettingsOpen(true));
    window.sshfs.onRefresh(() => { refresh(); refreshStatuses(); });
    window.sshfs.onUpdateAvailable(setUpdateInfo);
  }, [init, refresh, refreshStatuses]);

  useEffect(() => {
    if (!initialized) return;
    const handle = setInterval(() => refreshStatuses(), 5000);
    return () => clearInterval(handle);
  }, [initialized, refreshStatuses]);

  useEffect(() => {
    const ids = new Set(servers.map((s) => s.id));
    setSelected((prev) => {
      const next = new Set([...prev].filter((id) => ids.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [servers]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return servers
      .filter((s) => {
        if (filter === 'favorites' && !s.isFavorite) return false;
        if (filter === 'mounted' && !s.mounted) return false;
        if (!q) return true;
        return [s.name, s.host, s.user, s.remotePath, s.localPath]
          .join(' ')
          .toLowerCase()
          .includes(q);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [servers, query, filter]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === servers.length)
      setSelected(new Set());
    else
      setSelected(new Set(servers.map((s) => s.id)));
  }

  function openNew() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(server: ServerWithStatus) {
    setEditing(server);
    setDialogOpen(true);
  }

  async function cloneSelected() {
    const ids = [...selected];
    for (const id of ids) await clone(id);
    toast.success(t('server.clonedMultiple', { count: ids.length }));
    setSelected(new Set());
  }

  async function deleteSelected() {
    const ids = [...selected];
    const all = ids.length === servers.length;
    const msg = all
      ? t('server.deleteAllConfirm', { count: ids.length })
      : t('server.deleteMultipleConfirm', { count: ids.length });
    if (!confirm(msg)) return;
    for (const id of ids) await remove(id);
    toast.success(t('server.deletedMultiple', { count: ids.length }));
    setSelected(new Set());
  }

  async function exportSelected() {
    const ok = await window.sshfs.exportData({ servers: true, serverIds: [...selected] });
    if (ok) {
      toast.success(t('settings.exportSuccess'));
      setSelected(new Set());
    }
  }

  const allSelected = servers.length > 0 && selected.size === servers.length;

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-background">
      <header
        data-tauri-drag-region
        className="flex min-w-0 items-center justify-between gap-2 border-b px-3 py-2 pl-[5.5rem]"
      >
        <div data-tauri-drag-region className="flex min-w-0 items-center gap-2">
          <Server className="size-4 shrink-0 text-muted-foreground" />
          <h1 className="truncate text-sm font-semibold">{appInfo.name}</h1>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button size="sm" onClick={openNew}>
            <Plus className="size-4" />
            {t('app.new')}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="size-8"
            title={t('tooltip.settings')}
            onClick={() => setSettingsOpen(true)}
          >
            <Settings className="size-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="size-8 text-muted-foreground hover:text-destructive"
            title={t('tooltip.quit')}
            onClick={() => window.sshfs.quitApp()}
          >
            <Power className="size-4" />
          </Button>
        </div>
      </header>

      <main className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
        <div className="flex min-w-0 flex-col gap-3 p-3">
          <SystemRequirementsBanner />

          {updateInfo && (
            <div className="flex items-center justify-between gap-3 px-4 py-2 text-xs text-sky-400 bg-sky-500/10 border border-sky-500/20 rounded-md animate-in fade-in-0 duration-300">
              <div className="flex items-center gap-2">
                <ArrowDownCircle className="size-3.5" />
                <span>{t('update.available', { version: updateInfo.version })}</span>
              </div>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" className="h-6 text-xs text-sky-400" onClick={() => window.sshfs.openExternal(updateInfo.url)}>
                  <Download className="size-3" />
                  {t('update.download')}
                </Button>
                <Button size="icon" variant="ghost" className="size-6" onClick={() => setUpdateInfo(null)}>
                  <X className="size-3" />
                </Button>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Input
              placeholder={t('app.search')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-8"
            />
            <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
              <TabsList className="w-full">
                <TabsTrigger value="all" className="flex-1 text-xs">
                  {t('tabs.all', { count: servers.length })}
                </TabsTrigger>
                <TabsTrigger value="favorites" className="flex-1 text-xs">
                  {t('tabs.favorites', { count: servers.filter((s) => s.isFavorite).length })}
                </TabsTrigger>
                <TabsTrigger value="mounted" className="flex-1 text-xs">
                  {t('tabs.mounted', { count: servers.filter((s) => s.mounted).length })}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-12 text-center">
              <Server className="size-7 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                {servers.length === 0 ? t('app.noServers') : t('app.noMatch')}
              </p>
              {servers.length === 0 && (
                <Button size="sm" onClick={openNew}>
                  <Plus className="size-4" />
                  {t('app.newServer')}
                </Button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {visible.map((server) => (
                <ServerCard
                  key={server.id}
                  server={server}
                  onEdit={openEdit}
                  selected={selected.has(server.id)}
                  onToggleSelect={toggleSelect}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {servers.length > 0 && (
        <footer className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-t px-3 py-1.5">
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={toggleSelectAll}>
            {allSelected ? <CheckSquare className="size-3" /> : <Square className="size-3" />}
            {allSelected ? t('server.deselectAll') : t('server.selectAll')}
          </Button>
          {selected.size > 0 ? (
            <div className="flex items-center gap-1 animate-in fade-in-0 duration-150">
              <span className="text-xs text-muted-foreground mr-1">{t('server.selected', { count: selected.size })}</span>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={cloneSelected}>
                <Copy className="size-3" />
                {t('tooltip.clone')}
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={exportSelected}>
                <Download className="size-3" />
                {t('settings.export')}
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:text-destructive" onClick={deleteSelected}>
                <Trash2 className="size-3" />
                {t('tooltip.delete')}
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => {
              if (!confirm(t('server.deleteAllConfirm', { count: servers.length }))) return;
              servers.forEach((s) => remove(s.id));
              toast.success(t('server.deletedMultiple', { count: servers.length }));
            }}>
              <Trash2 className="size-3" />
              {t('server.deleteAll')}
            </Button>
          )}
        </footer>
      )}

      <ServerFormDialog open={dialogOpen} onOpenChange={setDialogOpen} server={editing} />
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} onOpenImportExport={() => { setSettingsOpen(false); setImportExportOpen(true); }} />
      <ImportExportDialog open={importExportOpen} onOpenChange={setImportExportOpen} />
      <Toaster position="bottom-right" theme="dark" richColors closeButton />
    </div>
  );
}
