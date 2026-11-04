import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from './cn';

/** Радикс Dialog: фокус тузоғи, Esc, скролл блоки, тўғри aria */
export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 overflow-y-auto bg-navy/50 p-4">
          <Dialog.Content aria-describedby={undefined} className={cn('card mx-auto my-8 w-full focus:outline-none', wide ? 'max-w-4xl' : 'max-w-lg')}>
            <div className="flex items-center justify-between border-b px-5 py-4">
              <Dialog.Title className="font-semibold">{title}</Dialog.Title>
              <Dialog.Close aria-label="Ёпиш" className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"><X size={18} /></Dialog.Close>
            </div>
            <div className="p-5">{children}</div>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
