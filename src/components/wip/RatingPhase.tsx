import type { WipItemConfig } from '@/lib/wip/itemCatalog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface RatingPhaseProps {
  items: WipItemConfig[];
  ratings: Record<string, number>;
  onRatingChange: (itemId: string, rating: number) => void;
  currentPage: number;
  itemsPerPage: number;
}

const ratingOptions = [
  { value: 1, label: "Not Important" },
  { value: 2, label: "Somewhat Important" },
  { value: 3, label: "Important" },
  { value: 4, label: "Very Important" },
  { value: 5, label: "Most Important" },
];

export default function RatingPhase({ items, ratings, onRatingChange, currentPage, itemsPerPage }: RatingPhaseProps) {
  const startIdx = currentPage * itemsPerPage;
  const pageItems = items.slice(startIdx, startIdx + itemsPerPage);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-accent/5 p-3">
        <p className="text-sm font-semibold text-center text-accent-foreground">
          Now rate each statement independently — how important is it to you?
        </p>
      </div>

      {pageItems.map((item) => (
        <div key={item.id} className="space-y-3">
          <p className="font-medium text-sm">{item.statement}</p>
          <RadioGroup
            value={ratings[String(item.id)]?.toString() || ''}
            onValueChange={(value) => onRatingChange(String(item.id), parseInt(value))}
            className="flex flex-wrap gap-2"
          >
            {ratingOptions.map((option) => (
              <div key={option.value} className="flex items-center">
                <RadioGroupItem
                  value={option.value.toString()}
                  id={`rate-${item.id}-${option.value}`}
                  className="peer sr-only"
                />
                <Label
                  htmlFor={`rate-${item.id}-${option.value}`}
                  className="px-3 py-2 rounded-lg border-2 cursor-pointer transition-all hover:border-accent/50 peer-data-[state=checked]:border-accent peer-data-[state=checked]:bg-accent/10 text-sm"
                >
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      ))}
    </div>
  );
}
