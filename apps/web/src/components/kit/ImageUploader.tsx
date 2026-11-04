import { ImagePlus, Loader2, Trash2, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useDropzone, type FileRejection } from 'react-dropzone';
import { Button } from './Button';
import { cn } from './cn';

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Kengaytma emas, haqiqiy boshlang'ich baytlar (JPEG: FF D8 FF, PNG: 89 50 4E 47 0D 0A 1A 0A) */
async function looksLikeImage(file: File) {
  const b = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const jpg = b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  const png = b.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((x, i) => b[i] === x);
  return jpg || png;
}

function rejectMessage(rej: FileRejection[]) {
  const code = rej[0]?.errors[0]?.code;
  if (code === 'file-too-large') return 'Расм ҳажми 5 МБ дан ошмаслиги керак';
  if (code === 'file-invalid-type') return 'Фақат JPG ёки PNG расм юкланг';
  if (code === 'too-many-files') return 'Битта расм танланг';
  return 'Расмни юклаб бўлмади';
}

export interface ImageUploaderProps {
  /** Сақланган расм манзили (бўлса) */
  src?: string | null;
  /** Янги расм танланганда (дарҳол ёки сақлашда юбориш — чақирувчи ҳал қилади) */
  onSelect: (file: File) => void;
  onRemove?: () => void;
  loading?: boolean;
  error?: string | null;
  disabled?: boolean;
  className?: string;
}

export function ImageUploader({ src, onSelect, onRemove, loading, error, disabled, className }: ImageUploaderProps) {
  const [local, setLocal] = useState<string | null>(null);
  const [localError, setLocalError] = useState('');
  const [removed, setRemoved] = useState(false);

  // Ҳосил қилинган object URL ни тозалаш
  useEffect(() => () => { if (local) URL.revokeObjectURL(local); }, [local]);
  // Сақланган расм ўзгарса (масалан, юклангач) вақтинчалик кўринишни ташлаймиз
  useEffect(() => { setRemoved(false); }, [src]);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    accept: { 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'] }, maxSize: MAX_IMAGE_BYTES, multiple: false,
    disabled: disabled || loading, noClick: true, noKeyboard: true,
    onDropAccepted: async (files) => {
      if (!(await looksLikeImage(files[0]))) { setLocalError('Фақат JPG ёки PNG расм юкланг'); return; }
      setLocalError(''); setRemoved(false); setLocal(URL.createObjectURL(files[0])); onSelect(files[0]);
    },
    onDropRejected: (rej) => setLocalError(rejectMessage(rej)),
  });

  const shown = removed ? null : (local ?? src ?? null);
  const message = localError || error;
  return (
    <div className={cn('flex items-center gap-4', className)}>
      <div {...getRootProps({ onClick: open, role: 'button', tabIndex: 0, 'aria-label': 'Расм юклаш', onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } } })}
        className={cn('group relative flex h-28 w-28 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed bg-slate-50 text-slate-400 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
          isDragActive ? 'border-brand bg-brand-soft text-brand' : shown ? 'border-transparent' : 'border-slate-300 hover:border-brand hover:text-brand', (disabled || loading) && 'cursor-not-allowed opacity-70')}>
        <input {...getInputProps()} />
        {shown ? <img src={shown} alt="Ходим расми" className="h-full w-full object-cover" /> : <UserRound size={44} strokeWidth={1.5} />}
        {shown && !loading && <span className="absolute inset-0 flex items-center justify-center bg-navy/50 text-xs font-medium text-white opacity-0 transition group-hover:opacity-100">Алмаштириш</span>}
        {loading && <span className="absolute inset-0 flex items-center justify-center bg-white/70"><Loader2 className="animate-spin text-brand" size={26} /></span>}
      </div>
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={open} disabled={disabled || loading}><ImagePlus size={14} /> {shown ? 'Расмни алмаштириш' : 'Расм танлаш'}</Button>
          {shown && onRemove && (
            <Button type="button" variant="ghost" size="sm" className="text-red-600 hover:bg-red-50 hover:text-red-700" disabled={disabled || loading}
              onClick={() => { setLocal(null); setRemoved(true); setLocalError(''); onRemove(); }}><Trash2 size={14} /> Ўчириш</Button>
          )}
        </div>
        <p className="text-xs text-slate-500">JPG ёки PNG, 5 МБ гача. Расмни шу ерга судраб ташласангиз ҳам бўлади.</p>
        {message && <p className="text-xs text-red-600" role="alert">{message}</p>}
      </div>
    </div>
  );
}
