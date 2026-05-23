/// <reference types="vite/client" />

import type { SshfsApi } from '@shared/types';

declare global {
  interface Window {
    sshfs: SshfsApi;
  }
}

declare module '*.css';

export {};
