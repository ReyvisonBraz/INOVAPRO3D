import {
  AlertCircle,
  Box,
  CheckCircle2,
  FileText,
  Folder,
  HelpCircle,
  History,
  Layers,
  ListTodo,
  Package,
  Printer,
  Settings,
  Shield,
  Sparkles,
  TrendingUp,
  Truck,
  Users,
  Wallet,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { OrderStatus } from "../../types/domain";

export type AdminTabId =
  | "overview"
  | "orders"
  | "quotes"
  | "products"
  | "categories"
  | "materials"
  | "showcase"
  | "crm"
  | "support"
  | "faqs"
  | "settings"
  | "logs";

export interface AdminMenuItem {
  id: AdminTabId;
  name: string;
  icon: LucideIcon;
}

export interface ProductionStage {
  id: OrderStatus;
  label: string;
  icon: LucideIcon;
}

export const ADMIN_MENU_ITEMS: AdminMenuItem[] = [
  { id: "overview", name: "Painel", icon: TrendingUp },
  { id: "orders", name: "Pedidos", icon: Package },
  { id: "quotes", name: "Orçamentos", icon: FileText },
  { id: "products", name: "Catálogo", icon: Printer },
  { id: "categories", name: "Pastas", icon: Folder },
  { id: "materials", name: "Materiais", icon: Box },
  { id: "showcase", name: "Vitrine", icon: Sparkles },
  { id: "crm", name: "Clientes", icon: Users },
  { id: "support", name: "Suporte", icon: AlertCircle },
  { id: "faqs", name: "FAQs", icon: HelpCircle },
  { id: "settings", name: "Ajustes", icon: Settings },
  { id: "logs", name: "Registro de Auditoria", icon: History },
];

export const PRODUCTION_STAGES: ProductionStage[] = [
  { id: "PENDING_PAYMENT", label: "AGUAR. PAGTO", icon: Wallet },
  { id: "PAID", label: "PAGO", icon: CheckCircle2 },
  { id: "QUEUE", label: "FILA IMPRESSÃO", icon: ListTodo },
  { id: "PRINTING", label: "IMPRIMINDO", icon: Zap },
  { id: "FINISHING", label: "ACABAMENTO", icon: Layers },
  { id: "SHIPPED", label: "ENVIADO", icon: Truck },
  { id: "COMPLETED", label: "FINALIZADO", icon: Shield },
];
