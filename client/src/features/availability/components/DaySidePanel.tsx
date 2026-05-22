import { format } from 'date-fns';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { DayTimeRangeEditor } from './DayTimeRangeEditor';
import type { TimeRangeDto } from '../api/availabilityApi';

interface DaySidePanelProps {
  date: string | null; // null = panel closed
  ranges: TimeRangeDto[];
  onRangesChange: (ranges: TimeRangeDto[]) => void;
  onClose: () => void;
  readOnly?: boolean;
}

export function DaySidePanel({
  date,
  ranges,
  onRangesChange,
  onClose,
  readOnly = false,
}: DaySidePanelProps) {
  const formattedDate = date
    ? format(new Date(date + 'T00:00:00'), 'EEEE, MMMM d, yyyy')
    : '';

  return (
    <Sheet open={date !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="right" className="bg-background text-foreground">
        <SheetHeader className="mb-4">
          <SheetTitle>{formattedDate}</SheetTitle>
          <SheetDescription>
            {readOnly
              ? "This user's availability for this day"
              : 'Edit your availability for this day'}
          </SheetDescription>
        </SheetHeader>

        <DayTimeRangeEditor
          ranges={ranges}
          onChange={onRangesChange}
          readOnly={readOnly}
        />
      </SheetContent>
    </Sheet>
  );
}

export default DaySidePanel;
