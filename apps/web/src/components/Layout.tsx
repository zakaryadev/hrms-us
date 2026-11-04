import {
  Archive, BookMarked, CalendarDays, FileSpreadsheet, FileText, LayoutDashboard, Palmtree, ScrollText, Users, Wallet, Network,
} from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';

const links = [
  { to: '/', label: 'Бош саҳифа', icon: LayoutDashboard, end: true },
  { to: '/employees', label: 'Ходимлар', icon: Users },
  { to: '/import', label: 'Excel’дан юклаш', icon: FileSpreadsheet },
  { to: '/archive', label: 'Архив', icon: Archive },
  { to: '/orders', label: 'Буйруқлар', icon: ScrollText },
  { to: '/certificates', label: 'Маълумотнома', icon: FileText },
  { to: '/timesheet', label: 'Табель', icon: CalendarDays },
  { to: '/payroll', label: 'Иш ҳақи', icon: Wallet },
  { to: '/leaves', label: 'Таътиллар', icon: Palmtree },
  { to: '/structure', label: 'Штат ва сон', icon: Network },
];
const bottom = { to: '/settings', label: 'Справочниклар', icon: BookMarked };

const item = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-lg border-l-4 px-3 py-2.5 text-sm transition ${
    isActive ? 'border-blue-500 bg-navy-700 font-medium text-white' : 'border-transparent text-slate-300 hover:bg-white/5 hover:text-white'
  }`;

export default function Layout() {
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 flex-col bg-navy text-white md:flex">
        <div className="rounded-br-3xl bg-white p-5">
          <img src="/logo.svg" alt="Logo" className="h-8" />
        </div>
        <nav className="mt-5 flex flex-1 flex-col gap-0.5 px-3">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={item}><Icon size={18} /> {label}</NavLink>
          ))}
          <div className="mt-auto border-t border-white/10 pt-3 pb-4">
            <NavLink to={bottom.to} className={item}><bottom.icon size={18} /> {bottom.label}</NavLink>
          </div>
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b bg-white px-4 py-3 md:hidden">
          <img src="/logo.svg" alt="Logo" className="h-5 shrink-0" />
          <nav className="ml-auto flex min-w-0 gap-3 overflow-x-auto whitespace-nowrap text-xs">
            {[...links, bottom].map((l) => (
              <NavLink key={l.to} to={l.to} end={(l as any).end} className={({ isActive }) => (isActive ? 'font-semibold text-blue-600' : 'text-slate-600')}>{l.label}</NavLink>
            ))}
          </nav>
        </header>
        <main className="flex-1 p-4 md:p-8"><Outlet /></main>
      </div>
    </div>
  );
}
