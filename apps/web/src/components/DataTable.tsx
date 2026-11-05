import * as Popover from '@radix-ui/react-popover';
import { ArrowDown, ArrowUp, ArrowUpDown, Columns3, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Button, Checkbox, Input, Select, cn } from './kit';

export interface Column<T> {
  key: string;
  header: string;
  /** Катакдаги кўриниш; бўлмаса value() ёзилади */
  cell?: (row: T) => ReactNode;
  /** Қидирув ва тартиблаш учун матн/сон. Бўлмаса — устун қидирилмайди ва тартибланмайди (серверда — sortKey билан) */
  value?: (row: T) => string | number | null | undefined;
  /** Серверда тартиблаш калити (manual режим); берилмаса key ишлатилади */
  sortKey?: string;
  sortable?: boolean;
  /** Одатда яширин (устунлар менюсидан қўшилади) */
  hidden?: boolean;
  /** Ҳамиша кўринади (менюда ўчириб бўлмайди) */
  locked?: boolean;
  nowrap?: boolean;
  align?: 'right' | 'center';
  className?: string;
  /** Қатор кенглиги тор бўлмаслиги учун (px эмас, rem) */
  minWidth?: string;
}

export type Sort = { key: string; dir: 'asc' | 'desc' } | null;

/** Сервер режими: қидирув, тартиблаш ва саҳифалаш сервер томонида */
export interface Manual {
  total: number;
  page: number;
  pageSize: number;
  onPage: (p: number) => void;
  onPageSize?: (n: number) => void;
  sort: Sort;
  onSort: (s: Sort) => void;
  search: string;
  onSearch: (s: string) => void;
}

interface Props<T> {
  columns: Column<T>[];
  rows: T[] | undefined;
  rowKey: (row: T) => string;
  /** Устунлар танлови ва саҳифа ўлчами шу калит билан браузерда эсланади */
  storageKey: string;
  loading?: boolean;
  emptyText?: string;
  searchPlaceholder?: string;
  /** Ҳар қатор учун «Амаллар» устуни (тугмалар) */
  actions?: (row: T) => ReactNode;
  /** Қидирув ёнидаги қўшимча бошқарувлар (фильтр ва ҳ.к.) */
  toolbar?: ReactNode;
  manual?: Manual;
  defaultSort?: Sort;
  pageSizeOptions?: number[];
  initialPageSize?: number;
}

const store = {
  get<T>(k: string, d: T): T { try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : d; } catch { return d; } },
  set(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ҳеч нарса */ } },
};

const collator = new Intl.Collator('ru', { numeric: true, sensitivity: 'base' });
function compare(a: unknown, b: unknown) {
  const an = a === null || a === undefined || a === '', bn = b === null || b === undefined || b === '';
  if (an || bn) return an === bn ? 0 : an ? 1 : -1;   // бўшлар доим охирида
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return collator.compare(String(a), String(b));
}

export default function DataTable<T>({
  columns, rows, rowKey, storageKey, loading, emptyText = 'Маълумот йўқ', searchPlaceholder = 'Қидириш…', actions, toolbar,
  manual, defaultSort = null, pageSizeOptions = [10, 20, 50, 100], initialPageSize = 20,
}: Props<T>) {
  const sk = `dt:${storageKey}`;
  const saved = useMemo(() => store.get<{ hidden?: string[]; pageSize?: number }>(sk, {}), [sk]);
  const [hidden, setHidden] = useState<string[]>(saved.hidden ?? columns.filter((c) => c.hidden).map((c) => c.key));
  const [pageSize, setPageSizeState] = useState(saved.pageSize ?? initialPageSize);
  const [search, setSearch] = useState(manual?.search ?? '');
  const [sort, setSort] = useState<Sort>(defaultSort);
  const [page, setPage] = useState(1);
  const persist = (h: string[], ps: number) => store.set(sk, { hidden: h, pageSize: ps });

  // Сервер режимида қидирув 300 мс кечикиш билан юборилади
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (!manual) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { if (search !== manual.search) manual.onSearch(search); }, 300);
    return () => clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const visible = columns.filter((c) => c.locked || !hidden.includes(c.key));
  const activeSort = manual ? manual.sort : sort;
  const curPageSize = manual ? manual.pageSize : pageSize;

  const clientRows = useMemo(() => {
    if (manual || !rows) return rows ?? [];
    const term = search.trim().toLowerCase();
    let out = rows;
    if (term) {
      const getters = columns.filter((c) => c.value);
      out = out.filter((r) => getters.some((c) => String(c.value!(r) ?? '').toLowerCase().includes(term)));
    }
    if (sort) {
      const col = columns.find((c) => c.key === sort.key);
      if (col?.value) {
        const f = col.value, sgn = sort.dir === 'asc' ? 1 : -1;
        out = [...out].sort((a, b) => {
          const x = f(a), y = f(b);
          const nx = x === null || x === undefined || x === '', ny = y === null || y === undefined || y === '';
          return nx || ny ? compare(x, y) : sgn * compare(x, y);   // бўшлар ҳар икки йўналишда ҳам охирида
        });
      }
    }
    return out;
  }, [rows, columns, search, sort, manual]);

  const total = manual ? manual.total : clientRows.length;
  const pages = Math.max(1, Math.ceil(total / curPageSize));
  const cur = manual ? manual.page : Math.min(page, pages);
  const shown = manual ? (rows ?? []) : clientRows.slice((cur - 1) * curPageSize, cur * curPageSize);

  const toggleSort = (c: Column<T>) => {
    const key = manual ? (c.sortKey ?? c.key) : c.key;
    const prev = activeSort?.key === key ? activeSort : null;
    const next: Sort = !prev ? { key, dir: 'asc' } : prev.dir === 'asc' ? { key, dir: 'desc' } : null;
    if (manual) { manual.onSort(next); manual.onPage(1); } else { setSort(next); setPage(1); }
  };
  const goPage = (p: number) => (manual ? manual.onPage(p) : setPage(p));
  const changeSize = (n: number) => {
    persist(hidden, n);
    if (manual) { manual.onPageSize?.(n); manual.onPage(1); } else { setPageSizeState(n); setPage(1); }
  };
  const toggleCol = (key: string, on: boolean) => {
    const h = on ? hidden.filter((k) => k !== key) : [...hidden, key];
    setHidden(h); persist(h, curPageSize);
  };
  const isSortable = (c: Column<T>) => c.sortable !== false && (manual ? true : !!c.value);
  const sortedKey = (c: Column<T>) => (manual ? (c.sortKey ?? c.key) : c.key);

  const from = total === 0 ? 0 : (cur - 1) * curPageSize + 1;
  const to = Math.min(cur * curPageSize, total);

  return (
    <div className="space-y-3">
      <div className="card flex flex-wrap items-center gap-3 p-3">
        <div className="min-w-[200px] flex-1">
          <Input icon={<Search size={16} />} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder={searchPlaceholder} aria-label="Қидирув" />
        </div>
        {toolbar}
        <Popover.Root>
          <Popover.Trigger asChild>
            <Button variant="secondary" type="button"><Columns3 size={16} /> Устунлар</Button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content align="end" sideOffset={6} className="z-50 w-60 rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Кўринадиган устунлар</p>
              <div className="space-y-2">
                {columns.map((c) => (
                  <Checkbox key={c.key} checked={c.locked || !hidden.includes(c.key)} disabled={c.locked} onChange={(v) => toggleCol(c.key, v)}>{c.header}</Checkbox>
                ))}
              </div>
              <button type="button" className="mt-3 text-xs text-slate-500 underline hover:text-slate-800"
                onClick={() => { const h = columns.filter((c) => c.hidden).map((c) => c.key); setHidden(h); persist(h, curPageSize); }}>Бошланғич ҳолатга қайтариш</button>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-slate-200">
            <tr>
              {visible.map((c) => {
                const on = activeSort?.key === sortedKey(c);
                const sortable = isSortable(c);
                return (
                  <th key={c.key} scope="col" aria-sort={on ? (activeSort!.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                    className={cn('th', c.align === 'right' && 'text-right', c.align === 'center' && 'text-center')} style={c.minWidth ? { minWidth: c.minWidth } : undefined}>
                    {sortable ? (
                      <button type="button" onClick={() => toggleSort(c)} className={cn('inline-flex items-center gap-1 rounded hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/50', on && 'text-slate-900')}>
                        {c.header}
                        {on ? (activeSort!.dir === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUpDown size={13} className="opacity-40" />}
                      </button>
                    ) : c.header}
                  </th>
                );
              })}
              {actions && <th scope="col" className="th bg-white text-right md:sticky md:right-0 md:shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.12)]">Амаллар</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && <tr><td colSpan={visible.length + (actions ? 1 : 0)} className="td py-10 text-center text-slate-500">Юкланмоқда…</td></tr>}
            {!loading && shown.map((r) => (
              <tr key={rowKey(r)} className="group hover:bg-slate-50">
                {visible.map((c) => (
                  <td key={c.key} className={cn('td', c.nowrap && 'whitespace-nowrap', c.align === 'right' && 'text-right', c.align === 'center' && 'text-center', c.className)}
                    style={c.minWidth ? { minWidth: c.minWidth } : undefined}>
                    {c.cell ? c.cell(r) : (c.value?.(r) ?? '—')}
                  </td>
                ))}
                {actions && <td className="td whitespace-nowrap bg-white text-right group-hover:bg-slate-50 md:sticky md:right-0 md:shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.12)]"><div className="flex items-center justify-end gap-1">{actions(r)}</div></td>}
              </tr>
            ))}
            {!loading && shown.length === 0 && (
              <tr><td colSpan={visible.length + (actions ? 1 : 0)} className="td py-10 text-center text-slate-500">{(manual ? manual.search : search.trim()) ? 'Ҳеч нарса топилмади' : emptyText}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
        <span>{total === 0 ? 'Жами: 0' : `${from}–${to} / жами: ${total}`}</span>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2">
            Саҳифада
            <Select plain className="!w-auto" value={String(curPageSize)} onChange={(v) => changeSize(Number(v))}>
              {[...new Set([...pageSizeOptions, curPageSize])].sort((a, b) => a - b).map((n) => <option key={n} value={String(n)}>{n}</option>)}
            </Select>
          </label>
          <div className="flex items-center gap-2">
            <Button variant="secondary" disabled={cur <= 1} onClick={() => goPage(cur - 1)}>Олдинги</Button>
            <span className="whitespace-nowrap">{cur} / {pages}</span>
            <Button variant="secondary" disabled={cur >= pages} onClick={() => goPage(cur + 1)}>Кейинги</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Амаллар устуни учун бир хил кичик тугма услуби */
export const actionBtn = 'inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/50 disabled:opacity-50';
export const iconBtn = 'inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/50';
