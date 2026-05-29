import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MonthGrid } from '../components/MonthGrid';
import { DaySidePanel } from '../components/DaySidePanel';
import { CalendarLegend } from '../components/CalendarLegend';
import { useMonthNavigation } from '../hooks/useMonthNavigation';
import { useUserCalendar } from '../hooks/useAvailability';
import { useBookings } from '@/features/booking/hooks/useBookings';
import { userApi } from '../api/userApi';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { CalendarDayDto } from '../api/availabilityApi';
import type { BookingDto } from '@/features/booking/api/bookingApi';

export function UserCalendarPage() {
  const { userId } = useParams<{ userId: string }>();
  const { currentMonth, currentYear, goNextMonth, goPrevMonth, canGoNext, canGoPrev } =
    useMonthNavigation();

  const yearMonth = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

  const { data: calendarDays, isLoading, isError } = useUserCalendar(userId ?? '', yearMonth);

  const { data: userInfo } = useQuery({
    queryKey: ['users', userId],
    queryFn: () => userApi.getUser(userId!).then((r) => r.data),
    enabled: !!userId,
  });

  const queryClient = useQueryClient();

  const { data: bookingsData } = useBookings();

  const [selectedDate, setSelectedDate] = useState<string | null>(null);

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

  const bookings = useMemo<BookingDto[]>(() => {
    if (!bookingsData || !userId) return [];
    return (bookingsData.myBookings ?? []).filter((b) => b.ownerId === userId);
  }, [bookingsData, userId]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Back link */}
      <div className="mb-4">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to my calendar
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">
          {userInfo ? `${userInfo.email}'s availability` : 'Loading calendar...'}
        </h1>
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

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading calendar...</p>
      ) : isError ? (
        <p className="text-sm text-destructive">Could not load this user's availability.</p>
      ) : (
        <>
          <MonthGrid
            year={currentYear}
            month={currentMonth}
            dayData={dayData}
            readOnly={true}
            onReadOnlyDayClick={setSelectedDate}
            bookings={bookings}
          />
          <CalendarLegend />
        </>
      )}

      {/* Booker side panel */}
      <DaySidePanel
        date={selectedDate}
        ranges={selectedDate ? (dayData[selectedDate]?.ranges ?? []) : []}
        onRangesChange={() => {}}
        onClose={() => setSelectedDate(null)}
        onSave={() => {}}
        readOnly={true}
        mode="booker"
        ownerId={userId}
        ownerEmail={userInfo?.email}
        onBookingAction={() => {
          queryClient.invalidateQueries({ queryKey: ['bookings'] });
          queryClient.invalidateQueries({ queryKey: ['availability', 'calendar', userId, yearMonth] });
        }}
      />
    </div>
  );
}

export default UserCalendarPage;
