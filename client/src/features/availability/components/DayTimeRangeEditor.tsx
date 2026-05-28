import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { TimeRangeDto } from '../api/availabilityApi';

export interface EventSlot {
  start: string;
  end: string;
}

const DEFAULT_START = '09:00';
const DEFAULT_END = '10:00';

function toSlots(ranges: TimeRangeDto[]): EventSlot[] {
  return ranges.map((r) => ({
    start: r.start,
    end: r.end,
  }));
}

function toRanges(slots: EventSlot[]): TimeRangeDto[] {
  return slots.map((s) => ({
    start: s.start,
    end: s.end,
  }));
}

interface DayTimeRangeEditorProps {
  ranges: TimeRangeDto[];
  onChange: (ranges: TimeRangeDto[]) => void;
  readOnly?: boolean;
}

export function DayTimeRangeEditor({
  ranges,
  onChange,
  readOnly = false,
}: DayTimeRangeEditorProps) {
  const slots = toSlots(ranges);

  const updateSlots = (updated: EventSlot[]) => {
    onChange(toRanges(updated));
  };

  const handleStartChange = (index: number, value: string) => {
    const updated = slots.map((s, i) => (i === index ? { ...s, start: value } : s));
    updateSlots(updated);
  };

  const handleEndChange = (index: number, value: string) => {
    const updated = slots.map((s, i) => (i === index ? { ...s, end: value } : s));
    updateSlots(updated);
  };

  const handleRemove = (index: number) => {
    updateSlots(slots.filter((_, i) => i !== index));
  };

  const handleAdd = () => {
    const lastEnd = ranges.length > 0
      ? ranges[ranges.length - 1].end
      : DEFAULT_START;
    updateSlots([...slots, { start: lastEnd, end: DEFAULT_END }]);
  };

  if (readOnly) {
    return (
      <div className="space-y-1">
        {ranges.length === 0 ? (
          <p className="text-sm text-muted-foreground">No availability set</p>
        ) : (
          ranges.map((range, i) => (
            <div key={i} className="text-sm text-foreground">
              {range.start} – {range.end}
            </div>
          ))
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {slots.map((slot, i) => (
        <div key={i} className="rounded-md border p-3 space-y-2 bg-muted/30">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium">Time range</span>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => handleRemove(i)}
              type="button"
              className="shrink-0"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1">
              <p className="text-[10px] text-muted-foreground mb-0.5">Start</p>
              <Input
                type="time"
                value={slot.start}
                onChange={(e) => handleStartChange(i, e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div className="flex-1">
              <p className="text-[10px] text-muted-foreground mb-0.5">End</p>
              <Input
                type="time"
                value={slot.end}
                onChange={(e) => handleEndChange(i, e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>
        </div>
      ))}

      <Button variant="outline" size="sm" onClick={handleAdd} type="button" className="w-full">
        <Plus className="h-3.5 w-3.5 mr-1" />
        Add time range
      </Button>
    </div>
  );
}

export default DayTimeRangeEditor;
