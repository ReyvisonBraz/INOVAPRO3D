import type { ReactNode } from "react";
import { Inbox, type LucideIcon } from "lucide-react";
import { cn } from "../../../lib/utils";

export function AdminSectionHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="admin-section-header">
      <div className="min-w-0">
        {eyebrow && <p className="admin-eyebrow">{eyebrow}</p>}
        <h2 className="admin-section-title">{title}</h2>
        {description && <p className="admin-section-description">{description}</p>}
      </div>
      {actions && <div className="admin-section-actions">{actions}</div>}
    </div>
  );
}

export function AdminPanel({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cn("admin-panel", className)}>{children}</section>;
}

export function AdminEmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="admin-empty-state">
      <div className="admin-empty-icon">
        <Icon className="h-5 w-5" />
      </div>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}

/** Cartão de configuração usado na aba Ajustes. */
export function AdminSettingsCard({
  icon: Icon,
  title,
  subtitle,
  className,
  children,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("glass rounded-[32px] p-7 border border-white/5 space-y-6", className)}>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-primary">
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-black uppercase tracking-widest italic">{title}</h3>
          {subtitle && (
            <p className="mt-1 text-[10px] text-secondary tracking-wide leading-snug">{subtitle}</p>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

export function AdminMetric({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  return (
    <div className={cn("admin-metric", `admin-metric--${tone}`)}>
      <span>{label}</span>
      <strong>{value}</strong>
      {hint && <small>{hint}</small>}
    </div>
  );
}
