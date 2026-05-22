import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DayTimeRangeEditor } from '../components/DayTimeRangeEditor';
import { useSaveTemplate } from '../hooks/useAvailability';
import { availabilityApi } from '../api/availabilityApi';
import type { TimeRangeDto } from '../api/availabilityApi';

const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

type DayName = (typeof DAYS_OF_WEEK)[number];

export function TemplateSetupPage() {
  const [enabledDays, setEnabledDays] = useState<Record<DayName, boolean>>({
    Monday: false,
    Tuesday: false,
    Wednesday: false,
    Thursday: false,
    Friday: false,
    Saturday: false,
    Sunday: false,
  });

  const [dayRanges, setDayRanges] = useState<Record<DayName, TimeRangeDto[]>>({
    Monday: [{ start: '09:00', end: '17:00' }],
    Tuesday: [{ start: '09:00', end: '17:00' }],
    Wednesday: [{ start: '09:00', end: '17:00' }],
    Thursday: [{ start: '09:00', end: '17:00' }],
    Friday: [{ start: '09:00', end: '17:00' }],
    Saturday: [],
    Sunday: [],
  });

  const saveTemplate = useSaveTemplate();

  // Load existing template on mount
  useEffect(() => {
    availabilityApi.getTemplate().then((res) => {
      const items = res.data;
      if (items.length === 0) return;
      const newEnabled = { ...enabledDays };
      const newRanges = { ...dayRanges };
      // Group items by day
      const byDay = items.reduce(
        (acc, item) => {
          const day = item.dayOfWeek as DayName;
          if (!acc[day]) acc[day] = [];
          acc[day].push({ start: item.start, end: item.end });
          return acc;
        },
        {} as Record<DayName, TimeRangeDto[]>
      );
      for (const day of DAYS_OF_WEEK) {
        if (byDay[day] && byDay[day].length > 0) {
          newEnabled[day] = true;
          newRanges[day] = byDay[day];
        }
      }
      setEnabledDays(newEnabled);
      setDayRanges(newRanges);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggleDay = (day: DayName) => {
    setEnabledDays((prev) => ({ ...prev, [day]: !prev[day] }));
  };

  const handleRangesChange = (day: DayName, ranges: TimeRangeDto[]) => {
    setDayRanges((prev) => ({ ...prev, [day]: ranges }));
  };

  const handleSave = () => {
    const items = DAYS_OF_WEEK.filter((day) => enabledDays[day])
      .flatMap((day) =>
        dayRanges[day].map((range) => ({
          dayOfWeek: day,
          start: range.start,
          end: range.end,
        }))
      );
    saveTemplate.mutate({ items });
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="mb-6">
        <Link
          to="/"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to My Calendar
        </Link>
      </div>

      <h1 className="text-2xl font-semibold mb-1">Weekly Availability Template</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Set your recurring weekly availability. Days you leave empty will be
        unavailable.
      </p>

      <div className="space-y-3">
        {DAYS_OF_WEEK.map((day) => (
          <Card key={day} className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <input
                type="checkbox"
                id={`day-${day}`}
                checked={enabledDays[day]}
                onChange={() => handleToggleDay(day)}
                className="h-4 w-4 cursor-pointer"
              />
              <label
                htmlFor={`day-${day}`}
                className="text-sm font-medium cursor-pointer"
              >
                {day}
              </label>
            </div>
            {enabledDays[day] && (
              <div className="ml-7">
                <DayTimeRangeEditor
                  ranges={dayRanges[day]}
                  onChange={(ranges) => handleRangesChange(day, ranges)}
                />
              </div>
            )}
          </Card>
        ))}
      </div>

      <div className="mt-6">
        <Button onClick={handleSave} disabled={saveTemplate.isPending}>
          {saveTemplate.isPending ? 'Saving...' : 'Save Template'}
        </Button>
      </div>
    </div>
  );
}

export default TemplateSetupPage;
