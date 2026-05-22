import { useAuth } from '../useAuth';

export function DashboardPage() {
  const { user } = useAuth();
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h2 className="text-2xl font-semibold mb-4">Dashboard</h2>
      <p className="text-muted-foreground">
        Welcome, {user?.email ?? 'User'}. You are logged in.
      </p>
    </div>
  );
}
