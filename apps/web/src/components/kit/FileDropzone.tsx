import { FileUp, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useDropzone, type Accept, type FileRejection } from 'react-dropzone';
import { cn } from './cn';

function reasonOf(rej: FileRejection[], maxMb: number, typesHint: string) {
  const code = rej[0]?.errors[0]?.code;
  if (code === 'file-too-large') return `Файл ҳажми ${maxMb} МБ дан ошмаслиги керак`;
  if (code === 'file-invalid-type') return `Фақат ${typesHint} файллар рухсат этилади`;
  if (code === 'too-many-files') return 'Битта файл танланг';
  return 'Файлни юклаб бўлмади';
}

/** Умумий файл юклагич (Excel, PDF ва ҳ.к.): судраб ташлаш ёки босиш */
export function FileDropzone({ accept, typesHint, maxMb = 10, onFile, loading, title = 'Файлни шу ерга ташланг ёки танлаш учун босинг', className }: {
  accept: Accept; typesHint: string; maxMb?: number; onFile: (file: File) => void; loading?: boolean; title?: string; className?: string;
}) {
  const [error, setError] = useState('');
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept, maxSize: maxMb * 1024 * 1024, multiple: false, disabled: loading,
    onDropAccepted: (files) => { setError(''); onFile(files[0]); },
    onDropRejected: (rej) => setError(reasonOf(rej, maxMb, typesHint)),
  });
  return (
    <div className={className}>
      <div {...getRootProps()} className={cn('flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-6 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
        isDragActive ? 'border-brand bg-brand-soft text-brand' : 'border-slate-300 bg-slate-50 text-slate-500 hover:border-brand hover:text-brand', loading && 'cursor-not-allowed opacity-70')}>
        <input {...getInputProps()} aria-label={title} />
        {loading ? <Loader2 className="animate-spin" size={26} /> : <FileUp size={26} strokeWidth={1.6} />}
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-slate-500">{typesHint} · {maxMb} МБ гача</p>
      </div>
      {error && <p className="mt-1.5 text-xs text-red-600" role="alert">{error}</p>}
    </div>
  );
}
