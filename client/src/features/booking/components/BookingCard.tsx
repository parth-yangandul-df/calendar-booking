import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { BookingDto } from '../api/bookingApi';

interface BookingCardProps {
  booking: BookingDto;
}

function statusBadgeClass(status: BookingDto['status']): string {
  switch (status) {
    case 'Pending':
      return 'bg-amber-100 border border-amber-300 text-amber-800 py-1 px-2 text-xs font-semibold';
    case 'Confirmed':
      return 'bg-emerald-100 border border-emerald-400 text-emerald-800 py-1 px-2 text-xs font-semibold';
    case 'Declined':
      return 'bg-red-100 border border-red-300 text-red-700 py-1 px-2 text-xs font-semibold';
    case 'Cancelled':
      return 'bg-zinc-100 border border-zinc-300 text-zinc-500 py-1 px-2 text-xs font-semibold';
    case 'Completed':
      return 'bg-gray-100 border border-gray-300 text-gray-600 py-1 px-2 text-xs font-semibold';
    default:
      return 'py-1 px-2 text-xs font-semibold';
  }
}

export function BookingCard({ booking }: BookingCardProps) {
  return (
    <Card>
      <CardContent className="p-3 flex items-center gap-3">
        <Badge className={statusBadgeClass(booking.status)}>{booking.status}</Badge>
        <div className="flex-1 text-sm">
          <div className="font-medium">{booking.date}</div>
          <div className="text-muted-foreground">
            {booking.startTime}–{booking.endTime}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
