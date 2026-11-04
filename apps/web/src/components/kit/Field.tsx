import { createContext, useContext, useId, type ReactNode } from 'react';

const FieldIdCtx = createContext<string | undefined>(undefined);
/** Field ичидаги контрол ўз id сини шундан олади (label htmlFor учун) */
export const useFieldId = (explicit?: string) => {
  const ctx = useContext(FieldIdCtx);
  return explicit ?? ctx;
};

export function Field({ label, children, error, hint, className }: { label: string; children: ReactNode; error?: string | null; hint?: string; className?: string }) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="label">{label}</label>
      <FieldIdCtx.Provider value={id}>{children}</FieldIdCtx.Provider>
      {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-600" role="alert">{error}</p>}
    </div>
  );
}
