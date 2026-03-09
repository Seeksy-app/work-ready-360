import { useState, useEffect } from 'react';
import { WipItem } from '@/lib/wip';
import { Badge } from '@/components/ui/badge';

interface RankingClickAssignProps {
  items: WipItem[];
  onRankingComplete: (rankings: Record<string, number>) => void;
  currentRankings?: Record<string, number>;
}

export default function RankingClickAssign({ items, onRankingComplete, currentRankings }: RankingClickAssignProps) {
  const [rankings, setRankings] = useState<Record<string, number>>(currentRankings || {});

  const availableRanks = [1, 2, 3, 4, 5];
  const usedRanks = new Set(Object.values(rankings));

  const handleAssignRank = (itemId: string, rank: number) => {
    const newRankings = { ...rankings };

    // If this rank is already assigned to another item, swap
    const existingItem = Object.entries(newRankings).find(([_, r]) => r === rank);
    if (existingItem && existingItem[0] !== itemId) {
      // If current item already had a rank, give it to the displaced item
      if (newRankings[itemId]) {
        newRankings[existingItem[0]] = newRankings[itemId];
      } else {
        delete newRankings[existingItem[0]];
      }
    }

    newRankings[itemId] = rank;
    setRankings(newRankings);

    if (Object.keys(newRankings).length === items.length) {
      onRankingComplete(newRankings);
    }
  };

  const handleClear = (itemId: string) => {
    const newRankings = { ...rankings };
    delete newRankings[itemId];
    setRankings(newRankings);
  };

  useEffect(() => {
    if (Object.keys(rankings).length === items.length) {
      onRankingComplete(rankings);
    }
  }, [rankings, items.length, onRankingComplete]);

  return (
    <div className="space-y-1">
      <div className="rounded-lg border border-border bg-accent/5 p-3 mb-3">
        <p className="text-sm font-semibold text-center text-accent-foreground">
          For my IDEAL JOB it is important that:
        </p>
      </div>

      {items.map((item) => {
        const currentRank = rankings[item.item_id];
        
        return (
          <div key={item.item_id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
            {currentRank ? (
              <button
                onClick={() => handleClear(item.item_id)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0 bg-accent text-accent-foreground hover:bg-accent/80 transition-colors"
                title="Click to clear"
              >
                {currentRank}
              </button>
            ) : (
              <span className="w-7 h-7 rounded-full flex items-center justify-center text-sm shrink-0 border-2 border-dashed border-muted-foreground/30 text-muted-foreground">
                ?
              </span>
            )}
            
            <span className="text-sm font-medium flex-1">{item.text}</span>
            
            <div className="flex gap-1 shrink-0">
              {availableRanks.map((rank) => {
                const isUsed = usedRanks.has(rank) && rankings[item.item_id] !== rank;
                const isSelected = rankings[item.item_id] === rank;
                
                return (
                  <button
                    key={rank}
                    onClick={() => handleAssignRank(item.item_id, rank)}
                    className={`w-7 h-7 rounded text-xs font-semibold transition-all
                      ${isSelected
                        ? 'bg-accent text-accent-foreground'
                        : isUsed
                          ? 'bg-muted/50 text-muted-foreground/50 hover:bg-muted'
                          : 'bg-muted text-muted-foreground hover:bg-accent/20 hover:text-accent-foreground'
                      }
                    `}
                  >
                    {rank}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      
      <p className="text-xs text-muted-foreground text-center mt-2">
        1 = Most Important, 5 = Least Important
      </p>
    </div>
  );
}
