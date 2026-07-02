import {
  ArrowRight,
  BookOpen,
  Box,
  Building2,
  Calculator,
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  Home,
  type LucideIcon,
  LogOut,
  Menu,
  ShoppingBag,
  User as UserIcon,
  X,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { BrandLogo } from "../brand/BrandLogo";
import { Button } from "../ui/Button";
import { CartSheet } from "./CartSheet";
import { PushBell } from "../notifications/PushBell";
import { useAuth } from "../../contexts/AuthContext";
import { useCart } from "../../contexts/CartContext";
import { buildCategoryTree, categoryNameToSlug, type CategoryTreeNode } from "../../lib/categoryTree";
import { useFirestoreCollection } from "../../hooks/useFirestoreCollection";
import type { Category } from "../../types/domain";

export function Navbar() {
  const { user, profile, loginWithGoogle, logout, updateProfile } = useAuth();
  const { items } = useCart();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showPhoneOnboarding, setShowPhoneOnboarding] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [isSavingPhone, setIsSavingPhone] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setShowPhoneOnboarding(Boolean(user && profile && !profile.phone && !isDismissed));
  }, [user, profile, isDismissed]);

  const { data: categories } = useFirestoreCollection<Category>("categories", {
    transform: (cats) => cats.filter(c => c.active !== false),
    silent: true,
  });
  const [categoryTree, setCategoryTree] = useState<CategoryTreeNode[]>([]);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const catalogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCategoryTree(buildCategoryTree(categories));
  }, [categories]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (catalogRef.current && !catalogRef.current.contains(event.target as Node)) {
        setIsCatalogOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const navLinks = [
    { name: "Início", path: "/", icon: Home },
    { name: "Sobre", path: "/sobre", icon: Building2 },
    { name: "Como Funciona", path: "/conhecimento", icon: BookOpen },
  ];

  const adminLinks = [{ name: "Calculadora", path: "/calculadora", icon: Calculator }];

  const handleLogin = async () => {
    try {
      await loginWithGoogle();
      const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
      if (from && from !== "/") {
        navigate(from, { replace: true });
      }
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleSavePhone = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!phoneInput.trim()) return;
    setIsSavingPhone(true);
    try {
      await updateProfile({ phone: phoneInput.trim() });
      setShowPhoneOnboarding(false);
    } catch (err) {
      console.error("Failed to save phone number:", err);
    } finally {
      setIsSavingPhone(false);
    }
  };

  return (
    <>
      <nav
        className={`fixed left-0 right-0 top-0 z-50 flex h-16 items-center justify-between px-4 transition-all duration-500 sm:px-6 lg:px-8 ${
          scrolled
            ? "border-b border-white/[0.08] bg-[#020617]/78 py-2 shadow-2xl shadow-black/20 backdrop-blur-xl"
            : "bg-transparent py-4"
        }`}
      >
        <Link to="/" className="group flex items-center">
          <BrandLogo markClassName="h-9 w-9" wordmarkClassName="text-lg" />
        </Link>

        <div className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/[0.055] p-1 shadow-2xl shadow-black/20 backdrop-blur-2xl lg:flex">
          {navLinks.map((link) => (
            <NavPill
              key={link.path}
              name={link.name}
              path={link.path}
              icon={link.icon}
              active={location.pathname === link.path}
            />
          ))}

          <div ref={catalogRef} className="relative">
            <button
              onClick={() => setIsCatalogOpen(v => !v)}
              className={`relative flex h-10 items-center gap-2 rounded-full px-4 text-[10px] font-black uppercase tracking-[0.16em] transition-all ${
                location.pathname === "/catalogo" || isCatalogOpen
                  ? "bg-white text-slate-950 shadow-lg shadow-white/10"
                  : "text-white/[0.52] hover:bg-white/[0.08] hover:text-white"
              }`}
            >
              <Folder className="h-3.5 w-3.5" />
              Catálogo
              <ChevronDown className={`h-3 w-3 transition-transform ${isCatalogOpen ? "rotate-180" : ""}`} />
              {(location.pathname === "/catalogo" || isCatalogOpen) && (
                <motion.div layoutId="active-nav" className="absolute inset-0 -z-10 rounded-full bg-white" />
              )}
            </button>

            <AnimatePresence>
              {isCatalogOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-64 origin-top"
                >
                  <div className="rounded-2xl border border-white/10 bg-[#0c0d14] p-2 shadow-xl shadow-black/50 backdrop-blur-2xl max-h-[60vh] overflow-y-auto no-scrollbar">
                    <Link
                      to="/catalogo"
                      onClick={() => setIsCatalogOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest text-primary/80 hover:bg-white/[0.05] hover:text-primary transition-all mb-1"
                    >
                      <Box className="h-4 w-4" />
                      Ver todo o catálogo
                    </Link>

                    {categoryTree.length === 0 && (
                      <p className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-dim text-center">
                        Nenhuma pasta criada
                      </p>
                    )}

                    {categoryTree.map(node => (
                      <CatalogDropdownItem
                        key={node.category.id}
                        node={node}
                        depth={0}
                        onClose={() => setIsCatalogOpen(false)}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {profile?.role === "ADMIN" && (
            <>
              {adminLinks.map((link) => (
                <NavPill
                  key={link.path}
                  name={link.name}
                  path={link.path}
                  icon={link.icon}
                  active={location.pathname === link.path}
                />
              ))}
              <NavPill name="Painel" path="/admin" active={location.pathname === "/admin"} />
            </>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/catalogo"
            className="group hidden h-10 items-center gap-2 rounded-full bg-white px-4 text-[10px] font-black uppercase tracking-[0.16em] text-slate-950 shadow-xl shadow-white/10 transition-transform hover:-translate-y-0.5 lg:flex"
          >
            Comprar
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>

          <PushBell />

          <button
            onClick={() => setIsCartOpen(true)}
            className="relative rounded-2xl border border-white/10 bg-white/[0.06] p-2.5 transition-colors hover:bg-white/10"
            aria-label="Abrir carrinho"
          >
            <ShoppingBag className="h-5 w-5 text-white" />
            <AnimatePresence>
              {items.length > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[8px] font-black text-white"
                >
                  {items.length}
                </motion.span>
              )}
            </AnimatePresence>
          </button>

          <div className="hidden h-8 w-px bg-white/10 sm:block" />

          {user ? (
            <ProfileMenu
              user={user}
              profileRole={profile?.role || "OPERATOR"}
              isOpen={isProfileMenuOpen}
              setIsOpen={setIsProfileMenuOpen}
              logout={logout}
              refEl={profileMenuRef}
            />
          ) : (
            <Button
              size="sm"
              isShimmer
              className="rounded-2xl px-4 text-[10px] font-black tracking-widest sm:px-6"
              onClick={handleLogin}
            >
              ENTRAR
            </Button>
          )}

          <button
            className="rounded-2xl border border-white/10 bg-white/[0.05] p-2 text-white/70 transition-colors hover:text-white lg:hidden"
            onClick={() => setIsMobileMenuOpen((value) => !value)}
            aria-label={isMobileMenuOpen ? "Fechar menu" : "Abrir menu"}
          >
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-40 flex flex-col bg-[#020617]/98 px-6 pt-24 backdrop-blur-2xl lg:hidden"
          >
            <div className="mb-7 rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
              <p className="text-[9px] font-black uppercase tracking-[0.24em] text-primary">Comece aqui</p>
              <h2 className="mt-3 font-display text-3xl font-black uppercase leading-none text-white">
                Abra o catálogo e escolha sua peça.
              </h2>
              <Link
                to="/catalogo"
                className="mt-5 flex h-12 items-center justify-center gap-2 rounded-2xl bg-white text-[10px] font-black uppercase tracking-[0.18em] text-slate-950"
              >
                Ver catálogo
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="flex flex-col gap-3 overflow-y-auto no-scrollbar" style={{ maxHeight: "calc(100vh - 280px)" }}>
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-4 text-sm font-black uppercase tracking-[0.16em] text-white/70 transition-colors hover:text-white"
                >
                  <link.icon className="h-5 w-5 text-primary" />
                  {link.name}
                </Link>
              ))}

              <Link
                to="/catalogo"
                className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-4 text-sm font-black uppercase tracking-[0.16em] text-white/70 transition-colors hover:text-white"
              >
                <Folder className="h-5 w-5 text-primary" />
                Catálogo
              </Link>

              {categoryTree.map(node => (
                <MobileCategoryItem key={node.category.id} node={node} depth={0} onClose={() => setIsMobileMenuOpen(false)} />
              ))}

              {profile?.role === "ADMIN" && (
                <>
                  <div className="my-3 h-px bg-white/10" />
                  <Link
                    to="/admin"
                    className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-4 text-sm font-black uppercase tracking-[0.16em] text-white/70 transition-colors hover:text-white"
                  >
                    Painel Admin
                  </Link>
                  <Link
                    to="/calculadora"
                    className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-4 text-sm font-black uppercase tracking-[0.16em] text-white/70 transition-colors hover:text-white"
                  >
                    Calculadora
                  </Link>
                </>
              )}

              {user ? (
                <>
                  <div className="my-3 h-px bg-white/10" />
                  <Link
                    to="/meus-pedidos"
                    className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-4 text-sm font-black uppercase tracking-[0.16em] text-white/70 transition-colors hover:text-white"
                  >
                    <UserIcon className="h-5 w-5 text-primary" />
                    Meus Pedidos
                  </Link>
                  <button
                    type="button"
                    onClick={() => { logout(); setIsMobileMenuOpen(false); }}
                    className="flex w-full items-center gap-3 rounded-2xl border border-red-500/10 bg-red-500/5 px-5 py-4 text-sm font-black uppercase tracking-[0.16em] text-red-400 transition-colors hover:bg-red-500/10"
                  >
                    <LogOut className="h-5 w-5" />
                    Sair da Conta
                  </button>
                </>
              ) : (
                <Button
                  size="sm"
                  isShimmer
                  className="mt-4 w-full rounded-2xl bg-primary px-8 py-4 text-sm font-black tracking-widest text-white"
                  onClick={handleLogin}
                >
                  ENTRAR
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <CartSheet isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
      <div className="h-16" />

      <AnimatePresence>
        {showPhoneOnboarding && (
          <motion.div
            initial={{ maxHeight: 0, opacity: 0 }}
            animate={{ maxHeight: 200, opacity: 1 }}
            exit={{ maxHeight: 0, opacity: 0 }}
            className="relative z-40 w-full overflow-hidden border-b border-white/[0.06] bg-white/[0.03] backdrop-blur-md"
          >
            <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-3 sm:flex-row">
              <div className="flex items-center gap-3">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
                </span>
                <p className="text-xs font-medium leading-relaxed text-white/50">
                  Acompanhamento em tempo real: cadastre seu WhatsApp para receber atualizações da fila.
                </p>
              </div>
              <form onSubmit={handleSavePhone} className="flex w-full shrink-0 items-center justify-end gap-2 sm:w-auto">
                <input
                  type="tel"
                  placeholder="(00) 99999-9999"
                  value={phoneInput}
                  onChange={(event) => setPhoneInput(event.target.value)}
                  disabled={isSavingPhone}
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2 font-mono text-xs text-white outline-none transition-all placeholder:text-white/20 focus:border-white/20 sm:w-44"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSavingPhone}
                  className="shrink-0 rounded-xl px-4 py-2 text-[10px] font-black tracking-widest"
                >
                  {isSavingPhone ? "SALVANDO..." : "ATIVAR"}
                </Button>
                <button
                  type="button"
                  onClick={() => setIsDismissed(true)}
                  className="ml-1 shrink-0 px-2 py-1 text-xs font-medium uppercase tracking-widest text-white/25 transition-all hover:text-white/60"
                >
                  Ignorar
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function NavPill({
  name,
  path,
  active,
  icon: Icon,
}: {
  name: string;
  path: string;
  active: boolean;
  icon?: LucideIcon;
}) {
  return (
    <Link
      to={path}
      className={`relative flex h-10 items-center gap-2 rounded-full px-4 text-[10px] font-black uppercase tracking-[0.16em] transition-all ${
        active ? "bg-white text-slate-950 shadow-lg shadow-white/10" : "text-white/[0.52] hover:bg-white/[0.08] hover:text-white"
      }`}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {name}
      {active && <motion.div layoutId="active-nav" className="absolute inset-0 -z-10 rounded-full bg-white" />}
    </Link>
  );
}

function CatalogDropdownItem({
  node,
  depth,
  onClose,
}: {
  node: CategoryTreeNode;
  depth: number;
  onClose: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = node.children.length > 0;
  const slug = categoryNameToSlug(node.category.name);

  return (
    <div>
      <Link
        to={`/catalogo?categoria=${slug}`}
        onClick={onClose}
        className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-white/60 hover:bg-white/[0.05] hover:text-white transition-all"
        style={{ paddingLeft: `${12 + depth * 16}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setExpanded(v => !v); }}
            className="p-0.5 rounded hover:bg-white/10 transition-colors"
          >
            {expanded ? <FolderOpen className="h-3.5 w-3.5 text-primary" /> : <Folder className="h-3.5 w-3.5 text-dim" />}
          </button>
        ) : (
          <Folder className="h-3.5 w-3.5 text-dim" />
        )}
        <span className="flex-1 truncate">{node.category.name}</span>
        {hasChildren && (
          <ChevronRight className={`h-3 w-3 text-dim transition-transform ${expanded ? "rotate-90" : ""}`} />
        )}
      </Link>

      <AnimatePresence>
        {expanded && hasChildren && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {node.children.map(child => (
              <CatalogDropdownItem
                key={child.category.id}
                node={child}
                depth={depth + 1}
                onClose={onClose}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MobileCategoryItem({
  node,
  depth,
  onClose,
}: {
  node: CategoryTreeNode;
  depth: number;
  onClose: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = node.children.length > 0;
  const slug = categoryNameToSlug(node.category.name);

  return (
    <div>
      <Link
        to={`/catalogo?categoria=${slug}`}
        onClick={onClose}
        className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-3.5 text-xs font-black uppercase tracking-[0.14em] text-white/60 transition-colors hover:text-white"
        style={{ marginLeft: `${depth * 12}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setExpanded(v => !v); }}
            className="p-0.5"
          >
            {expanded ? <FolderOpen className="h-4 w-4 text-primary" /> : <Folder className="h-4 w-4 text-dim" />}
          </button>
        ) : (
          <Folder className="h-4 w-4 text-dim" />
        )}
        <span className="flex-1">{node.category.name}</span>
        {hasChildren && (
          <ChevronDown className={`h-4 w-4 text-dim transition-transform ${expanded ? "rotate-180" : ""}`} />
        )}
      </Link>

      <AnimatePresence>
        {expanded && hasChildren && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {node.children.map(child => (
              <MobileCategoryItem
                key={child.category.id}
                node={child}
                depth={depth + 1}
                onClose={onClose}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProfileMenu({
  user,
  profileRole,
  isOpen,
  setIsOpen,
  logout,
  refEl,
}: {
  user: { displayName?: string | null; photoURL?: string | null; email?: string | null };
  profileRole: string;
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  logout: () => void;
  refEl: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div ref={refEl} className="relative flex items-center gap-3">
      <div className="hidden flex-col items-end sm:flex">
        <span className="max-w-[120px] truncate text-[10px] font-black uppercase tracking-widest text-white/90">
          {user.displayName}
        </span>
        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/30">{profileRole}</span>
      </div>
      <img
        src={user.photoURL || ""}
        alt="Perfil"
        onClick={() => setIsOpen((value) => !value)}
        className={`h-10 w-10 cursor-pointer rounded-2xl border-2 object-cover transition-all ${
          isOpen ? "border-white/20" : "border-white/[0.06] hover:border-white/[0.15]"
        }`}
      />

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full z-50 mt-2 w-56 origin-top-right"
          >
            <div className="rounded-2xl border border-white/10 bg-[#0c0d14] p-3 shadow-xl shadow-black/50 backdrop-blur-2xl">
              <div className="mb-2 border-b border-white/[0.06] px-4 py-3">
                <p className="truncate text-[8px] font-black uppercase tracking-widest text-white/20">{user.email}</p>
              </div>
              <Link
                to="/meus-pedidos"
                onClick={() => setIsOpen(false)}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white/60 transition-all hover:bg-white/[0.05] hover:text-white"
              >
                <UserIcon className="h-4 w-4" />
                Meus Pedidos
              </Link>
              <button
                onClick={() => {
                  logout();
                  setIsOpen(false);
                }}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest text-red-400 transition-all hover:bg-red-500/10 hover:text-red-300"
              >
                <LogOut className="h-4 w-4" />
                Sair da Conta
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
