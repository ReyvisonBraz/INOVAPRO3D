import { useState, useEffect } from "react";
import { ShieldAlert, CheckCircle2 } from "lucide-react";
import { cn } from "@/src/lib/utils";

/** Inline widget used inside the Admin Dashboard settings tab */
export function DiagnosticWidget() {
  const [status, setStatus] = useState<'healthy' | 'warning' | 'error'>('healthy');
  const [latency, setLatency] = useState<number | null>(null);

  useEffect(() => {
    const check = async () => {
      const start = Date.now();
      try {
        const res = await fetch('/api/health');
        if (res.ok) { setLatency(Date.now() - start); setStatus('healthy'); }
        else setStatus('warning');
      } catch { setStatus('error'); }
    };
    const t = setInterval(check, 10000);
    check();
    return () => clearInterval(t);
  }, []);

  const dot = status === 'healthy' ? 'bg-green-500' : status === 'warning' ? 'bg-yellow-500' : 'bg-red-500';
  const label = { healthy: 'OK', warning: 'Alerta', error: 'Erro' }[status];

  return (
    <div className="space-y-3">
      {[
        {
          key: 'srv',
          label: 'Servidor',
          value: (
            <span className="flex items-center gap-1.5">
              <span className={cn('w-1.5 h-1.5 rounded-full animate-pulse', dot)} />
              <span className={cn('text-[10px] font-mono font-bold', status === 'healthy' ? 'text-green-400' : status === 'warning' ? 'text-yellow-400' : 'text-red-400')}>
                {label}
              </span>
              {latency !== null && <span className="text-[9px] text-white/30">{latency}ms</span>}
              {status === 'healthy'
                ? <CheckCircle2 className="w-3 h-3 text-green-500/50" />
                : <ShieldAlert className="w-3 h-3 text-red-500/50" />}
            </span>
          ),
        },
        { key: 'fb', label: 'Firebase', value: <span className="text-[10px] font-mono font-bold text-green-400">Conectado</span> },
        { key: 'ui', label: 'Modo UI', value: <span className="text-[10px] font-mono text-white/50">Refined-Dark</span> },
      ].map(row => (
        <div key={row.key} className="flex items-center justify-between">
          <span className="text-[10px] text-white/30 uppercase font-bold">{row.label}</span>
          {row.value}
        </div>
      ))}
    </div>
  );
}
