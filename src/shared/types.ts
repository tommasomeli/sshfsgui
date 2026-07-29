export type AuthMethod = 'password' | 'key' | 'agent';

export interface ServerConfig {
  id: string;
  name: string;
  host: string;
  port: number;
  user: string;
  remotePath: string;
  localPath: string;
  authMethod: AuthMethod;
  identityFile?: string;
  extraOptions?: string;
  isFavorite: boolean;
  mountOnStartup: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface ServerWithStatus extends ServerConfig {
  mounted: boolean;
}

export type ServerInput = Omit<ServerConfig, 'id' | 'createdAt' | 'updatedAt'> & {
  id?: string;
  password?: string;
};

export interface SystemStatus {
  sshfs: { installed: boolean; version?: string };
  fuseT: { installed: boolean };
  macfuse: { installed: boolean };
}

export type HomebrewStackKey = 'fuseT' | 'macfuse';

export interface HomebrewStackInstruction {
  key: HomebrewStackKey;
  commands: string[];
}

export interface InstallInstructions {
  stacks: HomebrewStackInstruction[];
  links: { label: string; url: string }[];
}

export interface AppSettings {
  launchAtLogin: boolean;
  unmountOnQuit: boolean;
  showInTray: boolean;
  language: 'auto' | 'en' | 'it';
}

export interface SshfsApi {
  checkSystem(): Promise<SystemStatus>;
  installInstructions(): Promise<InstallInstructions>;
  wasSystemReadySeen(): Promise<boolean>;
  markSystemReadySeen(): Promise<void>;
  listServers(): Promise<ServerWithStatus[]>;
  saveServer(input: ServerInput): Promise<ServerWithStatus>;
  deleteServer(id: string): Promise<void>;
  mountServer(id: string): Promise<void>;
  unmountServer(id: string): Promise<void>;
  refreshStatus(): Promise<Record<string, boolean>>;
  revealInFinder(localPath: string): Promise<void>;
  openExternal(url: string): Promise<void>;
  selectDirectory(defaultPath?: string): Promise<string | null>;
  selectFile(defaultPath?: string): Promise<string | null>;
  getSettings(): Promise<AppSettings>;
  saveSettings(settings: AppSettings): Promise<void>;
  isPackaged(): Promise<boolean>;
  quitApp(): Promise<void>;
  onOpenSettings(callback: () => void): void;
  onRefresh(callback: () => void): void;
  exportData(opts: { servers?: boolean; serverIds?: string[]; settings?: boolean }): Promise<boolean>;
  importData(): Promise<{ servers?: number; settings?: boolean } | null>;
  onUpdateAvailable(callback: (info: { version: string; url: string } | null) => void): void;
}
