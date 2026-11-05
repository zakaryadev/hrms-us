import { Suspense, lazy } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Loading } from './components/ui';

// recharts фақат бош саҳифага керак: алоҳида бўлак сифатида юкланади
const Dashboard = lazy(() => import('./pages/Dashboard'));
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
import EmployeeProfile from './pages/EmployeeProfile';
import Employees from './pages/Employees';
import Settings from './pages/Settings';
import Structure from './pages/Structure';
import AuditLog from './pages/AuditLog';
import Translit from './pages/Translit';
import Templates from './pages/Templates';
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
          <Route index element={<Suspense fallback={<Loading rows={6} />}><Dashboard /></Suspense>} />
          <Route path="employees" element={<Employees />} />
          <Route path="import" element={<RequireAuth roles={['superadmin', 'kadrlar']}><ImportPage /></RequireAuth>} />
          <Route path="archive" element={<Archive />} />
          <Route path="orders" element={<Orders />} />
          <Route path="audit" element={<RequireAuth roles={['superadmin']}><AuditLog /></RequireAuth>} />
          <Route path="translit" element={<Translit />} />
          <Route path="templates" element={<Templates />} />
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
