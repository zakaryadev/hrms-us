import {
  Archive, BookMarked, CalendarDays, CalendarRange, FileSpreadsheet, FileText, KeyRound, LayoutDashboard, LogOut, Network, Palmtree, ScrollText, UserCog, Users, Wallet,
} from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ROLE_LABEL } from '../lib/api';
import ChangePassword from './ChangePassword';

// Тартиб ўзгармаган; қатор ораси (gap) мантиқий гуруҳларни ажратади
const groups = [
  [{ to: '/', label: 'Бош саҳифа', icon: LayoutDashboard, end: true }],
  [
    { to: '/employees', label: 'Ходимлар', icon: Users },
    { to: '/import', label: 'Excel’дан юклаш', icon: FileSpreadsheet },
    { to: '/archive', label: 'Архив', icon: Archive },
  ],
  [
    { to: '/orders', label: 'Буйруқлар', icon: ScrollText },
    { to: '/certificates', label: 'Маълумотнома', icon: FileText },
  ],
  [
    { to: '/timesheet', label: 'Табель', icon: CalendarDays },
    { to: '/payroll', label: 'Иш ҳақи', icon: Wallet },
    { to: '/leaves', label: 'Таътиллар', icon: Palmtree },
  ],
  [{ to: '/structure', label: 'Штат ва сон', icon: Network }],
];
const calendarLink = { to: '/calendar', label: 'Иш календари', icon: CalendarRange };
const bottom = { to: '/settings', label: 'Справочниклар', icon: BookMarked };
const usersLink = { to: '/users', label: 'Фойдаланувчилар', icon: UserCog };

const navClass = ({ isActive }: { isActive: boolean }) => `nav-item ${isActive ? 'nav-item-active' : ''}`;
const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');

export default function Layout() {
  const { user, logout } = useAuth();
  const [pwd, setPwd] = useState(false);
  const isAdmin = user?.role === 'superadmin';
  const all = [...groups.flat(), ...(isAdmin ? [usersLink] : []), calendarLink, bottom];

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col overflow-y-auto bg-navy md:flex">
        <div className="flex h-16 shrink-0 items-center border-b border-slate-200 bg-white px-5">
          <img src="/logo.svg" alt="UNICON SOFT" className="h-7" />
        </div>
        <nav className="flex flex-1 flex-col pb-3 pt-6" aria-label="Асосий меню">
          <div className="space-y-5">
            {groups.map((g, gi) => (
              <div key={gi} className="space-y-1">
                {g.map(({ to, label, icon: Icon, ...rest }) => (
                  <NavLink key={to} to={to} end={(rest as { end?: boolean }).end} className={navClass}><Icon size={17} strokeWidth={1.8} />{label}</NavLink>
                ))}
              </div>
            ))}
          </div>
          <div className="mt-auto space-y-1 pt-6">
            <p className="mb-2 ml-6 text-[10.5px] font-semibold uppercase tracking-eyebrow text-slate-400">Тизим</p>
            {isAdmin && <NavLink to={usersLink.to} className={navClass}><usersLink.icon size={17} strokeWidth={1.8} />{usersLink.label}</NavLink>}
            <NavLink to={calendarLink.to} className={navClass}><calendarLink.icon size={17} strokeWidth={1.8} />{calendarLink.label}</NavLink>
            <NavLink to={bottom.to} className={navClass}><bottom.icon size={17} strokeWidth={1.8} />{bottom.label}</NavLink>
          </div>
        </nav>
        <div className="mx-3 mb-3 flex items-center gap-3 rounded-md border border-white/10 p-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-white/10 text-xs font-semibold text-white" aria-hidden>{initials(user?.fullName)}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-white" title={user?.fullName}>{user?.fullName}</p>
            <p className="truncate text-[11px] text-slate-400">{user && ROLE_LABEL[user.role]}</p>
          </div>
          <button aria-label="Паролни ўзгартириш" title="Паролни ўзгартириш" className="rounded p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white" onClick={() => setPwd(true)}><KeyRound size={15} /></button>
          <button aria-label="Чиқиш" title="Чиқиш" className="rounded p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white" onClick={logout}><LogOut size={15} /></button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 md:hidden">
          <img src="/logo.svg" alt="UNICON SOFT" className="h-5 shrink-0" />
          <nav className="ml-auto flex min-w-0 gap-4 overflow-x-auto whitespace-nowrap text-xs" aria-label="Асосий меню">
            {all.map((l) => (
              <NavLink key={l.to} to={l.to} end={(l as { end?: boolean }).end} className={({ isActive }) => (isActive ? 'font-semibold text-brand' : 'text-slate-500')}>{l.label}</NavLink>
            ))}
          </nav>
          <button aria-label="Чиқиш" className="shrink-0 text-slate-500" onClick={logout}><LogOut size={16} /></button>
        </header>
        <main className="mx-auto w-full max-w-[1320px] flex-1 px-4 py-6 md:px-10 md:py-9"><Outlet /></main>
      </div>
      {pwd && <ChangePassword onClose={() => setPwd(false)} />}
    </div>
  );
}
