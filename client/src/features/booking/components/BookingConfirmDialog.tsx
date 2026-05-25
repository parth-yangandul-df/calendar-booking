import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface BookingConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ownerName: string;
  date: string; // yyyy-MM-dd
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  onConfirm: () => void;
  isSubmitting: boolean;
}

export function BookingConfirmDialog({
  open,
  onOpenChange,
  ownerName,
  date,
  startTime,
  endTime,
  onConfirm,
  isSubmitting,
}: BookingConfirmDialogProps) {
  const formattedDate = format(new Date(date + 'T00:00:00'), 'EEEE, MMMM d, yyyy');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm your booking</DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <p className="text-sm">
            Book <strong>{startTime}–{endTime}</strong> with <strong>{ownerName}</strong> on{' '}
            <strong>{formattedDate}</strong>?
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Your request will be sent for approval.
          </p>
        </div>
        <DialogFooter className="flex flex-col gap-2">
          <Button
            variant="default"
            className="w-full"
            disabled={isSubmitting}
            onClick={onConfirm}
          >
            {isSubmitting ? (
              <>
                <span className="mr-2 animate-spin">◌</span>
                Sending…
              </>
            ) : (
              'Request Booking'
            )}
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Keep this time
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
