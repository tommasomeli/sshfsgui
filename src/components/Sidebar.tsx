import { useTranslation } from 'react-i18next';
import { HardDrive, Layers, Settings, Star } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type Filter = 'all' | 'favorites' | 'mounted';

interface Props {
  filter: Filter;
  counts: Record<Filter, number>;
  onFilterChange(filter: Filter): void;
  onOpenSettings(): void;
}

const ITEMS: { key: Filter; icon: LucideIcon; label: string }[] = [
  { key: 'all', icon: Layers, label: 'sidebar.all' },
  { key: 'favorites', icon: Star, label: 'sidebar.favorites' },
  { key: 'mounted', icon: HardDrive, label: 'sidebar.mounted' },
];

export function Sidebar({ filter, counts, onFilterChange, onOpenSettings }: Props) {
  const { t } = useTranslation();

  return (
    <aside className="flex w-[200px] shrink-0 flex-col text-sidebar-foreground">
      <div data-tauri-drag-region className="h-[52px] shrink-0" />
      <nav className="flex flex-1 flex-col gap-px px-2.5">
        <p className="px-2 pb-1 text-[11px] font-semibold text-sidebar-muted">{t('sidebar.title')}</p>
        {ITEMS.map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => onFilterChange(key)}
            className={cn(
              'flex h-7 items-center gap-2 rounded-md px-2 text-left outline-none',
              filter === key ? 'bg-sidebar-active' : 'hover:bg-sidebar-active/50',
            )}
          >
            <Icon className="size-4 shrink-0 text-primary" strokeWidth={1.75} />
            <span className="flex-1 truncate">{t(label)}</span>
            <span className="text-[12px] tabular-nums text-sidebar-muted">{counts[key]}</span>
          </button>
        ))}
      </nav>
      <div className="px-2.5 pb-3">
        <button
          type="button"
          onClick={onOpenSettings}
          className="flex h-7 w-full items-center gap-2 rounded-md px-2 text-left text-sidebar-muted outline-none hover:bg-sidebar-active/50 hover:text-sidebar-foreground"
        >
          <Settings className="size-4" strokeWidth={1.75} />
          {t('tooltip.settings')}
        </button>
      </div>
    </aside>
  );
}
