import { useAuth } from '@/features/auth/useAuth';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Calendar, Search, CalendarClock, CalendarCheck } from 'lucide-react';

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="border-b">
      <div className="flex items-center justify-between h-16 px-4 max-w-7xl mx-auto">
        <h1 className="text-lg font-semibold">Calendar Booking</h1>
        {user && (
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-1 text-sm hover:text-primary">
              <Calendar className="h-4 w-4" />
              My Calendar
            </Link>
            <Link to="/bookings" className="flex items-center gap-1 text-sm hover:text-primary">
              <CalendarCheck className="h-4 w-4" />
              Bookings
            </Link>
            <Link to="/users" className="flex items-center gap-1 text-sm hover:text-primary">
              <Search className="h-4 w-4" />
              Find People
            </Link>
            <Link to="/settings/availability" className="flex items-center gap-1 text-sm hover:text-primary">
              <CalendarClock className="h-4 w-4" />
              Set Routine
            </Link>
            <span className="text-sm text-muted-foreground">{user.email}</span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Sign Out
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
