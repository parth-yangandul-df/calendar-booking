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

interface MonthGridProps {
  year: number;
  month: number; // 0-indexed
  dayData?: Record<string, CalendarDayDto>;
  onDayClick?: (date: string) => void;
  readOnly?: boolean;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function MonthGrid({
  year,
  month,
  dayData = {},
  onDayClick,
  readOnly = false,
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

          return (
            <div
              key={dateStr}
              className={cn(
                'min-h-24 border-r border-b p-1',
                !readOnly && !isCurrentMonth && 'opacity-40',
                !readOnly && isCurrentMonth && 'cursor-pointer hover:bg-accent',
                today && 'ring-2 ring-primary ring-inset',
                readOnly && 'cursor-default'
              )}
              onClick={() => {
                if (!readOnly && isCurrentMonth) {
                  onDayClick?.(dateStr);
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

              {/* Availability bars */}
              {dayInfo?.ranges?.map((range, i) => (
                <div
                  key={i}
                  className={cn(
                    'mt-0.5 h-1.5 rounded-full',
                    readOnly ? 'bg-blue-400' : 'bg-green-500'
                  )}
                  title={`${range.start} - ${range.end}`}
                />
              ))}

              {/* Override indicator */}
              {dayInfo?.isOverride && (
                <span className="block text-[10px] text-orange-500 mt-0.5">
                  override
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default MonthGrid;
