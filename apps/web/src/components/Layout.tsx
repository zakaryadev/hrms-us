import * as Dialog from '@radix-ui/react-dialog';
import * as Popover from '@radix-ui/react-popover';
import { useQuery } from '@tanstack/react-query';
import {
  Archive, BookMarked, CalendarDays, CalendarRange, ChevronDown, ChevronLeft, FileSpreadsheet, FileText, KeyRound, LayoutDashboard, LogOut, Menu, Network, Palmtree, Plus, ScrollText, UserCog, Users, Wallet, FileType2, History,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth, useCan } from '../auth/AuthContext';
import { api, ROLE_LABEL } from '../lib/api';
import ChangePassword from './ChangePassword';
import GlobalSearch from './GlobalSearch';
import { buttonStyles, cn } from './kit';

type Item = { to: string; label: string; icon: typeof Users; end?: boolean; badge?: 'onLeave' };
type Group = { id: string; label: string; items: Item[]; admin?: boolean };

const GROUPS: Group[] = [
  { id: 'main', label: 'Асосий', items: [{ to: '/', label: 'Бош саҳифа', icon: LayoutDashboard, end: true }] },
  { id: 'hr', label: 'Кадрлар', items: [
    { to: '/employees', label: 'Ходимлар', icon: Users },
    { to: '/import', label: 'Excel’дан юклаш', icon: FileSpreadsheet },
    { to: '/archive', label: 'Архив', icon: Archive },
    { to: '/structure', label: 'Штат ва сон', icon: Network },
  ] },
  { id: 'docs', label: 'Ҳужжатлар', items: [
    { to: '/orders', label: 'Буйруқлар', icon: ScrollText },
    { to: '/certificates', label: 'Маълумотнома', icon: FileText },
    { to: '/leaves', label: 'Таътиллар', icon: Palmtree, badge: 'onLeave' },
    { to: '/templates', label: 'Шаблонлар', icon: FileType2 },
  ] },
  { id: 'calc', label: 'Ҳисоб-китоб', items: [
    { to: '/timesheet', label: 'Табель', icon: CalendarDays },
    { to: '/payroll', label: 'Иш ҳақи', icon: Wallet },
    { to: '/calendar', label: 'Иш календари', icon: CalendarRange },
  ] },
  { id: 'system', label: 'Тизим', items: [
    { to: '/users', label: 'Фойдаланувчилар', icon: UserCog },
    { to: '/audit', label: 'Журнал', icon: History },
    { to: '/settings', label: 'Справочниклар', icon: BookMarked },
  ] },
];

const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
const store = {
  get<T>(k: string, d: T): T { try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : d; } catch { return d; } },
  set(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ҳеч нарса */ } },
};

/** Логотип белгиси (йиғилган сайдбар учун) — logo.svg нинг чап қисми */
function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 58 50" className={className} aria-hidden>
      <path fillRule="evenodd" clipRule="evenodd" d="M14.402 27.3407L22.2763 39.4656C22.5496 39.9084 22.9081 40.2925 23.3311 40.5957C23.7541 40.8988 24.233 41.1149 24.7402 41.2315C25.2473 41.3481 25.7726 41.3627 26.2855 41.2747C26.7983 41.1866 27.2886 40.9976 27.7279 40.7185C28.1671 40.4395 28.5465 40.076 28.8441 39.6491C29.1418 39.2222 29.3517 38.7405 29.4616 38.2319C29.5716 37.7233 29.5794 37.1979 29.4847 36.6862C29.39 36.1745 29.1946 35.6867 28.9099 35.2511L19.444 20.6753C19.3136 20.4741 19.1652 20.2851 19.0006 20.1106L28.4535 5.23438L51.7153 41.8342C52.2068 42.5754 52.505 43.4279 52.5827 44.3138C52.6604 45.1998 52.5151 46.0911 52.1602 46.9066C51.743 47.8277 51.0696 48.6092 50.2204 49.1581C49.3712 49.7069 48.382 49.9997 47.3709 50.0017H-0.00195312L14.402 27.3407Z" fill="#0F1542" />
      <path fillRule="evenodd" clipRule="evenodd" d="M56.9803 39.6357L31.7875 0L29.582 3.4663L53.3508 40.8562C53.5906 41.2208 53.7947 41.6078 53.9603 42.0116C54.3258 42.8928 54.5122 43.8379 54.5085 44.7919C54.5047 45.7459 54.311 46.6895 53.9386 47.5678L54.6896 47.2342C54.9249 47.1289 55.1523 47.0068 55.3699 46.8688C55.9506 46.5 56.4529 46.0204 56.8482 45.4574C57.2434 44.8944 57.5239 44.259 57.6736 43.5876C57.8233 42.9162 57.8392 42.2219 57.7205 41.5443C57.6018 40.8667 57.3508 40.2192 56.9817 39.6386" fill="#E50019" />
      <path fillRule="evenodd" clipRule="evenodd" d="M11.4532 18.048C12.1643 17.5846 12.9968 17.3427 13.8455 17.3528C14.6942 17.363 15.5207 17.6247 16.2205 18.1049C16.9203 18.5852 17.4619 19.2622 17.7766 20.0505C18.0914 20.8387 18.1651 21.7025 17.9886 22.5327C17.812 23.3629 17.3931 24.122 16.7848 24.7139C16.1766 25.3058 15.4063 25.7038 14.5717 25.8577C13.737 26.0116 12.8755 25.9143 12.0961 25.5782C11.3168 25.2421 10.6547 24.6822 10.1938 23.9696C9.57859 23.0165 9.36574 21.8586 9.60174 20.749C9.83773 19.6394 10.5034 18.6683 11.4532 18.048Z" fill="#E50019" />
    </svg>
  );
}

function SidebarNav({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'superadmin';
  const can = useCan();
  const stats = useQuery({ queryKey: ['stats'], queryFn: () => api<any>('/dashboard/stats'), staleTime: 60_000 });
  const [closed, setClosed] = useState<Record<string, boolean>>(() => store.get('nav-closed', {}));
  const toggle = (id: string) => setClosed((c) => { const n = { ...c, [id]: !c[id] }; store.set('nav-closed', n); return n; });
  const location = useLocation();

  return (
    <nav className="flex-1 space-y-3 overflow-y-auto px-3 py-4" aria-label="Асосий меню">
      {GROUPS.map((g) => {
        const items = g.items.filter((i) => ((i.to !== '/users' && i.to !== '/audit') || isAdmin) && (i.to !== '/import' || can.write));
        if (!items.length) return null;
        // Фаол саҳифа ётган гуруҳ ҳеч қачон бекилмайди
        const hasActive = items.some((i) => (i.end ? location.pathname === i.to : location.pathname.startsWith(i.to)));
        const isClosed = !collapsed && closed[g.id] && !hasActive;
        return (
          <div key={g.id}>
            {collapsed ? <div className="mx-3 mb-2 border-t border-slate-200 first:hidden" /> : (
              <button type="button" onClick={() => toggle(g.id)} aria-expanded={!isClosed}
                className="mb-1 flex w-full items-center justify-between rounded-md px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.1em] text-slate-500 transition-colors hover:text-slate-900">
                {g.label}<ChevronDown size={14} className={cn('transition-transform', isClosed && '-rotate-90')} />
              </button>
            )}
            {!isClosed && (
              <div className="space-y-0.5">
                {items.map(({ to, label, icon: Icon, end, badge }) => {
                  const count = badge === 'onLeave' ? stats.data?.onLeave : 0;
                  return (
                    <NavLink key={to} to={to} end={end} onClick={onNavigate} title={collapsed ? label : undefined}
                      className={({ isActive }) => cn('group flex h-9 items-center gap-3 rounded-[10px] px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-slate-400/50',
                        isActive ? 'bg-slate-100 text-slate-950' : 'text-slate-950/70 hover:bg-slate-100/70 hover:text-slate-950', collapsed && 'justify-center px-0')}>
                      <Icon size={18} strokeWidth={1.7} className="shrink-0" />
                      {!collapsed && <span className="flex-1 truncate">{label}</span>}
                      {!collapsed && count > 0 && <span className="rounded-full bg-slate-900/15 px-1.5 text-[10px] font-semibold leading-5 text-slate-900">{count}</span>}
                    </NavLink>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

function UserBlock({ collapsed, onLogout }: { collapsed: boolean; onLogout: () => void }) {
  const { user } = useAuth();
  return (
    <div className={cn('flex items-center gap-3 border-t border-slate-200 p-4', collapsed && 'justify-center p-3')}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white" aria-hidden>{initials(user?.fullName)}</span>
      {!collapsed && (
        <>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium" title={user?.fullName}>{user?.fullName}</p>
            <p className="truncate text-xs text-slate-500">{user && ROLE_LABEL[user.role]}</p>
          </div>
          <button aria-label="Чиқиш" title="Чиқиш" onClick={onLogout} className="rounded-md p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"><LogOut size={16} /></button>
        </>
      )}
    </div>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const can = useCan();
  const [pwd, setPwd] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [collapsed, setCollapsed] = useState<boolean>(() => store.get('sidebar-collapsed', false));
  const location = useLocation();
  useEffect(() => setDrawer(false), [location.pathname]);
  const toggleCollapsed = () => setCollapsed((c) => { store.set('sidebar-collapsed', !c); return !c; });

  return (
    <div className="flex min-h-screen bg-white">
      {/* Десктоп сайдбар */}
      <aside className={cn('sticky top-0 hidden h-screen shrink-0 flex-col border-r border-slate-200 bg-sidebar transition-[width] duration-300 lg:flex', collapsed ? 'w-[72px]' : 'w-[260px]')}>
        <div className={cn('flex h-16 shrink-0 items-center border-b border-slate-200 px-4', collapsed && 'justify-center px-0')}>
          {collapsed ? <LogoMark className="h-7" /> : <img src="/logo.svg" alt="UNICON SOFT" className="h-7" />}
        </div>
        <button type="button" onClick={toggleCollapsed} aria-label={collapsed ? 'Менюни кенгайтириш' : 'Менюни йиғиш'} aria-pressed={collapsed}
          className="absolute -right-3 top-[88px] z-20 flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-600 shadow-sm transition-colors hover:text-slate-950">
          <ChevronLeft size={14} className={cn('transition-transform', collapsed && 'rotate-180')} />
        </button>
        <SidebarNav collapsed={collapsed} />
        <UserBlock collapsed={collapsed} onLogout={logout} />
      </aside>

      {/* Мобил: ёнбош панель (drawer) */}
      <Dialog.Root open={drawer} onOpenChange={setDrawer}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 lg:hidden" />
          <Dialog.Content aria-describedby={undefined} className="fixed inset-y-0 left-0 z-50 flex w-[280px] max-w-[85vw] flex-col bg-sidebar shadow-lg focus:outline-none lg:hidden">
            <Dialog.Title className="sr-only">Меню</Dialog.Title>
            <div className="flex h-16 shrink-0 items-center border-b border-slate-200 px-4"><img src="/logo.svg" alt="UNICON SOFT" className="h-7" /></div>
            <SidebarNav collapsed={false} onNavigate={() => setDrawer(false)} />
            <UserBlock collapsed={false} onLogout={logout} />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur-xl sm:px-6">
          <button type="button" aria-label="Менюни очиш" onClick={() => setDrawer(true)} className="rounded-md p-2 text-slate-600 hover:bg-slate-100 lg:hidden"><Menu size={20} /></button>
          <GlobalSearch />
          <div className="ml-auto flex items-center gap-3">
            {can.write && <Link to="/employees?new=1" className={cn(buttonStyles({ variant: 'primary', size: 'sm' }), 'h-8')}><Plus size={15} /><span className="hidden sm:inline">Янги ходим</span><span className="sr-only sm:hidden">Янги ходим</span></Link>}
            <span className="hidden h-6 w-px bg-slate-200 sm:block" aria-hidden />
            <Popover.Root>
              <Popover.Trigger asChild>
                <button type="button" aria-label="Профил менюси" className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900/10 text-xs font-semibold text-slate-900 transition-colors hover:bg-slate-900/20 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-slate-400/50">{initials(user?.fullName)}</button>
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Content align="end" sideOffset={8} className="z-[70] w-60 rounded-lg border border-slate-200 bg-white p-1 shadow-md">
                  <div className="px-3 py-2"><p className="truncate text-sm font-medium">{user?.fullName}</p><p className="text-xs text-slate-500">{user && ROLE_LABEL[user.role]} · {user?.login}</p></div>
                  <div className="my-1 h-px bg-slate-100" />
                  <Popover.Close asChild><button type="button" onClick={() => setPwd(true)} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-slate-100"><KeyRound size={15} /> Паролни ўзгартириш</button></Popover.Close>
                  <button type="button" onClick={logout} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-slate-100"><LogOut size={15} /> Чиқиш</button>
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1600px] flex-1 p-4 sm:p-6"><Outlet /></main>
      </div>
      {pwd && <ChangePassword onClose={() => setPwd(false)} />}
    </div>
  );
}
