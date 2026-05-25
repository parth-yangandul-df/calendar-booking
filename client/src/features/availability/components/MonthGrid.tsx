import { useMemo } from 'react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
} from 'date-fns';
import { cn } from '@/lib/utils';
import type { CalendarDayDto } from '../api/availabilityApi';
import type { BookingDto } from '@/features/booking/api/bookingApi';

interface MonthGridProps {
  year: number;
  month: number; // 0-indexed
  dayData?: Record<string, CalendarDayDto>;
  onDayClick?: (date: string) => void;
  onReadOnlyDayClick?: (date: string) => void;
  readOnly?: boolean;
  bookings?: BookingDto[];
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function MonthGrid({
  year,
  month,
  dayData = {},
  onDayClick,
  onReadOnlyDayClick,
  readOnly = false,
  bookings = [],
}: MonthGridProps) {
  const gridDays = useMemo(() => {
    const monthStart = startOfMonth(new Date(year, month));
    const monthEnd = endOfMonth(monthStart);
    const start = startOfWeek(monthStart);
    const end = endOfWeek(monthEnd);
    return eachDayOfInterval({ start, end });
  }, [year, month]);

  return (
    <div>
      {/* Day names header */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_NAMES.map((name) => (
          <div
            key={name}
            className="text-center text-sm font-medium text-muted-foreground py-2"
          >
            {name}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 border-l border-t">
        {gridDays.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const isCurrentMonth = isSameMonth(day, new Date(year, month));
          const today = isToday(day);
          const dayInfo = dayData[dateStr];
          const dayBookings = bookings.filter((b) => b.date === dateStr);

          return (
            <div
              key={dateStr}
              className={cn(
                'min-h-24 border-r border-b p-1',
                !readOnly && !isCurrentMonth && 'opacity-40',
                !readOnly && isCurrentMonth && 'cursor-pointer hover:bg-accent',
                today && 'ring-2 ring-primary ring-inset',
                readOnly && onReadOnlyDayClick && 'cursor-pointer hover:bg-accent',
                readOnly && !onReadOnlyDayClick && 'cursor-default'
              )}
              onClick={() => {
                if (!readOnly && isCurrentMonth) {
                  onDayClick?.(dateStr);
                } else if (readOnly) {
                  onReadOnlyDayClick?.(dateStr);
                }
              }}
            >
              <span
                className={cn(
                  'text-sm block',
                  today ? 'font-bold text-primary' : 'font-medium',
                  !isCurrentMonth && 'text-muted-foreground'
                )}
              >
                {format(day, 'd')}
              </span>

              {/* Teams-style time range blocks */}
              {dayInfo?.ranges?.map((range, i) => (
                <div
                  key={i}
                  className={cn(
                    'mt-1 rounded px-1 py-0.5',
                    dayInfo.isOverride
                      ? 'bg-orange-100 border border-orange-300 text-orange-800'
                      : readOnly
                        ? 'bg-blue-100 border border-blue-300 text-blue-800'
                        : 'bg-green-100 border border-green-300 text-green-800'
                  )}
                >
                  <p className="text-[10px] font-semibold leading-tight truncate">
                    Available
                  </p>
                  <p className="text-[9px] leading-tight truncate opacity-80">
                    {range.start} – {range.end}
                  </p>
                </div>
              ))}

              {/* Booking blocks */}
              {dayBookings.map((booking) => {
                if (readOnly) {
                  // Read-only calendar (someone else's): show zinc "Unavailable"
                  return (
                    <div
                      key={booking.id}
                      title={`Unavailable: ${booking.startTime}–${booking.endTime}`}
                      className="mt-1 rounded px-1 py-0.5 bg-zinc-100 border border-zinc-300 text-zinc-500"
                    >
                      <p className="text-[10px] font-semibold leading-tight truncate">Unavailable</p>
                      <p className="text-[9px] leading-tight truncate opacity-80">
                        {booking.startTime}–{booking.endTime}
                      </p>
                    </div>
                  );
                }
                // Own calendar: show status colors
                const blockClass =
                  booking.status === 'Pending'
                    ? 'bg-amber-100 border border-amber-300 text-amber-800'
                    : booking.status === 'Confirmed'
                      ? 'bg-emerald-100 border border-emerald-400 text-emerald-800'
                      : 'bg-zinc-100 border border-zinc-300 text-zinc-500';
                return (
                  <div
                    key={booking.id}
                    title={`${booking.status}: ${booking.startTime}–${booking.endTime} with ${booking.bookerEmail}`}
                    className={`mt-1 rounded px-1 py-0.5 ${blockClass}`}
                  >
                    <p className="text-[10px] font-semibold leading-tight truncate">{booking.status}</p>
                    <p className="text-[9px] leading-tight truncate opacity-80">
                      {booking.startTime}–{booking.endTime}
                    </p>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default MonthGrid;
