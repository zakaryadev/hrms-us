import { CalendarDays, LayoutDashboard, Network, Settings, Users } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';

const links = [
  { to: '/', label: 'Bosh sahifa', icon: LayoutDashboard, end: true },
  { to: '/employees', label: 'Xodimlar', icon: Users },
  { to: '/timesheet', label: 'Tabel', icon: CalendarDays },
  { to: '/structure', label: 'Tuzilma', icon: Network },
  { to: '/settings', label: 'Sozlamalar', icon: Settings },
];

export default function Layout() {
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col bg-navy text-white md:flex">
        <div className="rounded-br-3xl bg-white p-5">
          <img src="/logo.svg" alt="Logo" className="h-8" />
        </div>
        <nav className="mt-6 flex flex-col gap-1 px-3">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to} to={to} end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                  isActive ? 'bg-white/15 font-medium' : 'text-white/70 hover:bg-white/10'
                }`}
            >
              <Icon size={18} /> {label}
            </NavLink>
          ))}
        </nav>
        <p className="mt-auto p-4 text-xs text-white/40">HRMS · Kadrlar bo'limi</p>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b bg-white px-4 py-3 md:hidden">
          <img src="/logo.svg" alt="Logo" className="h-5 shrink-0" />
          <nav className="ml-auto flex min-w-0 gap-3 overflow-x-auto whitespace-nowrap text-xs">
            {links.map((l) => <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => (isActive ? 'font-semibold text-brand' : 'text-slate-600')}>{l.label}</NavLink>)}
          </nav>
        </header>
        <main className="flex-1 p-4 md:p-8"><Outlet /></main>
      </div>
    </div>
  );
}
