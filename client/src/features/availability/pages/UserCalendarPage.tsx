import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MonthGrid } from '../components/MonthGrid';
import { useMonthNavigation } from '../hooks/useMonthNavigation';
import { useUserCalendar } from '../hooks/useAvailability';
import { userApi } from '../api/userApi';
import { useQuery } from '@tanstack/react-query';
import type { CalendarDayDto } from '../api/availabilityApi';

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
        <MonthGrid
          year={currentYear}
          month={currentMonth}
          dayData={dayData}
          readOnly={true}
        />
      )}
    </div>
  );
}

export default UserCalendarPage;
