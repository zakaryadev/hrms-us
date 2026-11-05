import type { ReactNode } from 'react';

/** Кириш ва созлаш саҳифалари учун: чапда navy панель, ўнгда форма */
export default function AuthLayout({ children, wide }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="grid grid-cols-1 min-h-screen bg-paper lg:grid-cols-[minmax(360px,5fr)_7fr]">
      <aside className="hidden flex-col justify-between bg-navy p-12 lg:flex">
        <div className="inline-flex h-14 w-fit items-center rounded bg-white px-5"><img src="/logo.svg" alt="UNICON SOFT" className="h-7" /></div>
        <div>
          <p className="eyebrow !text-slate-400">HRMS</p>
          <p className="mt-3 max-w-md text-[36px] font-semibold leading-[1.15] tracking-tight text-white">Кадрлар бўлими бошқаруви тизими</p>
        </div>
        <p className="text-xs text-slate-400">© UNICON SOFT</p>
      </aside>
      <main className="flex items-center justify-center px-6 py-10">
        <div className={`w-full ${wide ? 'max-w-lg' : 'max-w-sm'}`}>
          <img src="/logo.svg" alt="UNICON SOFT" className="mb-8 h-8 lg:hidden" />
          {children}
        </div>
      </main>
    </div>
  );
}
