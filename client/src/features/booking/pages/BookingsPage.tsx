import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useBookings } from '../hooks/useBookings';
import { IncomingTab } from '../components/IncomingTab';
import { MyBookingsTab } from '../components/MyBookingsTab';

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
        </TabsList>
        <TabsContent value="incoming">
          <IncomingTab bookings={data?.incoming ?? []} />
        </TabsContent>
        <TabsContent value="my-bookings">
          <MyBookingsTab bookings={data?.myBookings ?? []} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
