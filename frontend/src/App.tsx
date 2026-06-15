import { AdminDashboard } from './pages/AdminDashboard';
import { RegistrationPage } from './pages/RegistrationPage';

export function App() {
  return location.pathname.startsWith('/register/') ? <RegistrationPage /> : <AdminDashboard />;
}
