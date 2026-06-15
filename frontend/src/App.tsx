import { AdminLayout } from './pages/AdminDashboard';
import { RegistrationPage } from './pages/RegistrationPage';

export function App() {
  if (location.pathname.startsWith('/register/')) return <RegistrationPage />;
  return <AdminLayout />;
}
