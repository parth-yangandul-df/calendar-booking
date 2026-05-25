import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { TimeRangeDto } from '../api/availabilityApi';

// Internal representation used while editing
export interface EventSlot {
  start: string;       // "HH:mm"
  type: EventType;
  duration: number;    // minutes
}

export type EventType = 'Consultation' | 'Follow-up' | 'Office Hours' | 'Custom';

const EVENT_TYPES: EventType[] = ['Consultation', 'Follow-up', 'Office Hours', 'Custom'];

const DURATION_OPTIONS: { label: string; minutes: number }[] = [
  { label: '15 min', minutes: 15 },
  { label: '30 min', minutes: 30 },
  { label: '45 min', minutes: 45 },
  { label: '60 min', minutes: 60 },
  { label: '90 min', minutes: 90 },
  { label: '2 hrs', minutes: 120 },
];

const DEFAULT_DURATION = 60;
const DEFAULT_TYPE: EventType = 'Consultation';

// Compute end time string from a start "HH:mm" and duration in minutes
function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const endH = Math.floor(total / 60) % 24;
  const endM = total % 60;
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}

// Infer a duration from a { start, end } pair, defaulting to DEFAULT_DURATION
function inferDuration(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const diff = (eh * 60 + em) - (sh * 60 + sm);
  const known = DURATION_OPTIONS.find((d) => d.minutes === diff);
  return known ? diff : DEFAULT_DURATION;
}

// Convert incoming TimeRangeDto[] → EventSlot[] for editing
function toSlots(ranges: TimeRangeDto[]): EventSlot[] {
  return ranges.map((r) => ({
    start: r.start,
    type: DEFAULT_TYPE,
    duration: inferDuration(r.start, r.end),
  }));
}

// Convert EventSlot[] → TimeRangeDto[] for saving
function toRanges(slots: EventSlot[]): TimeRangeDto[] {
  return slots.map((s) => ({
    start: s.start,
    end: addMinutes(s.start, s.duration),
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
  // Derive slots from ranges on every render (controlled via parent ranges)
  const slots = toSlots(ranges);

  const updateSlots = (updated: EventSlot[]) => {
    onChange(toRanges(updated));
  };

  const handleStartChange = (index: number, value: string) => {
    const updated = slots.map((s, i) => (i === index ? { ...s, start: value } : s));
    updateSlots(updated);
  };

  const handleTypeChange = (index: number, value: EventType) => {
    const updated = slots.map((s, i) => (i === index ? { ...s, type: value } : s));
    updateSlots(updated);
  };

  const handleDurationChange = (index: number, value: number) => {
    const updated = slots.map((s, i) => (i === index ? { ...s, duration: value } : s));
    updateSlots(updated);
  };

  const handleRemove = (index: number) => {
    updateSlots(slots.filter((_, i) => i !== index));
  };

  const handleAdd = () => {
    const lastEnd = ranges.length > 0
      ? ranges[ranges.length - 1].end
      : '09:00';
    updateSlots([...slots, { start: lastEnd, type: DEFAULT_TYPE, duration: DEFAULT_DURATION }]);
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
      {slots.map((slot, i) => {
        const endTime = addMinutes(slot.start, slot.duration);
        return (
          <div key={i} className="rounded-md border p-3 space-y-2 bg-muted/30">
            {/* Row 1: Type + remove */}
            <div className="flex items-center justify-between gap-2">
              <Select
                value={slot.type}
                onValueChange={(v) => handleTypeChange(i, v as EventType)}
              >
                <SelectTrigger className="h-8 text-xs flex-1">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t} className="text-xs">
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

            {/* Row 2: Start + Duration */}
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
                <p className="text-[10px] text-muted-foreground mb-0.5">Duration</p>
                <Select
                  value={String(slot.duration)}
                  onValueChange={(v) => handleDurationChange(i, Number(v))}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Duration" />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATION_OPTIONS.map((d) => (
                      <SelectItem key={d.minutes} value={String(d.minutes)} className="text-xs">
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[10px] text-muted-foreground mb-0.5">Ends at</p>
                <p className="text-xs font-medium h-8 flex items-center">{endTime}</p>
              </div>
            </div>
          </div>
        );
      })}

      <Button variant="outline" size="sm" onClick={handleAdd} type="button" className="w-full">
        <Plus className="h-3.5 w-3.5 mr-1" />
        Add event
      </Button>
    </div>
  );
}

export default DayTimeRangeEditor;
