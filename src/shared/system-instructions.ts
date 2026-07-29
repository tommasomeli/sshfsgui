import type { InstallInstructions } from './types';
import instructions from './system-instructions.json';

export function getInstallInstructions(): InstallInstructions {
  return instructions as InstallInstructions;
}
