import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowDownCircle, Copy, Download, Plus, Search, Server, Trash2, X } from 'lucide-react';
import { Toaster } from 'sonner';
import { useServersStore } from '@/store/serversStore';
import { useServerActions } from '@/hooks/useServerActions';
import { useMarqueeSelection } from '@/hooks/useMarqueeSelection';
import { showNativeMenu } from '@/lib/nativeMenu';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Sidebar, type Filter } from '@/components/Sidebar';
import { ServerList } from '@/components/ServerList';
import { ServerDetail } from '@/components/ServerDetail';
import { SystemRequirementsBanner } from '@/components/SystemRequirementsBanner';
import { ServerFormDialog } from '@/components/ServerFormDialog';
import { SettingsDialog } from '@/components/SettingsDialog';
import { ImportExportDialog } from '@/components/ImportExportDialog';
import type { ServerWithStatus } from '@shared/types';

const DETAIL_WIDTH_KEY = 'detailWidth';
const DETAIL_DEFAULT_WIDTH = 300;
const DETAIL_MIN_WIDTH = 240;
const DETAIL_MAX_WIDTH = 560;

function readDetailWidth() {
  try {
    const saved = Number(localStorage.getItem(DETAIL_WIDTH_KEY));
    if (saved >= DETAIL_MIN_WIDTH && saved <= DETAIL_MAX_WIDTH) return saved;
  } catch {
    /* fall back to the default width */
  }
  return DETAIL_DEFAULT_WIDTH;
}

function isEditableTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
}

export function App() {
  const { t } = useTranslation();
  const { servers, init, refresh, refreshStatuses, initialized } = useServersStore();
  const { busy, toggleMount, cloneMany, removeMany, exportMany, toggleFavorite } = useServerActions();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [editing, setEditing] = useState<ServerWithStatus | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [importExportOpen, setImportExportOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [updateInfo, setUpdateInfo] = useState<{ version: string; url: string } | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const marquee = useMarqueeSelection(listRef, selected, setSelected);

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
    setOpenId((prev) => (prev && ids.has(prev) ? prev : null));
  }, [servers]);

  const counts = useMemo(
    () => ({
      all: servers.length,
      favorites: servers.filter((s) => s.isFavorite).length,
      mounted: servers.filter((s) => s.mounted).length,
    }),
    [servers],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return servers
      .filter((s) => {
        if (filter === 'favorites' && !s.isFavorite) return false;
        if (filter === 'mounted' && !s.mounted) return false;
        if (!q) return true;
        return [s.name, s.host, s.user, s.remotePath, s.localPath].join(' ').toLowerCase().includes(q);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [servers, query, filter]);

  const selectedServers = useMemo(() => visible.filter((s) => selected.has(s.id)), [visible, selected]);
  const allVisibleSelected = visible.length > 0 && selectedServers.length === visible.length;
  const openServer = useMemo(() => servers.find((s) => s.id === openId) ?? null, [servers, openId]);

  const openNew = useCallback(() => {
    setEditing(null);
    setDialogOpen(true);
  }, []);

  const openEdit = useCallback((server: ServerWithStatus) => {
    setEditing(server);
    setDialogOpen(true);
  }, []);

  const deleteServers = useCallback(
    async (list: ServerWithStatus[]) => {
      if (await removeMany(list, servers.length)) setSelected(new Set());
    },
    [removeMany, servers.length],
  );

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openDetails(id: string) {
    if (marquee.wasDrag()) return;
    setOpenId(id);
  }

  function showContextMenu(server: ServerWithStatus) {
    const targets = selected.has(server.id) && selected.size > 1 ? selectedServers : [server];
    if (targets.length > 1) {
      void showNativeMenu([
        { text: t('tooltip.clone'), action: () => cloneMany(targets) },
        { text: t('settings.export'), action: () => exportMany(targets) },
        { separator: true },
        { text: t('tooltip.delete'), action: () => deleteServers(targets) },
      ]);
      return;
    }
    void showNativeMenu([
      { text: server.mounted ? t('server.unmount') : t('server.mount'), action: () => toggleMount(server), enabled: !busy.has(server.id) },
      { text: t('tooltip.revealInFinder'), action: () => window.sshfs.revealInFinder(server.localPath), enabled: server.mounted },
      { separator: true },
      { text: t('tooltip.edit'), action: () => openEdit(server) },
      { text: server.isFavorite ? t('tooltip.unfavorite') : t('tooltip.favorite'), action: () => toggleFavorite(server.id) },
      { text: t('tooltip.clone'), action: () => cloneMany([server]) },
      { text: t('settings.export'), action: () => exportMany([server]) },
      { separator: true },
      { text: t('tooltip.delete'), action: () => deleteServers([server]) },
    ]);
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (dialogOpen || settingsOpen || importExportOpen) return;
      if (e.metaKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        openNew();
        return;
      }
      if (e.metaKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (isEditableTarget(e.target)) {
        if (e.key === 'Escape') (e.target as HTMLElement).blur();
        return;
      }
      if (e.metaKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setSelected(new Set(visible.map((s) => s.id)));
      } else if (e.key === 'Escape') {
        if (selected.size > 0) setSelected(new Set());
        else setOpenId(null);
      } else if (e.metaKey && e.key === 'Backspace') {
        e.preventDefault();
        if (selectedServers.length > 0) void deleteServers(selectedServers);
        else if (openServer) void deleteServers([openServer]);
      } else if (e.key === 'Enter' && openServer) {
        e.preventDefault();
        void toggleMount(openServer);
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (visible.length === 0) return;
        const ids = visible.map((s) => s.id);
        const current = openId ? ids.indexOf(openId) : -1;
        const next = e.key === 'ArrowDown' ? Math.min(current + 1, ids.length - 1) : Math.max(current - 1, 0);
        setOpenId(ids[next]);
        listRef.current?.querySelector(`[data-server-id="${ids[next]}"]`)?.scrollIntoView({ block: 'nearest' });
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [dialogOpen, settingsOpen, importExportOpen, visible, selected, selectedServers, openId, openServer, openNew, deleteServers, toggleMount]);

  const [detailWidth, setDetailWidth] = useState(readDetailWidth);
  const detailRef = useRef<HTMLElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(DETAIL_WIDTH_KEY, String(detailWidth));
    } catch {
      /* width is a per-device convenience */
    }
  }, [detailWidth]);

  /** Drags the panel edge by writing the width straight to the DOM once per frame; React state is set on release. */
  function startResize(e: MouseEvent) {
    e.preventDefault();
    const panel = detailRef.current;
    if (!panel) return;
    const startX = e.clientX;
    const startWidth = panel.getBoundingClientRect().width;
    const max = Math.max(DETAIL_MIN_WIDTH, Math.min(DETAIL_MAX_WIDTH, window.innerWidth - 560));
    let width = startWidth;
    let frame = 0;

    const onMove = (ev: globalThis.MouseEvent) => {
      width = Math.round(Math.min(max, Math.max(DETAIL_MIN_WIDTH, startWidth + startX - ev.clientX)));
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        panel.style.width = `${width}px`;
      });
    };
    const onUp = () => {
      cancelAnimationFrame(frame);
      panel.style.width = `${width}px`;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      document.body.classList.remove('resizing');
      setDetailWidth(width);
    };
    document.body.classList.add('resizing');
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  const title = t(`sidebar.${filter}`);

  return (
    <div className="flex h-full min-h-0 min-w-0 overflow-hidden">
      <Sidebar filter={filter} counts={counts} onFilterChange={setFilter} onOpenSettings={() => setSettingsOpen(true)} />

      <div className="flex min-w-0 flex-1 bg-background shadow-[-0.5px_0_0_var(--border)]">
        <section className="flex min-w-0 flex-1 flex-col">
          <header data-tauri-drag-region className="flex h-[52px] shrink-0 items-center gap-2 border-b px-3">
            <div data-tauri-drag-region className="min-w-0 flex-1">
              <h1 data-tauri-drag-region className="truncate text-[13px] font-semibold leading-tight">{title}</h1>
              <p data-tauri-drag-region className="truncate text-[11px] leading-tight text-muted-foreground">
                {t('detail.count', { count: visible.length })}
              </p>
            </div>
            <div className="relative w-44 shrink">
              <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                ref={searchRef}
                type="search"
                placeholder={t('app.search')}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-7 w-full rounded-md bg-muted pl-7 pr-2 text-[13px] outline-none placeholder:text-muted-foreground focus:ring-[3px] focus:ring-ring [&::-webkit-search-cancel-button]:appearance-none"
              />
            </div>
            <Button variant="ghost" size="icon" title={`${t('app.newServer')} (⌘N)`} onClick={openNew}>
              <Plus strokeWidth={1.75} />
            </Button>
          </header>

          <SystemRequirementsBanner />

          {updateInfo && (
            <div className="flex items-center gap-2 border-b bg-primary/8 px-3 py-1.5 text-[12px]">
              <ArrowDownCircle className="size-3.5 text-primary" />
              <span className="flex-1">{t('update.available', { version: updateInfo.version })}</span>
              <Button size="sm" variant="link" className="h-auto px-0" onClick={() => window.sshfs.openExternal(updateInfo.url)}>
                {t('update.download')}
              </Button>
              <Button size="icon" variant="ghost" className="size-5" onClick={() => setUpdateInfo(null)}>
                <X className="size-3" />
              </Button>
            </div>
          )}

          {visible.length > 0 && (
            <div className="flex h-8 shrink-0 items-center gap-2.5 border-b px-[18px] text-[12px] text-muted-foreground">
              <Checkbox
                checked={allVisibleSelected ? true : selectedServers.length > 0 ? 'indeterminate' : false}
                onCheckedChange={() => setSelected(allVisibleSelected ? new Set() : new Set(visible.map((s) => s.id)))}
                aria-label={t('server.selectAll')}
              />
              <button
                type="button"
                className="outline-none hover:text-foreground"
                onClick={() => setSelected(allVisibleSelected ? new Set() : new Set(visible.map((s) => s.id)))}
              >
                {allVisibleSelected ? t('server.deselectAll') : t('server.selectAll')}
              </button>
              {selectedServers.length > 0 && (
                <div className="ml-auto flex items-center gap-1">
                  <span className="mr-1 tabular-nums">{t('server.selected', { count: selectedServers.length })}</span>
                  <Button size="sm" variant="ghost" onClick={() => cloneMany(selectedServers)}>
                    <Copy className="size-3.5" />
                    {t('tooltip.clone')}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => exportMany(selectedServers)}>
                    <Download className="size-3.5" />
                    {t('settings.export')}
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => deleteServers(selectedServers)}>
                    <Trash2 className="size-3.5" />
                    {t('tooltip.delete')}
                  </Button>
                </div>
              )}
            </div>
          )}

          <div
            ref={listRef}
            className="relative min-h-0 flex-1 overflow-y-auto"
            onMouseDown={marquee.onMouseDown}
          >
            {marquee.rect && (
              <div
                className="pointer-events-none absolute z-20 border border-foreground/45 bg-foreground/10"
                style={marquee.rect}
              />
            )}
            {visible.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
                <Server className="size-10 text-muted-foreground/50" strokeWidth={1} />
                <p className="text-muted-foreground">{servers.length === 0 ? t('app.noServers') : t('app.noMatch')}</p>
                {servers.length === 0 && (
                  <Button onClick={openNew}>
                    <Plus />
                    {t('app.newServer')}
                  </Button>
                )}
              </div>
            ) : (
              <ServerList
                servers={visible}
                selected={selected}
                openId={openId}
                busy={busy}
                onOpen={openDetails}
                onToggleSelect={toggleSelect}
                onContextMenu={showContextMenu}
                onToggleMount={toggleMount}
                onToggleFavorite={(s) => toggleFavorite(s.id)}
                onEdit={openEdit}
                onClone={cloneMany}
                onExport={exportMany}
                onDelete={deleteServers}
              />
            )}
          </div>
        </section>

        {openServer && (
          <aside
            ref={detailRef}
            className="relative shrink-0 border-l [contain:layout_paint]"
            style={{ width: detailWidth }}
          >
            <div
              role="separator"
              aria-orientation="vertical"
              onMouseDown={startResize}
              onDoubleClick={() => setDetailWidth(DETAIL_DEFAULT_WIDTH)}
              className="absolute inset-y-0 -left-1 z-10 w-2 cursor-col-resize"
            />
            <ServerDetail
              server={openServer}
              busy={busy.has(openServer.id)}
              onClose={() => setOpenId(null)}
              onToggleMount={toggleMount}
              onEdit={openEdit}
              onToggleFavorite={(s) => toggleFavorite(s.id)}
              onClone={cloneMany}
              onDelete={deleteServers}
            />
          </aside>
        )}
      </div>

      <ServerFormDialog open={dialogOpen} onOpenChange={setDialogOpen} server={editing} />
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onOpenImportExport={() => {
          setSettingsOpen(false);
          setImportExportOpen(true);
        }}
      />
      <ImportExportDialog open={importExportOpen} onOpenChange={setImportExportOpen} />
      <Toaster position="bottom-center" theme="system" closeButton />
    </div>
  );
}
