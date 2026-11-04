import {
  KeyRound, LogOut, UserCog,
  Archive, BookMarked, CalendarDays, FileSpreadsheet, FileText, LayoutDashboard, Palmtree, ScrollText, Users, Wallet, Network,
} from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ROLE_LABEL } from '../lib/api';
import ChangePassword from './ChangePassword';

type NavItem = { to: string; label: string; icon: typeof Users; end?: boolean };

const groups: { title: string; items: NavItem[] }[] = [
  { title: 'Умумий', items: [
    { to: '/', label: 'Бош саҳифа', icon: LayoutDashboard, end: true },
    { to: '/employees', label: 'Ходимлар', icon: Users },
    { to: '/archive', label: 'Архив', icon: Archive },
    { to: '/import', label: 'Excel’дан юклаш', icon: FileSpreadsheet },
  ] },
  { title: 'Ҳужжатлар', items: [
    { to: '/orders', label: 'Буйруқлар', icon: ScrollText },
    { to: '/certificates', label: 'Маълумотнома', icon: FileText },
  ] },
  { title: 'Ҳисоб-китоб', items: [
    { to: '/timesheet', label: 'Табель', icon: CalendarDays },
    { to: '/payroll', label: 'Иш ҳақи', icon: Wallet },
    { to: '/leaves', label: 'Таътиллар', icon: Palmtree },
  ] },
  { title: 'Бошқарув', items: [
    { to: '/structure', label: 'Штат ва сон', icon: Network },
    { to: '/settings', label: 'Справочниклар', icon: BookMarked },
  ] },
];
const usersLink: NavItem = { to: '/users', label: 'Фойдаланувчилар', icon: UserCog };

const item = ({ isActive }: { isActive: boolean }) =>
  `relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
    isActive
      ? 'bg-brand-100 font-semibold text-brand-700 before:absolute before:-left-3 before:top-2 before:h-[calc(100%-1rem)] before:w-1 before:rounded-r before:bg-brand'
      : 'text-ink-500 hover:bg-surface hover:text-ink'
  }`;

function Avatar({ name }: { name?: string }) {
  const initials = (name ?? '?').split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
  return <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">{initials}</span>;
}

export default function Layout() {
  const { user, logout } = useAuth();
  const [pwd, setPwd] = useState(false);
  const isAdmin = user?.role === 'superadmin';
  const all = [...groups.flatMap((g) => g.items), ...(isAdmin ? [usersLink] : [])];
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-surface-line bg-white md:flex">
        <div className="px-6 py-6"><img src="/logo.svg" alt="Logo" className="h-8" /></div>
        <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 pb-3">
          {groups.map((g) => (
            <div key={g.title}>
              <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-ink-400">{g.title}</p>
              <div className="space-y-0.5">
                {g.items.map(({ to, label, icon: Icon, end }) => (
                  <NavLink key={to} to={to} end={end} className={item}><Icon size={18} /> {label}</NavLink>
                ))}
                {g.title === 'Бошқарув' && isAdmin && <NavLink to={usersLink.to} className={item}><UserCog size={18} /> {usersLink.label}</NavLink>}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-surface-line p-3">
          <div className="flex items-center gap-3 rounded-xl bg-surface p-3">
            <Avatar name={user?.fullName} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold" title={user?.fullName}>{user?.fullName}</p>
              <p className="text-xs text-ink-500">{user && ROLE_LABEL[user.role]}</p>
            </div>
          </div>
          <div className="mt-2 flex gap-1 text-xs">
            <button className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-ink-500 hover:bg-surface hover:text-ink" onClick={() => setPwd(true)}><KeyRound size={14} /> Парол</button>
            <button className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-ink-500 hover:bg-surface hover:text-ink" onClick={logout}><LogOut size={14} /> Чиқиш</button>
          </div>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-surface-line bg-white px-4 py-3 md:hidden">
          <img src="/logo.svg" alt="Logo" className="h-5 shrink-0" />
          <nav className="ml-auto flex min-w-0 gap-3 overflow-x-auto whitespace-nowrap text-xs">
            {all.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => (isActive ? 'font-semibold text-brand' : 'text-ink-500')}>{l.label}</NavLink>
            ))}
          </nav>
          <button aria-label="Чиқиш" className="shrink-0 text-ink-500" onClick={logout}><LogOut size={16} /></button>
        </header>
        <main className="flex-1 p-4 md:p-8"><Outlet /></main>
      </div>
      {pwd && <ChangePassword onClose={() => setPwd(false)} />}
    </div>
  );
}
