import { useState, useCallback, useMemo } from 'react';

export interface UseSelectionReturn {
  selected: Set<string>;
  isSelecting: boolean;
  toggle: (id: string) => void;
  selectAll: (ids: string[]) => void;
  deselectAll: () => void;
  enterSelectionMode: (initialId?: string) => void;
  exitSelectionMode: () => void;
  count: number;
}

export function useSelection(): UseSelectionReturn {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isSelecting, setIsSelecting] = useState(false);

  const toggle = useCallback((id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback((ids: string[]) => {
    setSelected(new Set(ids));
  }, []);

  const deselectAll = useCallback(() => {
    setSelected(new Set());
  }, []);

  const enterSelectionMode = useCallback((initialId?: string) => {
    setIsSelecting(true);
    if (initialId) {
      setSelected(new Set([initialId]));
    }
  }, []);

  const exitSelectionMode = useCallback(() => {
    setIsSelecting(false);
    setSelected(new Set());
  }, []);

  const count = useMemo(() => selected.size, [selected]);

  return { selected, isSelecting, toggle, selectAll, deselectAll, enterSelectionMode, exitSelectionMode, count };
}
