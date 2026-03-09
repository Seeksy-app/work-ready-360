import { useState, useEffect } from 'react';
import { WipItem } from '@/lib/wip';
import { CheckCircle2 } from 'lucide-react';

interface RankingSequentialProps {
  items: WipItem[];
  onRankingComplete: (rankings: Record<string, number>) => void;
  currentRankings?: Record<string, number>;
}

export default function RankingSequential({ items, onRankingComplete, currentRankings }: RankingSequentialProps) {
  const [selections, setSelections] = useState<string[]>(() => {
    if (currentRankings && Object.keys(currentRankings).length === items.length) {
      return [...Object.entries(currentRankings)]
        .sort(([, a], [, b]) => a - b)
        .map(([id]) => id);
    }
    return [];
  });

  const currentStep = selections.length;
  const isComplete = currentStep === items.length;
  const remainingItems = items.filter(i => !selections.includes(i.item_id));

  const handleSelect = (itemId: string) => {
    if (selections.includes(itemId)) return;
    const newSelections = [...selections, itemId];
    setSelections(newSelections);

    if (newSelections.length === items.length) {
      const rankings: Record<string, number> = {};
      newSelections.forEach((id, idx) => {
        rankings[id] = idx + 1;
      });
      onRankingComplete(rankings);
    }
  };

  const handleUndo = () => {
    if (selections.length === 0) return;
    setSelections(selections.slice(0, -1));
  };

  const stepLabels = ["Most Important", "2nd Most Important", "3rd Most Important", "4th Most Important", "Least Important"];

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border bg-accent/5 p-3">
        <p className="text-sm font-semibold text-center text-accent-foreground">
          For my IDEAL JOB it is important that:
        </p>
      </div>

      {!isComplete && (
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Select the <span className="font-semibold text-accent">{stepLabels[currentStep]}</span> statement
          </p>
        </div>
      )}

      {/* Already selected items */}
      {selections.length > 0 && (
        <div className="space-y-1 mb-2">
          {selections.map((id, idx) => {
            const item = items.find(i => i.item_id === id);
            if (!item) return null;
            return (
              <div key={id} className="flex items-center gap-3 p-2 rounded-lg bg-accent/10 border border-accent/30">
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-accent text-accent-foreground shrink-0">
                  {idx + 1}
                </span>
                <span className="text-sm flex-1">{item.text}</span>
                <CheckCircle2 className="h-4 w-4 text-accent shrink-0" />
              </div>
            );
          })}
          {!isComplete && (
            <button
              onClick={handleUndo}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              Undo last selection
            </button>
          )}
        </div>
      )}

      {/* Remaining items to select */}
      {!isComplete && (
        <div className="space-y-1">
          {remainingItems.map((item) => (
            <button
              key={item.item_id}
              onClick={() => handleSelect(item.item_id)}
              className="w-full flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:border-accent hover:bg-accent/5 transition-all text-left"
            >
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs border-2 border-dashed border-muted-foreground/30 text-muted-foreground shrink-0">
                {currentStep + 1}
              </span>
              <span className="text-sm font-medium">{item.text}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
