import { useState, useCallback } from 'react';
import { GripVertical } from 'lucide-react';
import type { RankableItem } from './types';

interface RankingDragDropProps {
  items: RankableItem[];
  onRankingComplete: (rankings: Record<string, number>) => void;
  currentRankings?: Record<string, number>;
}

export default function RankingDragDrop({ items, onRankingComplete, currentRankings }: RankingDragDropProps) {
  const getInitialOrder = () => {
    if (currentRankings && Object.keys(currentRankings).length === items.length) {
      return [...items].sort((a, b) => (currentRankings[a.key] || 0) - (currentRankings[b.key] || 0));
    }
    return [...items];
  };

  const [orderedItems, setOrderedItems] = useState<RankableItem[]>(getInitialOrder);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const handleDragStart = (idx: number) => { setDraggedIdx(idx); };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOverIdx(idx);
  };

  const emitRankings = (items: RankableItem[]) => {
    const rankings: Record<string, number> = {};
    items.forEach((item, i) => { rankings[item.key] = i + 1; });
    onRankingComplete(rankings);
  };

  const handleDrop = (idx: number) => {
    if (draggedIdx === null || draggedIdx === idx) {
      setDraggedIdx(null);
      setDragOverIdx(null);
      return;
    }
    const newItems = [...orderedItems];
    const [removed] = newItems.splice(draggedIdx, 1);
    newItems.splice(idx, 0, removed);
    setOrderedItems(newItems);
    setDraggedIdx(null);
    setDragOverIdx(null);
    emitRankings(newItems);
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  const moveItem = (fromIdx: number, direction: 'up' | 'down') => {
    const toIdx = direction === 'up' ? fromIdx - 1 : fromIdx + 1;
    if (toIdx < 0 || toIdx >= orderedItems.length) return;
    const newItems = [...orderedItems];
    [newItems[fromIdx], newItems[toIdx]] = [newItems[toIdx], newItems[fromIdx]];
    setOrderedItems(newItems);
    emitRankings(newItems);
  };

  return (
    <div className="space-y-1">
      {orderedItems.map((item, idx) => (
        <div
          key={item.key}
          draggable
          onDragStart={() => handleDragStart(idx)}
          onDragOver={(e) => handleDragOver(e, idx)}
          onDrop={() => handleDrop(idx)}
          onDragEnd={handleDragEnd}
          className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-grab active:cursor-grabbing
            ${draggedIdx === idx ? 'opacity-50 border-accent' : ''}
            ${dragOverIdx === idx && draggedIdx !== idx ? 'border-accent bg-accent/10' : 'border-border bg-card'}
            hover:border-accent/50
          `}
        >
          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0
            ${idx === 0 ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'}
          `}>
            {idx + 1}
          </span>
          <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium flex-1">{item.text}</span>
          <div className="flex flex-col gap-0.5 shrink-0">
            <button onClick={() => moveItem(idx, 'up')} disabled={idx === 0}
              className="p-0.5 rounded hover:bg-muted disabled:opacity-30 text-muted-foreground" aria-label="Move up">▲</button>
            <button onClick={() => moveItem(idx, 'down')} disabled={idx === orderedItems.length - 1}
              className="p-0.5 rounded hover:bg-muted disabled:opacity-30 text-muted-foreground" aria-label="Move down">▼</button>
          </div>
        </div>
      ))}
    </div>
  );
}
