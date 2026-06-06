import { useRef, useEffect, useState } from 'react';
import { Button } from '@shared/components/ui/Button';

interface SignaturePadProps {
  onChange: (dataUrl: string | null) => void;
  typedName: string;
  onTypedNameChange: (name: string) => void;
}

export function SignaturePad({ onChange, typedName, onTypedNameChange }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<'draw' | 'type'>('draw');
  const drawing = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || mode !== 'draw') return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    const pos = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const start = (e: MouseEvent | TouchEvent) => {
      drawing.current = true;
      const p = pos(e);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
    };

    const move = (e: MouseEvent | TouchEvent) => {
      if (!drawing.current) return;
      e.preventDefault();
      const p = pos(e);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    };

    const end = () => {
      if (!drawing.current) return;
      drawing.current = false;
      onChange(canvas.toDataURL('image/png'));
    };

    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mousemove', move);
    canvas.addEventListener('mouseup', end);
    canvas.addEventListener('mouseleave', end);
    canvas.addEventListener('touchstart', start, { passive: false });
    canvas.addEventListener('touchmove', move, { passive: false });
    canvas.addEventListener('touchend', end);

    return () => {
      canvas.removeEventListener('mousedown', start);
      canvas.removeEventListener('mousemove', move);
      canvas.removeEventListener('mouseup', end);
      canvas.removeEventListener('mouseleave', end);
      canvas.removeEventListener('touchstart', start);
      canvas.removeEventListener('touchmove', move);
      canvas.removeEventListener('touchend', end);
    };
  }, [mode, onChange]);

  useEffect(() => {
    if (mode === 'type' && typedName.length >= 2) {
      onChange(null);
    }
  }, [mode, typedName, onChange]);

  const clear = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
    onChange(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button size="sm" variant={mode === 'draw' ? 'primary' : 'secondary'} onClick={() => setMode('draw')}>
          Desenhar
        </Button>
        <Button size="sm" variant={mode === 'type' ? 'primary' : 'secondary'} onClick={() => setMode('type')}>
          Digitar
        </Button>
        {mode === 'draw' && (
          <Button size="sm" variant="secondary" onClick={clear}>Limpar</Button>
        )}
      </div>
      {mode === 'draw' ? (
        <canvas
          ref={canvasRef}
          width={480}
          height={120}
          className="w-full cursor-crosshair rounded-lg border border-border bg-white touch-none"
        />
      ) : (
        <input
          type="text"
          value={typedName}
          onChange={(e) => onTypedNameChange(e.target.value)}
          placeholder="Digite seu nome como assinatura"
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 font-display text-2xl italic text-ink"
        />
      )}
    </div>
  );
}
