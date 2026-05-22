import { useAuth } from '@/features/auth/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

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
