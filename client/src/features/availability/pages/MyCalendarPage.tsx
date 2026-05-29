import { useState, useRef, useMemo } from 'react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MonthGrid } from '../components/MonthGrid';
import { DaySidePanel } from '../components/DaySidePanel';
import { CalendarLegend } from '../components/CalendarLegend';
import { useMonthNavigation } from '../hooks/useMonthNavigation';
import { useMyCalendar, useSaveOverride } from '../hooks/useAvailability';
import type { TimeRangeDto, CalendarDayDto } from '../api/availabilityApi';
import { useBookings } from '@/features/booking/hooks/useBookings';
import type { BookingDto } from '@/features/booking/api/bookingApi';

export function MyCalendarPage() {
  const { currentMonth, currentYear, goNextMonth, goPrevMonth, canGoNext, canGoPrev } =
    useMonthNavigation();

  const yearMonth = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

  const { data: calendarDays } = useMyCalendar(yearMonth);
  const saveOverride = useSaveOverride();
  const { data: bookingsData, refetch: refetchBookings } = useBookings();

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editingRanges, setEditingRanges] = useState<TimeRangeDto[]>([]);
  const [selectedIsOverride, setSelectedIsOverride] = useState(false);

  const selectedDateRef = useRef<string | null>(null);

  const dayData = useMemo<Record<string, CalendarDayDto>>(() => {
    if (!calendarDays) return {};
    return calendarDays.reduce(
      (acc, day) => { acc[day.date] = day; return acc; },
      {} as Record<string, CalendarDayDto>
    );
  }, [calendarDays]);

  const bookingsByDate = useMemo<Record<string, BookingDto[]>>(() => {
    const all = [
      ...(bookingsData?.incoming ?? []),
      ...(bookingsData?.myBookings ?? []),
      ...(bookingsData?.ownedConfirmed ?? []),
    ];
    return all.reduce((acc, b) => {
      if (!acc[b.date]) acc[b.date] = [];
      acc[b.date].push(b);
      return acc;
    }, {} as Record<string, BookingDto[]>);
  }, [bookingsData]);

  const hasAnyAvailability = useMemo(() => {
    return calendarDays ? calendarDays.some((d) => d.ranges && d.ranges.length > 0) : true;
  }, [calendarDays]);

  const handleDayClick = (date: string) => {
    selectedDateRef.current = date;
    setSelectedDate(date);
    setEditingRanges(dayData[date]?.ranges ?? []);
    setSelectedIsOverride(dayData[date]?.isOverride ?? false);
  };

  const handleClosePanel = () => {
    setSelectedDate(null);
    selectedDateRef.current = null;
    setSelectedIsOverride(false);
  };

  const handleResetToTemplate = () => {
    const date = selectedDateRef.current;
    if (!date) return;
    // Save empty override — full-replace with no items deletes all override rows for this date,
    // causing the calendar to fall back to the weekly routine template.
    saveOverride.mutate(
      { date, items: [] },
      { onSuccess: handleClosePanel }
    );
  };

  const handleSave = () => {
    const date = selectedDateRef.current;
    if (!date) return;
    saveOverride.mutate(
      { date, items: editingRanges },
      { onSuccess: handleClosePanel }
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">My Calendar</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon-sm" onClick={goPrevMonth} disabled={!canGoPrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-32 text-center">
            {format(new Date(currentYear, currentMonth), 'MMMM yyyy')}
          </span>
          <Button variant="outline" size="icon-sm" onClick={goNextMonth} disabled={!canGoNext}>
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
        <>
          <MonthGrid
            year={currentYear}
            month={currentMonth}
            dayData={dayData}
            onDayClick={handleDayClick}
            readOnly={false}
            bookings={Object.values(bookingsByDate).flat()}
          />
          <CalendarLegend />
        </>
      )}

      {/* Side panel */}
      <DaySidePanel
        date={selectedDate}
        ranges={editingRanges}
        onRangesChange={setEditingRanges}
        onClose={handleClosePanel}
        onSave={handleSave}
        onResetToTemplate={handleResetToTemplate}
        isOverride={selectedIsOverride}
        isSaving={saveOverride.isPending}
        readOnly={false}
        mode="owner"
        bookings={selectedDate ? (bookingsByDate[selectedDate] ?? []) : []}
        onBookingAction={() => refetchBookings()}
      />
    </div>
  );
}

export default MyCalendarPage;
