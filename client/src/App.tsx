import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/features/auth/AuthContext';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Navbar } from '@/components/layout/Navbar';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { RegisterPage } from '@/features/auth/pages/RegisterPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { MyCalendarPage } from '@/features/availability/pages/MyCalendarPage';
import { TemplateSetupPage } from '@/features/availability/pages/TemplateSetupPage';
import { UserDirectoryPage } from '@/features/availability/pages/UserDirectoryPage';
import { UserCalendarPage } from '@/features/availability/pages/UserCalendarPage';
import { BookingsPage } from '@/features/booking/pages/BookingsPage';

const queryClient = new QueryClient();

function AppLayout() {
  return (
    <>
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<MyCalendarPage />} />
          <Route path="/settings/availability" element={<TemplateSetupPage />} />
          <Route path="/users" element={<UserDirectoryPage />} />
          <Route path="/users/:userId" element={<UserCalendarPage />} />
          <Route path="/bookings" element={<BookingsPage />} />
        </Routes>
      </main>
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Toaster position="top-right" richColors />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/*" element={<AppLayout />} />
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
