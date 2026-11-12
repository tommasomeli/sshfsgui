import { useCallback, useEffect, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent, RefObject } from 'react';

export interface MarqueeRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Movement needed before a press turns into a drag: low on empty space, high on a row so a click never becomes a drag. */
const DRAG_THRESHOLD_EMPTY = 4;
const DRAG_THRESHOLD_ROW = 12;
const EDGE_SCROLL_ZONE = 32;
const EDGE_SCROLL_SPEED = 12;

/**
 * Rubber-band selection inside a scrollable list. Rows carry `data-server-id`;
 * the rectangle is tracked in content coordinates so it follows the scroll.
 * Dragging with ⌘ or ⇧ adds to the selection that exists when the drag starts.
 */
export function useMarqueeSelection(
  containerRef: RefObject<HTMLElement | null>,
  selected: Set<string>,
  onChange: (ids: Set<string>) => void,
) {
  const [rect, setRect] = useState<MarqueeRect | null>(null);
  const cleanup = useRef<(() => void) | null>(null);
  const selectedRef = useRef(selected);
  const dragged = useRef(false);
  selectedRef.current = selected;

  useEffect(() => () => cleanup.current?.(), []);

  const onMouseDown = useCallback(
    (e: ReactMouseEvent) => {
      const container = containerRef.current;
      if (!container || e.button !== 0) return;
      dragged.current = false;
      if ((e.target as HTMLElement).closest('button, input, [role="checkbox"], [role="separator"]')) return;

      const bounds = () => container.getBoundingClientRect();
      const toContent = (clientX: number, clientY: number) => {
        const b = bounds();
        return { x: clientX - b.left + container.scrollLeft, y: clientY - b.top + container.scrollTop };
      };

      const origin = toContent(e.clientX, e.clientY);
      const additive = e.metaKey || e.shiftKey;
      const threshold = (e.target as HTMLElement).closest('[data-server-id]') ? DRAG_THRESHOLD_ROW : DRAG_THRESHOLD_EMPTY;
      let base = new Set<string>();
      let pointer = { x: e.clientX, y: e.clientY };
      let active = false;
      let frame = 0;

      const update = () => {
        const current = toContent(pointer.x, pointer.y);
        const left = Math.max(0, Math.min(origin.x, current.x));
        const top = Math.max(0, Math.min(origin.y, current.y));
        const right = Math.min(container.scrollWidth, Math.max(origin.x, current.x));
        const bottom = Math.min(container.scrollHeight, Math.max(origin.y, current.y));
        setRect({ left, top, width: right - left, height: bottom - top });

        const next = new Set(base);
        const b = bounds();
        container.querySelectorAll<HTMLElement>('[data-server-id]').forEach((row) => {
          const r = row.getBoundingClientRect();
          const rowTop = r.top - b.top + container.scrollTop;
          const rowBottom = rowTop + r.height;
          if (rowBottom >= top && rowTop <= bottom) next.add(row.dataset.serverId!);
        });
        onChange(next);
      };

      const tick = () => {
        frame = 0;
        if (!active) return;
        const b = bounds();
        let scrolled = false;
        if (pointer.y < b.top + EDGE_SCROLL_ZONE && container.scrollTop > 0) {
          container.scrollTop -= EDGE_SCROLL_SPEED;
          scrolled = true;
        } else if (pointer.y > b.bottom - EDGE_SCROLL_ZONE) {
          const before = container.scrollTop;
          container.scrollTop += EDGE_SCROLL_SPEED;
          scrolled = container.scrollTop !== before;
        }
        update();
        if (scrolled) frame = requestAnimationFrame(tick);
      };

      const onMove = (ev: MouseEvent) => {
        pointer = { x: ev.clientX, y: ev.clientY };
        if (!active) {
          if (Math.hypot(ev.clientX - e.clientX, ev.clientY - e.clientY) < threshold) return;
          active = true;
          dragged.current = true;
          base = additive ? new Set(selectedRef.current) : new Set<string>();
          document.body.classList.add('marquee');
        }
        if (!frame) frame = requestAnimationFrame(tick);
      };

      const stop = () => {
        cancelAnimationFrame(frame);
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', stop);
        document.body.classList.remove('marquee');
        setRect(null);
        cleanup.current = null;
      };

      cleanup.current?.();
      cleanup.current = stop;
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', stop);
    },
    [containerRef, onChange],
  );

  /** True when the last press turned into a drag, so the click that follows it is ignored. */
  const wasDrag = useCallback(() => dragged.current, []);

  return { rect, onMouseDown, wasDrag };
}
