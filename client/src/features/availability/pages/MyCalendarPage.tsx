import { useState, useEffect, useRef, useMemo } from 'react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MonthGrid } from '../components/MonthGrid';
import { DaySidePanel } from '../components/DaySidePanel';
import { useMonthNavigation } from '../hooks/useMonthNavigation';
import { useMyCalendar, useSaveOverride } from '../hooks/useAvailability';
import { useDebounce } from '../hooks/useDebounce';
import type { TimeRangeDto, CalendarDayDto } from '../api/availabilityApi';

export function MyCalendarPage() {
  const { currentMonth, currentYear, goNextMonth, goPrevMonth, canGoNext, canGoPrev } =
    useMonthNavigation();

  const yearMonth = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

  const { data: calendarDays } = useMyCalendar(yearMonth);
  const saveOverride = useSaveOverride();

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editingRanges, setEditingRanges] = useState<TimeRangeDto[]>([]);

  // Track initial ranges per day to avoid spurious saves
  const initialRangesRef = useRef<Map<string, TimeRangeDto[]>>(new Map());

  const dayData = useMemo<Record<string, CalendarDayDto>>(() => {
    if (!calendarDays) return {};
    return calendarDays.reduce(
      (acc, day) => {
        acc[day.date] = day;
        return acc;
      },
      {} as Record<string, CalendarDayDto>
    );
  }, [calendarDays]);

  const hasAnyAvailability = useMemo(() => {
    return calendarDays
      ? calendarDays.some((d) => d.ranges && d.ranges.length > 0)
      : true; // default to true (show grid) until loaded
  }, [calendarDays]);

  const selectedDateRef = useRef<string | null>(null);

  const debouncedRanges = useDebounce(editingRanges, 500);

  useEffect(() => {
    const date = selectedDateRef.current;
    if (!date) return;
    const initial = initialRangesRef.current.get(date);
    if (initial === undefined) return;
    if (JSON.stringify(debouncedRanges) !== JSON.stringify(initial)) {
      saveOverride.mutate({ date, items: debouncedRanges });
    }
  }, [debouncedRanges]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDayClick = (date: string) => {
    const ranges = dayData[date]?.ranges ?? [];
    selectedDateRef.current = date;
    setSelectedDate(date);
    setEditingRanges(ranges);
    if (!initialRangesRef.current.has(date)) {
      initialRangesRef.current.set(date, ranges);
    }
  };

  const handleClosePanel = () => {
    setSelectedDate(null);
    selectedDateRef.current = null;
  };

  const handleRangesChange = (ranges: TimeRangeDto[]) => {
    setEditingRanges(ranges);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">My Calendar</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={goPrevMonth}
            disabled={!canGoPrev}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-32 text-center">
            {format(new Date(currentYear, currentMonth), 'MMMM yyyy')}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={goNextMonth}
            disabled={!canGoNext}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Empty state CTA */}
      {calendarDays && !hasAnyAvailability ? (
        <div className="border rounded-lg p-8 text-center space-y-4">
          <p className="text-muted-foreground">
            You haven't set your weekly availability yet.
          </p>
          <Button asChild>
            <Link to="/settings/availability">Set up your availability</Link>
          </Button>
        </div>
      ) : (
        <MonthGrid
          year={currentYear}
          month={currentMonth}
          dayData={dayData}
          onDayClick={handleDayClick}
          readOnly={false}
        />
      )}

      {/* Side panel */}
      <DaySidePanel
        date={selectedDate}
        ranges={editingRanges}
        onRangesChange={handleRangesChange}
        onClose={handleClosePanel}
        readOnly={false}
      />
    </div>
  );
}

export default MyCalendarPage;
