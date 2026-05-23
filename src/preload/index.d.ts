import type { SshfsApi } from '../shared/types';

declare global {
  interface Window {
    sshfs: SshfsApi;
  }
}

export {};
