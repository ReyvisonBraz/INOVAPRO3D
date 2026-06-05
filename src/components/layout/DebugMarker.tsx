import { useState, useEffect } from "react";
import { ShieldAlert, CheckCircle2 } from "lucide-react";
import { useLocation } from "react-router-dom";
import { cn } from "@/src/lib/utils";
import { useAuth } from "@/src/contexts/AuthContext";

export function DebugMarker() {
  const { profile } = useAuth();

  if (profile?.role !== 'ADMIN') return null;

  return <DebugMarkerContent />;
}

function DebugMarkerContent() {
  const [status, setStatus] = useState<'healthy' | 'warning' | 'error'>('healthy');

  const statusLabel = { healthy: 'OK', warning: 'Alerta', error: 'Erro' }[status];
  const [latency, setLatency] = useState<number | null>(null);

  useEffect(() => {
    const checkHealth = async () => {
      const start = Date.now();
      try {
        const res = await fetch('/api/health');
        if (res.ok) {
          setLatency(Date.now() - start);
          setStatus('healthy');
        } else {
          setStatus('warning');
        }
      } catch (e) {
        setStatus('error');
      }
    };

    const interval = setInterval(checkHealth, 10000);
    checkHealth();
    return () => clearInterval(interval);
  }, []);

  const { pathname } = useLocation();
  const hasStickyBar = ["/checkout", "/produto/"].some(p => pathname.startsWith(p));

  return (
    <div className={`fixed left-4 z-50 group cursor-help ${hasStickyBar ? "bottom-20 sm:bottom-24" : "bottom-4 sm:bottom-6"}`}>
      <div className={cn(
        "debug-marker-overlay flex items-center gap-2",
        status === 'error' && "border-red-500/50 bg-red-500/5",
        status === 'warning' && "border-yellow-500/50 bg-yellow-500/5"
      )}>
        <div className={cn(
          "w-1.5 h-1.5 rounded-full animate-pulse",
          status === 'healthy' ? "bg-green-500" : status === 'warning' ? "bg-yellow-500" : "bg-red-500"
        )} />
        
        <span className="capitalize">{statusLabel}</span>
        
        {latency !== null && (
          <span className="text-[8px] opacity-40 ml-1">{latency}ms</span>
        )}

        <div className="flex items-center ml-1">
          {status === 'healthy' ? <CheckCircle2 className="w-3 h-3 text-green-500/50" /> : <ShieldAlert className="w-3 h-3 text-red-500/50" />}
        </div>
      </div>

      {/* TOOLTIP ON HOVER */}
      <div className="absolute bottom-full left-0 mb-2 w-48 glass p-3 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none scale-95 group-hover:scale-100 origin-bottom-left">
        <p className="font-display font-bold text-xs mb-1">Motor de Diagnóstico</p>
        <div className="space-y-1 text-[10px] text-white/50 font-mono">
          <div className="flex justify-between">
            <span>Servidor:</span>
            <span className="text-green-500">Ativo</span>
          </div>
          <div className="flex justify-between">
            <span>Firebase:</span>
            <span>Desconectado</span>
          </div>
          <div className="flex justify-between">
            <span>Modo UI:</span>
            <span>Refined-Dark</span>
          </div>
        </div>
      </div>
    </div>
  );
}
