import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { TimeRangeDto } from '../api/availabilityApi';

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
  const handleStartChange = (index: number, value: string) => {
    const updated = ranges.map((r, i) => (i === index ? { ...r, start: value } : r));
    onChange(updated);
  };

  const handleEndChange = (index: number, value: string) => {
    const updated = ranges.map((r, i) => (i === index ? { ...r, end: value } : r));
    onChange(updated);
  };

  const handleRemove = (index: number) => {
    onChange(ranges.filter((_, i) => i !== index));
  };

  const handleAdd = () => {
    onChange([...ranges, { start: '09:00', end: '17:00' }]);
  };

  const isInvalid = (range: TimeRangeDto) => {
    const [sh, sm] = range.start.split(':').map(Number);
    const [eh, em] = range.end.split(':').map(Number);
    return sh * 60 + sm >= eh * 60 + em;
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
    <div className="space-y-2">
      {ranges.map((range, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            type="time"
            value={range.start}
            onChange={(e) => handleStartChange(i, e.target.value)}
            className={cn('flex-1', isInvalid(range) && 'border-destructive')}
          />
          <span className="text-muted-foreground text-sm">–</span>
          <Input
            type="time"
            value={range.end}
            onChange={(e) => handleEndChange(i, e.target.value)}
            className={cn('flex-1', isInvalid(range) && 'border-destructive')}
          />
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => handleRemove(i)}
            type="button"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
          {isInvalid(range) && (
            <span className="text-[11px] text-destructive ml-1">End must be after start</span>
          )}
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={handleAdd} type="button">
        <Plus className="h-3.5 w-3.5 mr-1" />
        Add time range
      </Button>
    </div>
  );
}

export default DayTimeRangeEditor;
