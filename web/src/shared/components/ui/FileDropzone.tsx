import { useCallback, useEffect, useRef, useState } from 'react';
import { ImageIcon, Upload, X } from 'lucide-react';
import { cn } from '@shared/lib/utils';

type FileDropzoneProps = {
  label?: string;
  hint?: string;
  accept?: string;
  multiple?: boolean;
  files: File[];
  onFilesChange: (files: File[]) => void;
  className?: string;
};

function mergeFiles(existing: File[], incoming: File[], multiple: boolean) {
  if (!multiple) return incoming.slice(0, 1);
  const key = (f: File) => `${f.name}-${f.size}-${f.lastModified}`;
  const map = new Map(existing.map((f) => [key(f), f]));
  for (const f of incoming) map.set(key(f), f);
  return Array.from(map.values());
}

function FilePreviewRow({
  file,
  onRemove,
}: {
  file: File;
  onRemove: () => void;
}) {
  const isImage = file.type.startsWith('image/');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isImage) return;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file, isImage]);

  return (
    <li className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2">
      {isImage && previewUrl ? (
        <img
          src={previewUrl}
          alt=""
          className="h-12 w-12 shrink-0 rounded-md border border-border object-cover"
        />
      ) : (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-muted">
          <ImageIcon className="h-5 w-5 text-muted-foreground" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{file.name}</p>
        <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p>
      </div>
      <button
        type="button"
        className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        aria-label={`Remover ${file.name}`}
      >
        <X className="h-4 w-4" />
      </button>
    </li>
  );
}

export function FileDropzone({
  label,
  hint = 'Arraste arquivos aqui ou clique para selecionar',
  accept,
  multiple = true,
  files,
  onFilesChange,
  className,
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const addFiles = useCallback(
    (incoming: FileList | File[]) => {
      const list = Array.from(incoming);
      if (!list.length) return;
      onFilesChange(mergeFiles(files, list, multiple));
    },
    [files, multiple, onFilesChange],
  );

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index));
  };

  return (
    <div className={cn('w-full min-w-0 space-y-2', className)}>
      {label && (
        <span className="text-sm font-medium leading-none text-foreground">{label}</span>
      )}

      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragging(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (e.currentTarget.contains(e.relatedTarget as Node)) return;
          setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragging(false);
          addFiles(e.dataTransfer.files);
        }}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-8 text-center transition',
          dragging
            ? 'border-brand bg-brand/5'
            : 'border-border bg-muted/30 hover:border-brand/50 hover:bg-muted/50',
        )}
      >
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-background shadow-sm">
          <Upload className={cn('h-6 w-6', dragging ? 'text-brand' : 'text-muted-foreground')} />
        </div>
        <p className="text-sm font-medium text-foreground">
          {dragging ? 'Solte os arquivos aqui' : 'Arraste e solte'}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        {accept?.includes('image') && (
          <p className="mt-2 text-xs text-muted-foreground">PNG, JPG, WEBP</p>
        )}
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={accept}
          multiple={multiple}
          onChange={(e) => {
            if (e.target.files?.length) addFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((file, index) => (
            <FilePreviewRow
              key={`${file.name}-${file.size}-${file.lastModified}`}
              file={file}
              onRemove={() => removeFile(index)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
