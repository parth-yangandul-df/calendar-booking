import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface BookingTimelineProps {
  availableSlots: Array<{ start: string; end: string }>;
  bookedSlots: Array<{ startTime: string; endTime: string; status: string }>;
  selectedDuration: number | null;
  selectedStartTime: string | null;
  onDurationChange: (minutes: number) => void;
  onStartTimeChange: (time: string) => void;
  isLoading: boolean;
}

function parseMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function addMinutesToTime(time: string, minutes: number): string {
  const total = parseMinutes(time) + minutes;
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function generateStartTimes(
  freeWindows: Array<{ start: string; end: string }>,
  durationMinutes: number
): string[] {
  const starts: string[] = [];
  for (const window of freeWindows) {
    let cursor = parseMinutes(window.start);
    const windowEnd = parseMinutes(window.end);
    while (cursor + durationMinutes <= windowEnd) {
      starts.push(`${String(Math.floor(cursor / 60)).padStart(2, '0')}:${String(cursor % 60).padStart(2, '0')}`);
      cursor += 15;
    }
  }
  return starts;
}

function statusClass(status: string): string {
  switch (status) {
    case 'Pending': return 'bg-amber-100 border border-amber-300 text-amber-800';
    case 'Confirmed': return 'bg-emerald-100 border border-emerald-400 text-emerald-800';
    default: return 'bg-zinc-100 border border-zinc-300 text-zinc-500';
  }
}

export function BookingTimeline({
  availableSlots,
  bookedSlots,
  selectedDuration,
  selectedStartTime,
  onDurationChange,
  onStartTimeChange,
  isLoading,
}: BookingTimelineProps) {
  const [customMinutes, setCustomMinutes] = useState('');
  const DURATION_OPTIONS = [
    { label: '30 min', value: 30 },
    { label: '1 hr', value: 60 },
    { label: '2 hr', value: 120 },
    { label: 'Custom', value: 0 },
  ];

  if (isLoading) {
    return <p className="text-sm text-muted-foreground mt-3">Loading availability...</p>;
  }

  const validStartTimes = selectedDuration && selectedDuration > 0
    ? generateStartTimes(availableSlots, selectedDuration)
    : [];

  return (
    <div className="mt-3">
      {/* Duration picker */}
      <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Duration</p>
      <div className="flex gap-1 flex-wrap mb-3">
        {DURATION_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            className={[
              'px-3 py-1.5 rounded text-xs font-medium border transition-colors',
              selectedDuration === opt.value
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-foreground hover:bg-muted',
            ].join(' ')}
            onClick={() => onDurationChange(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {selectedDuration === 0 && (
        <div className="mb-3">
          <input
            type="number"
            placeholder="e.g. 45"
            min={15}
            max={480}
            value={customMinutes}
            onChange={(e) => {
              setCustomMinutes(e.target.value);
              const n = parseInt(e.target.value, 10);
              if (!isNaN(n) && n >= 15) onDurationChange(n);
            }}
            className="border rounded px-2 py-1 text-sm w-24"
          />
          <span className="ml-2 text-xs text-muted-foreground">minutes</span>
        </div>
      )}

      {/* Timeline */}
      <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Available slots</p>

      {availableSlots.length === 0 && bookedSlots.length === 0 ? (
        <p className="text-sm text-muted-foreground">No available time on this day.</p>
      ) : (
        <div className="space-y-1">
          {/* Available free blocks */}
          {selectedDuration && selectedDuration > 0 ? (
            validStartTimes.length > 0 ? (
              validStartTimes.map((start) => {
                const end = addMinutesToTime(start, selectedDuration);
                return (
                  <div
                    key={start}
                    onClick={() => onStartTimeChange(start)}
                    className={[
                      'mt-1 rounded p-2 bg-white border border-dashed border-border cursor-pointer',
                      selectedStartTime === start ? 'ring-2 ring-primary' : '',
                    ].join(' ')}
                  >
                    <p className="text-xs font-semibold">Available</p>
                    <p className="text-[11px] text-muted-foreground">{start}–{end}</p>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground">No slots available for this duration.</p>
            )
          ) : (
            availableSlots.map((slot, i) => (
              <div key={i} className="mt-1 rounded p-2 bg-white border border-dashed border-border">
                <p className="text-xs font-semibold">Available</p>
                <p className="text-[11px] text-muted-foreground">{slot.start}–{slot.end}</p>
              </div>
            ))
          )}

          {/* Booked blocks */}
          {bookedSlots.map((slot, i) => (
            <div key={i} className={`mt-1 rounded p-2 ${statusClass(slot.status)}`}>
              <p className="text-xs font-semibold">{slot.status}</p>
              <p className="text-[11px] opacity-80">{slot.startTime}–{slot.endTime}</p>
            </div>
          ))}
        </div>
      )}

      {/* Request Booking button */}
      {selectedDuration && selectedStartTime ? null : (
        <p className="text-xs text-muted-foreground mt-2">
          {selectedDuration && selectedDuration > 0
            ? 'Select a start time to continue.'
            : 'Select a duration to see available times.'}
        </p>
      )}
    </div>
  );
}
