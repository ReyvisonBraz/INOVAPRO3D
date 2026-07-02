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
  Star,
  Tag,
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
  | "coupons"
  | "crm"
  | "support"
  | "faqs"
  | "reviews"
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
  { id: "coupons", name: "Cupons", icon: Tag },
  { id: "crm", name: "Clientes", icon: Users },
  { id: "support", name: "Suporte", icon: AlertCircle },
  { id: "faqs", name: "FAQs", icon: HelpCircle },
  { id: "reviews", name: "Avaliações", icon: Star },
  { id: "settings", name: "Ajustes", icon: Settings },
  { id: "logs", name: "Registro de Auditoria", icon: History },
];

export const ADMIN_TAB_SUBTITLES: Record<AdminTabId, string> = {
  overview: "Visão geral de vendas, produção e orçamentos",
  orders: "Acompanhe e atualize o status dos pedidos",
  quotes: "Analise e precifique orçamentos de impressão",
  products: "Gerencie o catálogo de produtos",
  categories: "Organize as pastas e categorias da loja",
  materials: "Materiais e filamentos disponíveis",
  showcase: "Curadoria da vitrine pública",
  coupons: "Cupons e descontos promocionais",
  crm: "Base de clientes e relacionamento",
  support: "Tickets e atendimento ao cliente",
  faqs: "Perguntas frequentes da loja",
  reviews: "Moderação de avaliações e denúncias",
  settings: "Parâmetros da loja, calculadora e máquina",
  logs: "Histórico de ações administrativas",
};

export const PRODUCTION_STAGES: ProductionStage[] = [
  { id: "PENDING_PAYMENT", label: "AGUAR. PAGTO", icon: Wallet },
  { id: "PAID", label: "PAGO", icon: CheckCircle2 },
  { id: "QUEUE", label: "FILA IMPRESSÃO", icon: ListTodo },
  { id: "PRINTING", label: "IMPRIMINDO", icon: Zap },
  { id: "FINISHING", label: "ACABAMENTO", icon: Layers },
  { id: "SHIPPED", label: "ENVIADO", icon: Truck },
  { id: "COMPLETED", label: "FINALIZADO", icon: Shield },
];
