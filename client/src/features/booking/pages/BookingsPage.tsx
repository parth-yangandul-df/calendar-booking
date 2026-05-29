import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useBookings, useCancelBooking } from '../hooks/useBookings';
import { IncomingTab } from '../components/IncomingTab';
import { MyBookingsTab } from '../components/MyBookingsTab';
import { useState } from 'react';
import type { BookingDto } from '../api/bookingApi';

function StatusBadge({ status }: { status: BookingDto['status'] }) {
  const classes: Record<BookingDto['status'], string> = {
    Pending: 'bg-amber-100 border border-amber-300 text-amber-800 py-1 px-2 text-xs font-semibold',
    Confirmed: 'bg-emerald-100 border border-emerald-400 text-emerald-800 py-1 px-2 text-xs font-semibold',
    Declined: 'bg-red-100 border border-red-300 text-red-700 py-1 px-2 text-xs font-semibold',
    Cancelled: 'bg-zinc-100 border border-zinc-300 text-zinc-500 py-1 px-2 text-xs font-semibold',
    Completed: 'bg-gray-100 border border-gray-300 text-gray-600 py-1 px-2 text-xs font-semibold',
  };
  return <Badge className={classes[status]}>{status}</Badge>;
}

function ConfirmedTab({ bookings }: { bookings: BookingDto[] }) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const cancelMutation = useCancelBooking();

  if (bookings.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-base font-medium text-foreground mb-1">No confirmed bookings</h3>
        <p className="text-sm text-muted-foreground">
          When you accept a booking request, it will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {bookings.map((booking) => (
        <div key={booking.id} className="flex items-center justify-between p-3 border rounded-lg">
          <div className="flex items-center gap-3">
            <StatusBadge status={booking.status} />
            <div className="text-sm">
              <div className="font-medium">{booking.bookerEmail}</div>
              <div className="text-muted-foreground">
                {booking.date} · {booking.startTime}–{booking.endTime}
              </div>
              {booking.meetUrl && (
                <a
                  href={booking.meetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-primary underline"
                >
                  Join meeting
                </a>
              )}
            </div>
          </div>

          {booking.status === 'Confirmed' && (
            <div className="flex items-center gap-2">
              {confirmingId === booking.id ? (
                <>
                  <Button
                    variant="destructive"
                    className="min-h-[44px]"
                    onClick={() => {
                      cancelMutation.mutate(booking.id);
                      setConfirmingId(null);
                    }}
                    disabled={cancelMutation.isPending}
                  >
                    Yes, cancel it
                  </Button>
                  <Button
                    variant="ghost"
                    className="min-h-[44px]"
                    onClick={() => setConfirmingId(null)}
                  >
                    Keep it
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  className="border-destructive text-destructive hover:bg-destructive/10 min-h-[44px]"
                  onClick={() => setConfirmingId(booking.id)}
                >
                  Cancel Booking
                </Button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function BookingsPage() {
  const { data, isLoading, isError } = useBookings();

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6">
        <p className="text-sm text-destructive">Could not load bookings.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-xl font-semibold mb-4">Bookings</h1>
      <Tabs defaultValue="incoming">
        <TabsList className="mb-4">
          <TabsTrigger value="incoming">Incoming</TabsTrigger>
          <TabsTrigger value="my-bookings">My Bookings</TabsTrigger>
          <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
        </TabsList>
        <TabsContent value="incoming">
          <IncomingTab bookings={data?.incoming ?? []} />
        </TabsContent>
        <TabsContent value="my-bookings">
          <MyBookingsTab bookings={data?.myBookings ?? []} />
        </TabsContent>
        <TabsContent value="confirmed">
          <ConfirmedTab bookings={data?.ownedConfirmed ?? []} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
