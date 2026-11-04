import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import { AuthProvider, RequireAuth } from './auth/AuthContext';
import Login from './pages/Login';
import Setup from './pages/Setup';
import Users from './pages/Users';
import Calendar from './pages/Calendar';
import Archive from './pages/Archive';
import Certificates from './pages/Certificates';
import ImportPage from './pages/ImportPage';
import Leaves from './pages/Leaves';
import Orders from './pages/Orders';
import Payroll from './pages/Payroll';
import Dashboard from './pages/Dashboard';
import EmployeeProfile from './pages/EmployeeProfile';
import Employees from './pages/Employees';
import Settings from './pages/Settings';
import Structure from './pages/Structure';
import Timesheet from './pages/Timesheet';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
      <Routes>
        <Route path="setup" element={<Setup />} />
        <Route path="login" element={<Login />} />
        <Route element={<RequireAuth><Layout /></RequireAuth>}>
          <Route path="users" element={<RequireAuth roles={['superadmin']}><Users /></RequireAuth>} />
          <Route index element={<Dashboard />} />
          <Route path="employees" element={<Employees />} />
          <Route path="import" element={<ImportPage />} />
          <Route path="archive" element={<Archive />} />
          <Route path="orders" element={<Orders />} />
          <Route path="certificates" element={<Certificates />} />
          <Route path="payroll" element={<Payroll />} />
          <Route path="leaves" element={<Leaves />} />
          <Route path="calendar" element={<Calendar />} />
          <Route path="timesheet" element={<Timesheet />} />
          <Route path="structure" element={<Structure />} />
          <Route path="settings" element={<Settings />} />
          <Route path="employees/:id" element={<EmployeeProfile />} />
        </Route>
      </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
