import { Menu } from '@tauri-apps/api/menu';

export type NativeMenuEntry =
  | { separator: true }
  | { text: string; action: () => void; enabled?: boolean; accelerator?: string };

/** Pops up a native macOS context menu at the cursor position. */
export async function showNativeMenu(entries: NativeMenuEntry[]) {
  const menu = await Menu.new({
    items: entries.map((entry) =>
      'separator' in entry
        ? { item: 'Separator' as const }
        : { text: entry.text, enabled: entry.enabled ?? true, accelerator: entry.accelerator, action: entry.action },
    ),
  });
  await menu.popup();
}
