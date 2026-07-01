import type { FieldValue, Timestamp } from "firebase/firestore";

export type FirestoreDate = Timestamp | { seconds: number };

export type UserRole = "CUSTOMER" | "ADMIN" | "OPERATOR";

export interface UserProfile {
  email: string | null;
  name: string | null;
  firstName?: string;
  lastName?: string;
  photoURL: string | null;
  role: UserRole;
  createdAt?: Timestamp | FieldValue;
  loyaltyPoints?: number;
  phone?: string;
  addresses?: ShippingAddress[];
}

export type UserProfileUpdate = Partial<Pick<UserProfile, "name" | "firstName" | "lastName" | "phone" | "addresses" | "photoURL">>;

export type CartItemType = "PRODUCT" | "QUOTE";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  type: CartItemType;
  options?: Record<string, string | number | boolean | null | undefined>;
}

export type OrderStatus =
  | "PENDING_PAYMENT"
  | "PAID"
  | "QUEUE"
  | "SLICING"
  | "PRINTING"
  | "FINISHING"
  | "READY"
  | "SHIPPED"
  | "COMPLETED"
  | "CANCELED";

export type QuoteStatus =
  | "PENDING"
  | "IN_REVIEW"
  | "APPROVED"
  | "SENT_TO_CUSTOMER"
  | "CONVERTED_TO_ORDER"
  | "REJECTED"
  | "CANCELED"
  | "DISCARDED";

export interface ShippingAddress {
  zipCode: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
}

export interface OrderItem extends CartItem {
  fileName?: string;
}

export interface Order {
  id: string;
  userId: string;
  userName?: string | null;
  userEmail?: string | null;
  phone?: string;
  items: OrderItem[];
  total: number;
  shippingAddress?: ShippingAddress;
  status: OrderStatus;
  createdAt?: FirestoreDate;
  updatedAt?: FirestoreDate;
  trackingCode?: string;
  _deleted?: boolean;
  deletedAt?: FirestoreDate;
}

export interface Quote {
  id: string;
  userId: string;
  userName?: string | null;
  userEmail?: string | null;
  status: QuoteStatus;
  fileName: string;
  materialId: string;
  infill: number;
  estimatedPrice?: number;
  total?: number;
  /** Preço unitário de varejo (orçamentos vindos da calculadora). */
  unitPrice?: number;
  /** Custo real de produção interno (orçamentos vindos da calculadora). */
  costTotal?: number;
  /** Quantidade de peças no lote. */
  quantity?: number;
  weight?: number;
  printTime?: string;
  phone?: string;
  notes?: string;
  adminNotes?: string;
  /** Imagem opcional do produto anexada ao orçamento. */
  imageUrl?: string;
  /** Origem do orçamento: "calculator" quando salvo pela calculadora. */
  source?: string;
  email?: string;
  message?: string;
  createdAt?: FirestoreDate;
  updatedAt?: FirestoreDate;
  _deleted?: boolean;
  deletedAt?: FirestoreDate;
}

export interface ProductTechnicalSpec {
  infill?: number;
  resolution?: string;
  printTime?: string;
  weight?: number;
}

export interface ProductDimensions {
  x: number;
  y: number;
  z: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  images: string[];
  category: string;
  active?: boolean;
  sourceUrl?: string;
  modelUrl?: string;
  stock?: number;
  tags?: string[];
  technical?: ProductTechnicalSpec;
  baseDimensions?: ProductDimensions;
  /** Oculta o bloco de dimensões na página pública do produto. */
  hideDimensions?: boolean;
  createdAt?: FirestoreDate;
  updatedAt?: FirestoreDate;
}

export interface Category {
  id: string;
  name: string;
  slug?: string;
  parentId?: string | null;
  image?: string;
  description?: string;
  order?: number;
  active?: boolean;
  createdAt?: FirestoreDate;
  updatedAt?: FirestoreDate;
}

export interface Material {
  id: string;
  name: string;
  type?: string;
  color: string;
  desc?: string;
  priceMult?: number;
  pricePerGram?: number;
  pricePerKg?: number;
  inStock?: boolean;
}

export interface ShowcaseItem {
  id: string;
  image: string;
  title: string;
  category?: string;
  description?: string;
  subtitle?: string;
  link?: string;
  active?: boolean;
}

export interface Coupon {
  id: string;
  code: string;
  type: "percentage" | "fixed";
  value: number;
  minOrderValue?: number;
  maxUses?: number | null;
  usedCount?: number;
  active: boolean;
  description?: string;
  expiresAt?: Timestamp | null;
  createdAt?: FirestoreDate;
}

export interface Customer {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  tags?: string[];
  address?: string;
  photoURL?: string;
  createdAt?: FirestoreDate;
  updatedAt?: FirestoreDate;
}

export interface Ticket {
  id: string;
  userId?: string;
  userName?: string;
  userEmail?: string | null;
  email?: string;
  phone?: string;
  subject?: string;
  message?: string;
  status?: string;
  fileName?: string;
  materialId?: string;
  infill?: number;
  estimatedPrice?: number;
  total?: number;
  weight?: number;
  printTime?: string;
  notes?: string;
  adminNotes?: string;
  createdAt?: FirestoreDate;
  updatedAt?: FirestoreDate;
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category?: string;
  active?: boolean;
  createdAt?: FirestoreDate;
  updatedAt?: FirestoreDate;
}

export interface AuditLog {
  id: string;
  action?: string;
  details?: string;
  adminId?: string;
  userEmail?: string;
  ticketId?: string;
  orderId?: string;
  quoteId?: string;
  reply?: string;
  createdAt?: FirestoreDate;
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  userName?: string;
  userPhoto?: string | null;
  rating: number; // 1–5
  comment?: string;
  createdAt?: FirestoreDate;
}

export interface ErrorReport {
  id: string;
  message?: string;
  stack?: string;
  where?: string;
  route?: string;
  userAgent?: string;
  userEmail?: string | null;
  userId?: string | null;
  userNote?: string | null;
  userReported?: boolean;
  appVersion?: string;
  resolved?: boolean;
  createdAt?: FirestoreDate;
}

export interface GlobalSettings {
  promoBanner?: string;
  minOrderValue?: number;
  maintenanceMode?: boolean;
  flatRate?: number;
  [key: string]: unknown;
}
