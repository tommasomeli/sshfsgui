import { create } from 'zustand';
import i18n from 'i18next';
import { applyLanguage } from '@/i18n';
import type { AppSettings, ServerInput, ServerWithStatus, SystemStatus } from '@shared/types';

interface ServersState {
  servers: ServerWithStatus[];
  system: SystemStatus | null;
  settings: AppSettings;
  loading: boolean;
  initialized: boolean;
  init(): Promise<void>;
  refreshSystem(): Promise<void>;
  refresh(): Promise<void>;
  refreshStatuses(): Promise<void>;
  save(input: ServerInput): Promise<ServerWithStatus>;
  remove(id: string): Promise<void>;
  toggleFavorite(id: string): Promise<void>;
  mount(id: string): Promise<void>;
  unmount(id: string): Promise<void>;
  clone(id: string): Promise<ServerWithStatus | null>;
  updateSettings(settings: AppSettings): Promise<void>;
}

export const useServersStore = create<ServersState>((set, get) => ({
  servers: [],
  system: null,
  settings: { launchAtLogin: false, unmountOnQuit: false, showInTray: false, language: 'auto' },
  loading: false,
  initialized: false,

  async init() {
    if (get().initialized) return;
    set({ loading: true });
    const [system, servers, settings] = await Promise.all([
      window.sshfs.checkSystem(),
      window.sshfs.listServers(),
      window.sshfs.getSettings(),
    ]);
    applyLanguage(settings.language);
    set({ system, servers, settings, loading: false, initialized: true });
  },

  async refreshSystem() {
    const system = await window.sshfs.checkSystem();
    set({ system });
  },

  async refresh() {
    const servers = await window.sshfs.listServers();
    set({ servers });
  },

  async refreshStatuses() {
    const statuses = await window.sshfs.refreshStatus();
    set((state) => ({
      servers: state.servers.map((s) => ({ ...s, mounted: !!statuses[s.id] })),
    }));
  },

  async save(input) {
    const saved = await window.sshfs.saveServer(input);
    set((state) => {
      const idx = state.servers.findIndex((s) => s.id === saved.id);
      const servers = [...state.servers];
      if (idx > -1) servers[idx] = saved;
      else servers.push(saved);
      return { servers };
    });
    return saved;
  },

  async remove(id) {
    await window.sshfs.deleteServer(id);
    set((state) => ({ servers: state.servers.filter((s) => s.id !== id) }));
  },

  async toggleFavorite(id) {
    const target = get().servers.find((s) => s.id === id);
    if (!target) return;
    await get().save({ ...target, isFavorite: !target.isFavorite });
  },

  async mount(id) {
    await window.sshfs.mountServer(id);
    await get().refreshStatuses();
  },

  async unmount(id) {
    await window.sshfs.unmountServer(id);
    await get().refreshStatuses();
  },

  async clone(id) {
    const target = get().servers.find((s) => s.id === id);
    if (!target) return null;
    const { id: _id, mounted: _m, createdAt: _c, updatedAt: _u, ...rest } = target;
    void _id; void _m; void _c; void _u;
    return get().save({
      ...rest,
      name: i18n.t('server.copyName', { name: target.name }),
      isFavorite: false,
    });
  },

  async updateSettings(settings) {
    await window.sshfs.saveSettings(settings);
    applyLanguage(settings.language);
    set({ settings });
  },
}));
