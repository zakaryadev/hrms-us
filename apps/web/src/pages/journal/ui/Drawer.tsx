import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

/** Ўнгдан очиладиган панель: рўйхатдан чиқмасдан тафсилотни кўриш ва таҳрирлаш */
export function Drawer({ title, onClose, children, actions }: { title: ReactNode; onClose: () => void; children: ReactNode; actions?: ReactNode }) {
  return (
    <Dialog.Root open onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content aria-describedby={undefined} className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[620px] flex-col bg-white shadow-xl focus:outline-none">
          <div className="flex items-center gap-3 border-b px-5 py-3.5">
            <Dialog.Title className="min-w-0 flex-1 text-[15px] font-semibold tracking-tight">{title}</Dialog.Title>
            {actions}
            <Dialog.Close aria-label="×" className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"><X size={18} /></Dialog.Close>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
