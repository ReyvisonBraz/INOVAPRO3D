import { LogOut, User as UserIcon, ShoppingBag, Menu, X, Box, Calculator, Zap, BookOpen } from "lucide-react";
import { BrandLogo } from "../brand/BrandLogo";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "../ui/Button";
import { useAuth } from "../../contexts/AuthContext";
import { useCart } from "../../contexts/CartContext";
import { CartSheet } from "./CartSheet";
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function Navbar() {
  const { user, profile, loginWithGoogle, logout, updateProfile } = useAuth();
  const { items } = useCart();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Onboarding Phone Banner States
  const [showPhoneOnboarding, setShowPhoneOnboarding] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [isSavingPhone, setIsSavingPhone] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (user && profile && !profile.phone && !isDismissed) {
      setShowPhoneOnboarding(true);
    } else {
      setShowPhoneOnboarding(false);
    }
  }, [user, profile, isDismissed]);

  const navLinks = [
    { name: "Projetos", path: "/catalogo", icon: Box },
    { name: "Orçamento", path: "/upload", icon: Zap },
    { name: "Dicas", path: "/conhecimento", icon: BookOpen },
  ];

  const adminLinks = [
    { name: "Calculadora", path: "/calculadora", icon: Calculator },
  ];

  const handleLogin = async () => {
    try {
      await loginWithGoogle();
      // Restore attempted route from route location state
      const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
      if (from && from !== "/") {
        navigate(from, { replace: true });
      }
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleSavePhone = async (e: React.FormEvent) => {
    e.preventDefault();
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
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 h-16 flex items-center px-6 lg:px-8 justify-between ${
        scrolled
          ? 'bg-[#07080d]/95 backdrop-blur-xl border-b border-white/[0.06] py-2'
          : 'bg-transparent py-4'
      }`}>
        <Link to="/" className="group flex items-center">
          <BrandLogo markClassName="h-9 w-9" wordmarkClassName="text-lg" />
        </Link>

        <div className="hidden lg:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`text-[10px] font-black uppercase tracking-[0.2em] transition-colors relative py-1 ${
                location.pathname === link.path
                  ? 'text-white font-bold'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              {link.name}
              {location.pathname === link.path && (
                <motion.div
                  layoutId="active-nav"
                  className="absolute -bottom-1 left-0 right-0 h-px bg-white/30"
                />
              )}
            </Link>
          ))}
          {profile?.role === 'ADMIN' && (
            <>
              {adminLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`text-[10px] font-black uppercase tracking-[0.2em] transition-colors relative py-1 ${
                    location.pathname === link.path
                      ? 'text-white font-bold'
                      : 'text-white/50 hover:text-white'
                  }`}
                >
                  {link.name}
                </Link>
              ))}
              <Link
                to="/admin"
                className={`text-[10px] font-black uppercase tracking-[0.2em] transition-colors relative py-1 ${
                  location.pathname === '/admin'
                    ? 'text-white font-bold'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                Painel
                {location.pathname === '/admin' && (
                  <motion.div
                    layoutId="active-nav"
                    className="absolute -bottom-1 left-0 right-0 h-px bg-white/30"
                  />
                )}
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCartOpen(true)}
            className="relative p-2.5 bg-white/[0.06] border border-white/10 hover:bg-white/10 rounded-xl transition-colors"
          >
            <ShoppingBag className="w-5 h-5 text-white" />
            <AnimatePresence>
              {items.length > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-primary text-white text-[8px] font-black flex items-center justify-center rounded-full"
                >
                  {items.length}
                </motion.span>
              )}
            </AnimatePresence>
          </button>

          <div className="h-8 w-px bg-white/10 hidden sm:block" />

          {user ? (
            <div ref={profileMenuRef} className="flex items-center gap-3 relative">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-[10px] font-black text-white/90 uppercase tracking-widest truncate max-w-[120px]">{user.displayName}</span>
                <span className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em]">{profile?.role || 'OPERATOR'}</span>
              </div>
              <div className="relative">
                <img
                  src={user.photoURL || ''}
                  alt="Profile"
                  onClick={() => setIsProfileMenuOpen(v => !v)}
                  className={`w-10 h-10 rounded-[14px] border-2 transition-all cursor-pointer object-cover ${
                    isProfileMenuOpen
                      ? 'border-white/20'
                      : 'border-white/[0.06] hover:border-white/15'
                  }`}
                />

                {/* Desktop Dropdown */}
                <AnimatePresence>
                  {isProfileMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.97 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full right-0 mt-2 w-56 z-50 origin-top-right"
                    >
                      <div className="bg-[#0c0d14] backdrop-blur-2xl p-3 rounded-2xl border border-white/10 shadow-xl shadow-black/50">
                        <div className="px-4 py-3 border-b border-white/[0.06] mb-2">
                          <p className="text-[8px] text-white/20 font-black uppercase tracking-widest truncate">{user.email}</p>
                        </div>
                        <Link
                          to="/meus-pedidos"
                          onClick={() => setIsProfileMenuOpen(false)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.05] rounded-xl text-[10px] font-black uppercase tracking-widest transition-all text-white/60 hover:text-white"
                        >
                          <UserIcon className="w-4 h-4" />
                          Meus Pedidos
                        </Link>
                        <button
                          onClick={() => { logout(); setIsProfileMenuOpen(false); }}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-500/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-red-300 transition-all"
                        >
                          <LogOut className="w-4 h-4" />
                          Sair da Conta
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          ) : (
            <Button size="sm" isShimmer className="rounded-xl px-6 font-black text-[10px] tracking-widest" onClick={handleLogin}>
              ENTRAR
            </Button>
          )}

          <button
            className="lg:hidden p-2 text-white/60 hover:text-white transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-40 bg-[#07080d]/98 backdrop-blur-xl flex flex-col pt-32 px-12 lg:hidden"
          >
            <div className="flex flex-col gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className="text-2xl font-black uppercase tracking-tighter text-white/70 hover:text-white transition-colors"
                >
                  {link.name}
                </Link>
              ))}

              {profile?.role === 'ADMIN' && (
                <>
                  <div className="h-px bg-white/10 my-4" />
                  <Link
                    to="/admin"
                    className="text-2xl font-black uppercase tracking-tighter text-white/70 hover:text-white transition-colors"
                  >
                    Painel Admin
                  </Link>
                  <Link
                    to="/calculadora"
                    className="text-2xl font-black uppercase tracking-tighter text-white/50 hover:text-white transition-colors"
                  >
                    Calculadora
                  </Link>
                </>
              )}

              <div className="mt-8">
                {!user && (
                  <Button
                    size="sm"
                    isShimmer
                    className="rounded-2xl px-8 py-4 font-black text-sm tracking-widest bg-primary text-white w-full"
                    onClick={handleLogin}
                  >
                    ENTRAR
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <CartSheet isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
      {/* Spacer to prevent content jump */}
      <div className="h-16" />

      {/* Onboarding Banner */}
      <AnimatePresence>
        {showPhoneOnboarding && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="w-full bg-white/[0.03] border-b border-white/[0.06] backdrop-blur-md overflow-hidden relative z-40"
          >
            <div className="max-w-7xl mx-auto px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-2 w-2 relative shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
                </span>
                <p className="text-xs text-white/50 font-medium leading-relaxed">
                  Acompanhamento em tempo real: Cadastre seu WhatsApp para receber atualizações de fatiamento e status da fila.
                </p>
              </div>
              <form onSubmit={handleSavePhone} className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
                <input
                  type="tel"
                  placeholder="(00) 99999-9999"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  disabled={isSavingPhone}
                  className="bg-white/[0.04] border border-white/[0.08] text-white placeholder-white/20 text-xs rounded-xl px-4 py-2 focus:border-white/20 focus:outline-none transition-all w-full sm:w-44 font-mono"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSavingPhone}
                  className="rounded-xl px-4 py-2 font-black text-[10px] tracking-widest shrink-0"
                >
                  {isSavingPhone ? "SALVANDO..." : "ATIVAR"}
                </Button>
                <button
                  type="button"
                  onClick={() => setIsDismissed(true)}
                  className="text-xs text-white/25 hover:text-white/60 transition-all font-medium uppercase tracking-widest ml-1 shrink-0 px-2 py-1"
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
