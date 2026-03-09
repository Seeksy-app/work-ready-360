import { WipItem } from '@/lib/wip';
import { Button } from '@/components/ui/button';

interface PreferencesPhaseProps {
  items: WipItem[];
  preferences: Record<string, boolean>;
  onPreferenceChange: (itemId: string, value: boolean) => void;
}

export default function PreferencesPhase({ items, preferences, onPreferenceChange }: PreferencesPhaseProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-accent/5 p-3">
        <p className="text-sm text-center text-accent-foreground">
          Now, for each of the work statements below choose <em className="font-semibold">Yes</em> if you feel the statement is important to you, otherwise choose <em className="font-semibold">No</em>. You must respond for each statement before you can proceed.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((item) => {
          const selected = preferences[item.item_id];
          return (
            <div
              key={item.item_id}
              className="rounded-lg border border-border p-4 space-y-3 bg-card"
            >
              <p className="text-sm font-medium leading-snug">
                For my IDEAL JOB it is important that: {item.text}
              </p>
              <div className="flex gap-3">
                <Button
                  variant={selected === true ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => onPreferenceChange(item.item_id, true)}
                >
                  Yes
                </Button>
                <Button
                  variant={selected === false ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => onPreferenceChange(item.item_id, false)}
                >
                  No
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
