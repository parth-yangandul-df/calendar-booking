import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAcceptBooking, useDeclineBooking } from '../hooks/useBookings';
import type { BookingDto } from '../api/bookingApi';

interface IncomingTabProps {
  bookings: BookingDto[];
}

export function IncomingTab({ bookings }: IncomingTabProps) {
  const acceptMutation = useAcceptBooking();
  const declineMutation = useDeclineBooking();

  if (bookings.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-base font-medium text-foreground mb-1">No pending requests</h3>
        <p className="text-sm text-muted-foreground">
          When someone requests a booking on your calendar, it will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {bookings.map((booking) => (
        <div key={booking.id} className="flex items-center justify-between p-3 border rounded-lg">
          <div className="flex items-center gap-3">
            <Badge className="bg-amber-100 border border-amber-300 text-amber-800 py-1 px-2 text-xs font-semibold">
              Pending
            </Badge>
            <div className="text-sm">
              <div className="font-medium">{booking.bookerEmail}</div>
              <div className="text-muted-foreground">
                {booking.date} · {booking.startTime}–{booking.endTime}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              className="min-h-[44px]"
              onClick={() => acceptMutation.mutate(booking.id)}
              disabled={acceptMutation.isPending || declineMutation.isPending}
            >
              Accept Booking
            </Button>
            <Button
              variant="outline"
              className="border-destructive text-destructive hover:bg-destructive/10 min-h-[44px]"
              onClick={() => declineMutation.mutate(booking.id)}
              disabled={acceptMutation.isPending || declineMutation.isPending}
            >
              Decline Booking
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
