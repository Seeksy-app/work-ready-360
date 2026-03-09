import { useState, useEffect } from 'react';
import type { RankableItem } from './types';

interface RankingClickAssignProps {
  items: RankableItem[];
  onRankingComplete: (rankings: Record<string, number>) => void;
  currentRankings?: Record<string, number>;
}

export default function RankingClickAssign({ items, onRankingComplete, currentRankings }: RankingClickAssignProps) {
  const [rankings, setRankings] = useState<Record<string, number>>(currentRankings || {});

  const availableRanks = [1, 2, 3, 4, 5];
  const usedRanks = new Set(Object.values(rankings));

  const handleAssignRank = (itemKey: string, rank: number) => {
    const newRankings = { ...rankings };
    const existingItem = Object.entries(newRankings).find(([_, r]) => r === rank);
    if (existingItem && existingItem[0] !== itemKey) {
      if (newRankings[itemKey]) {
        newRankings[existingItem[0]] = newRankings[itemKey];
      } else {
        delete newRankings[existingItem[0]];
      }
    }
    newRankings[itemKey] = rank;
    setRankings(newRankings);
    if (Object.keys(newRankings).length === items.length) {
      onRankingComplete(newRankings);
    }
  };

  const handleClear = (itemKey: string) => {
    const newRankings = { ...rankings };
    delete newRankings[itemKey];
    setRankings(newRankings);
  };

  useEffect(() => {
    if (Object.keys(rankings).length === items.length) {
      onRankingComplete(rankings);
    }
  }, [rankings, items.length, onRankingComplete]);

  return (
    <div className="space-y-1">
      {items.map((item) => {
        const currentRank = rankings[item.key];
        return (
          <div key={item.key} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
            {currentRank ? (
              <button onClick={() => handleClear(item.key)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0 bg-accent text-accent-foreground hover:bg-accent/80 transition-colors"
                title="Click to clear">
                {currentRank}
              </button>
            ) : (
              <span className="w-7 h-7 rounded-full flex items-center justify-center text-sm shrink-0 border-2 border-dashed border-muted-foreground/30 text-muted-foreground">?</span>
            )}
            <span className="text-sm font-medium flex-1">{item.text}</span>
            <div className="flex gap-1 shrink-0">
              {availableRanks.map((rank) => {
                const isUsed = usedRanks.has(rank) && rankings[item.key] !== rank;
                const isSelected = rankings[item.key] === rank;
                return (
                  <button key={rank} onClick={() => handleAssignRank(item.key, rank)}
                    className={`w-7 h-7 rounded text-xs font-semibold transition-all
                      ${isSelected ? 'bg-accent text-accent-foreground' : isUsed ? 'bg-muted/50 text-muted-foreground/50 hover:bg-muted' : 'bg-muted text-muted-foreground hover:bg-accent/20 hover:text-accent-foreground'}
                    `}>
                    {rank}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      <p className="text-xs text-muted-foreground text-center mt-2">1 = Most Important, 5 = Least Important</p>
    </div>
  );
}
