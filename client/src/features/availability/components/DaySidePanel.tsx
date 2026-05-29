import { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { X } from 'lucide-react';
import { DayTimeRangeEditor } from './DayTimeRangeEditor';
import type { TimeRangeDto } from '../api/availabilityApi';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { BookingDto } from '@/features/booking/api/bookingApi';
import { useAcceptBooking, useDeclineBooking, useCancelBooking, useCreateBooking, useAvailableSlots } from '@/features/booking/hooks/useBookings';
import { BookingTimeline } from '@/features/booking/components/BookingTimeline';
import { BookingConfirmDialog } from '@/features/booking/components/BookingConfirmDialog';

interface DaySidePanelProps {
  date: string | null;
  ranges: TimeRangeDto[];
  onRangesChange: (ranges: TimeRangeDto[]) => void;
  onClose: () => void;
  onSave: () => void;
  onResetToTemplate?: () => void;
  isOverride?: boolean;
  isSaving?: boolean;
  readOnly?: boolean;
  mode?: 'owner' | 'booker' | 'read-only';
  bookings?: BookingDto[];
  ownerId?: string;
  ownerEmail?: string;
  onBookingAction?: () => void;
}

export function DaySidePanel({
  date,
  ranges,
  onRangesChange,
  onClose,
  onSave,
  onResetToTemplate,
  isOverride = false,
  isSaving = false,
  readOnly = false,
  mode,
  bookings = [],
  ownerId,
  ownerEmail,
  onBookingAction,
}: DaySidePanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
  const [selectedStartTime, setSelectedStartTime] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);

  const acceptMutation = useAcceptBooking();
  const declineMutation = useDeclineBooking();
  const cancelMutation = useCancelBooking();
  const createBookingMutation = useCreateBooking();

  const { data: slotsData, isLoading: slotsLoading } = useAvailableSlots(
    mode === 'booker' ? ownerId : undefined,
    mode === 'booker' ? date : null
  );

  // Reset booking state when date changes
  useEffect(() => {
    setSelectedDuration(null);
    setSelectedStartTime(null);
    setDialogOpen(false);
    setCancelConfirmId(null);
  }, [date]);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (date) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [date, onClose]);

  const formattedDate = date
    ? format(new Date(date + 'T00:00:00'), 'EEEE, MMMM d, yyyy')
    : '';

  return (
    <>
      {/* Invisible click-outside backdrop — no dark overlay */}
      {date && (
        <div
          className="fixed inset-0 z-40"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Slide-in panel */}
      <div
        ref={panelRef}
        style={{ backgroundColor: 'var(--background, white)' }}
        className={[
          'fixed top-0 right-0 h-full w-80 z-50',
          'bg-background border-l shadow-2xl',
          'flex flex-col',
          'transition-transform duration-300 ease-in-out',
          date ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">
              {readOnly ? 'Availability' : 'Edit availability'}
            </p>
            <h2 className="text-base font-semibold text-foreground leading-tight">
              {formattedDate}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors mt-0.5"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          <DayTimeRangeEditor
            ranges={ranges}
            onChange={onRangesChange}
            readOnly={readOnly}
          />

          {/* Owner mode: show bookings for this day */}
          {mode === 'owner' && bookings.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Bookings on this day
              </p>
              <div className="space-y-2">
                {bookings.map((booking) => {
                  const statusClass =
                    booking.status === 'Pending'
                      ? 'bg-amber-100 border border-amber-300 text-amber-800'
                      : booking.status === 'Confirmed'
                        ? 'bg-emerald-100 border border-emerald-400 text-emerald-800'
                        : booking.status === 'Completed'
                          ? 'bg-gray-100 border border-gray-300 text-gray-600'
                          : 'bg-zinc-100 border border-zinc-300 text-zinc-500';

                  return (
                    <div key={booking.id} className={`rounded p-3 ${statusClass}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold">{booking.bookerEmail}</span>
                        <Badge className={`${statusClass} py-0.5 px-1.5 text-[10px]`}>
                          {booking.status}
                        </Badge>
                      </div>
                      <p className="text-[11px]">{booking.startTime}–{booking.endTime}</p>

                      {booking.status === 'Pending' && (
                        <div className="flex gap-1 mt-2">
                          <Button
                            size="sm"
                            variant="default"
                            className="min-h-[44px] flex-1 text-xs"
                            onClick={() => {
                              acceptMutation.mutate(booking.id, { onSuccess: () => onBookingAction?.() });
                            }}
                            disabled={acceptMutation.isPending || declineMutation.isPending}
                          >
                            Accept Booking
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-destructive text-destructive hover:bg-destructive/10 min-h-[44px] flex-1 text-xs"
                            onClick={() => {
                              declineMutation.mutate(booking.id, { onSuccess: () => onBookingAction?.() });
                            }}
                            disabled={acceptMutation.isPending || declineMutation.isPending}
                          >
                            Decline Booking
                          </Button>
                        </div>
                      )}

                      {booking.status === 'Confirmed' && (
                        <div className="mt-2">
                          {cancelConfirmId === booking.id ? (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="destructive"
                                className="min-h-[44px] flex-1 text-xs"
                                onClick={() => {
                                  cancelMutation.mutate(booking.id, { onSuccess: () => { onBookingAction?.(); setCancelConfirmId(null); } });
                                }}
                              >
                                Yes, cancel it
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="min-h-[44px] flex-1 text-xs"
                                onClick={() => setCancelConfirmId(null)}
                              >
                                Keep it
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-destructive text-destructive hover:bg-destructive/10 min-h-[44px] w-full text-xs"
                              onClick={() => setCancelConfirmId(booking.id)}
                            >
                              Cancel Booking
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Booker mode: show booking timeline + request button */}
          {mode === 'booker' && (
            <div className="mt-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                Book a slot
              </p>
              <BookingTimeline
                availableSlots={slotsData?.availableSlots ?? []}
                bookedSlots={slotsData?.bookedSlots ?? []}
                selectedDuration={selectedDuration}
                selectedStartTime={selectedStartTime}
                onDurationChange={setSelectedDuration}
                onStartTimeChange={setSelectedStartTime}
                isLoading={slotsLoading}
              />
              <Button
                variant="default"
                className="w-full mt-3"
                disabled={!selectedDuration || !selectedStartTime}
                onClick={() => setDialogOpen(true)}
              >
                Request Booking
              </Button>

              {date && selectedStartTime && selectedDuration && (
                <BookingConfirmDialog
                  open={dialogOpen}
                  onOpenChange={setDialogOpen}
                  ownerName={ownerEmail ?? 'this person'}
                  date={date}
                  startTime={selectedStartTime}
                  endTime={(() => {
                    const [h, m] = selectedStartTime.split(':').map(Number);
                    const total = h * 60 + m + selectedDuration;
                    return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
                  })()}
                  onConfirm={() => {
                    if (!ownerId || !date || !selectedStartTime || !selectedDuration) return;
                    const [h, m] = selectedStartTime.split(':').map(Number);
                    const total = h * 60 + m + selectedDuration;
                    const endTime = `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
                    createBookingMutation.mutate(
                      { ownerId, date, startTime: selectedStartTime, endTime },
                      {
                        onSuccess: () => {
                          setDialogOpen(false);
                          onBookingAction?.();
                        },
                      }
                    );
                  }}
                  isSubmitting={createBookingMutation.isPending}
                />
              )}
            </div>
          )}
        </div>

        {/* Footer with Save button */}
        {!readOnly && (
          <div className="p-4 border-t bg-background space-y-2">
            {isOverride && onResetToTemplate && (
              <button
                onClick={onResetToTemplate}
                disabled={isSaving}
                className="w-full py-2 rounded-md text-sm font-medium transition-colors border border-destructive text-destructive hover:bg-destructive/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Reset to routine
              </button>
            )}
            <button
              onClick={onSave}
              disabled={isSaving}
              className={[
                'w-full py-2 rounded-md text-sm font-medium transition-colors',
                'bg-primary text-primary-foreground',
                'hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed',
              ].join(' ')}
            >
              {isSaving ? 'Saving…' : 'Save'}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

export default DaySidePanel;

