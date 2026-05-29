import { useState, useEffect } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { adminApi } from '../api/adminApi';
import { StatCard } from '../components/StatCard';
import { PaginationBar } from '../components/PaginationBar';

const PAGE_SIZE = 20;

const statusClasses: Record<string, string> = {
  Pending: 'bg-amber-100 border border-amber-300 text-amber-800 py-1 px-2 text-xs font-semibold',
  Confirmed:
    'bg-emerald-100 border border-emerald-400 text-emerald-800 py-1 px-2 text-xs font-semibold',
  Declined: 'bg-red-100 border border-red-300 text-red-700 py-1 px-2 text-xs font-semibold',
  Cancelled: 'bg-zinc-100 border border-zinc-300 text-zinc-500 py-1 px-2 text-xs font-semibold',
  Completed: 'bg-gray-100 border border-gray-300 text-gray-600 py-1 px-2 text-xs font-semibold',
};

// ---- Dashboard Tab ----
function DashboardTab() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => adminApi.getStats().then((r) => r.data),
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading...</p>;
  }

  if (isError) {
    return (
      <div>
        <p className="text-xl font-semibold">Could not load admin data.</p>
        <p className="text-sm text-muted-foreground">Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="flex gap-4">
      <StatCard label="Total users" value={data?.totalUsers ?? 0} />
      <StatCard label="Total bookings" value={data?.totalBookings ?? 0} />
    </div>
  );
}

// ---- Users Tab ----
function UsersTab() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  // Debounce search by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'users', page, PAGE_SIZE, search],
    queryFn: () => adminApi.getUsers({ page, pageSize: PAGE_SIZE, search: search || undefined }).then((r) => r.data),
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });

  return (
    <div>
      <Input
        placeholder="Search by email…"
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        className="mb-4 max-w-sm"
      />

      {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}

      {isError && (
        <div>
          <p className="text-xl font-semibold">Could not load admin data.</p>
          <p className="text-sm text-muted-foreground">Please try again later.</p>
        </div>
      )}

      {!isLoading && !isError && data && (
        <>
          {data.totalCount === 0 && !search && (
            <p className="text-sm text-muted-foreground">No users registered yet.</p>
          )}

          {data.items.length === 0 && search && (
            <div>
              <p className="text-xl font-semibold">No users found</p>
              <p className="text-sm text-muted-foreground">Try a different search term.</p>
            </div>
          )}

          {data.items.length > 0 && (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs font-semibold text-muted-foreground">Email</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground">Created At</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground">Admin</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground">Bookings</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="text-sm font-medium">{user.email}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {user.isAdmin ? (
                          <Badge variant="secondary">Admin</Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{user.bookingCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <PaginationBar
                page={page}
                pageSize={PAGE_SIZE}
                totalCount={data.totalCount}
                onPageChange={setPage}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}

// ---- Bookings Tab ----
function BookingsTab() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');

  const apiStatus = statusFilter === 'all' ? undefined : statusFilter;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'bookings', page, PAGE_SIZE, statusFilter],
    queryFn: () =>
      adminApi.getBookings({ page, pageSize: PAGE_SIZE, status: apiStatus }).then((r) => r.data),
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {['all', 'Pending', 'Confirmed', 'Declined', 'Cancelled'].map((s) => (
          <Button
            key={s}
            variant={statusFilter === s ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleStatusChange(s)}
          >
            {s === 'all' ? 'All' : s}
          </Button>
        ))}
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}

      {isError && (
        <div>
          <p className="text-xl font-semibold">Could not load admin data.</p>
          <p className="text-sm text-muted-foreground">Please try again later.</p>
        </div>
      )}

      {!isLoading && !isError && data && (
        <>
          {data.items.length === 0 && (
            <div>
              <p className="text-xl font-semibold">No bookings found.</p>
              <p className="text-sm text-muted-foreground">
                There are no bookings matching this filter.
              </p>
            </div>
          )}

          {data.items.length > 0 && (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs font-semibold text-muted-foreground">Status</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground">Owner</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground">Booker</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground">Date</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground">Time</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground">Meet Link</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell>
                        <Badge className={statusClasses[booking.status] ?? ''}>{booking.status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{booking.ownerEmail}</TableCell>
                      <TableCell className="text-sm">{booking.bookerEmail}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{booking.date}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {booking.startTime}–{booking.endTime}
                      </TableCell>
                      <TableCell>
                        {booking.meetUrl ? (
                          <a
                            href={booking.meetUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm text-primary underline"
                          >
                            Join
                          </a>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <PaginationBar
                page={page}
                pageSize={PAGE_SIZE}
                totalCount={data.totalCount}
                onPageChange={setPage}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}

// ---- Main AdminPage ----
export function AdminPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <h1 className="text-xl font-semibold mb-4">Admin</h1>
      <Tabs defaultValue="dashboard">
        <TabsList className="mb-4">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <DashboardTab />
        </TabsContent>

        <TabsContent value="users">
          <UsersTab />
        </TabsContent>

        <TabsContent value="bookings">
          <BookingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
