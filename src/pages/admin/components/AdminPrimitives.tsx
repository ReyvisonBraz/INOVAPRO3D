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
      <div className="admin-empty-icon"><Icon className="h-5 w-5" /></div>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}

export function AdminMetric({ label, value, hint, tone = "default" }: { label: string; value: ReactNode; hint?: string; tone?: "default" | "success" | "warning" | "danger" }) {
  return (
    <div className={cn("admin-metric", `admin-metric--${tone}`)}>
      <span>{label}</span>
      <strong>{value}</strong>
      {hint && <small>{hint}</small>}
    </div>
  );
}
