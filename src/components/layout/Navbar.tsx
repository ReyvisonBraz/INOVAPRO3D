import { Cpu, LogOut, User as UserIcon, ShoppingBag, Menu, X, Box, Calculator, Zap, BookOpen } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "../ui/Button";
import { useAuth } from "../../contexts/AuthContext";
import { useCart } from "../../contexts/CartContext";
import { CartSheet } from "./CartSheet";
import React, { useState, useEffect } from "react";
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

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

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
        scrolled ? 'scrolled bg-surface/60 backdrop-blur-md border-b border-white/10 py-2' : 'bg-transparent py-4'
      }`}>
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center group-hover:rotate-12 transition-all duration-500 shadow-lg shadow-primary/20">
            <Box className="text-white w-5 h-5" />
          </div>
          <span className="font-display font-black text-xl uppercase tracking-tighter text-shimmer">
            INOVAPRO3D
          </span>
        </Link>
        
        <div className="hidden lg:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link 
              key={link.path}
              to={link.path} 
              className={`text-[10px] font-black uppercase tracking-[0.2em] transition-all hover:text-primary relative py-1 ${
                location.pathname === link.path ? 'text-primary' : 'text-white/40'
              }`}
            >
              {link.name}
              {location.pathname === link.path && (
                <motion.div 
                  layoutId="active-nav"
                  className="absolute -bottom-1 left-0 right-0 h-px bg-primary shadow-[0_0_8px_rgba(37,99,235,0.5)]"
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
                  className={`text-[10px] font-black uppercase tracking-[0.2em] transition-all hover:text-primary relative py-1 ${
                    location.pathname === link.path ? 'text-primary' : 'text-primary/70'
                  }`}
                >
                  {link.name}
                </Link>
              ))}
              <Link 
                to="/admin" 
                className={`text-[10px] font-black uppercase tracking-[0.2em] transition-all relative py-1 ${
                  location.pathname === '/admin' ? 'text-primary' : 'text-primary/70 hover:text-primary'
                }`}
              >
                Painel
                {location.pathname === '/admin' && (
                  <motion.div 
                    layoutId="active-nav"
                    className="absolute -bottom-1 left-0 right-0 h-px bg-primary shadow-[0_0_8px_rgba(37,99,235,0.5)]"
                  />
                )}
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-6">
          <button 
            onClick={() => setIsCartOpen(true)}
            className="relative p-3 hover:bg-white/5 rounded-2xl transition-colors group"
          >
            <ShoppingBag className="w-5 h-5 group-hover:text-primary transition-colors" />
            <AnimatePresence>
              {items.length > 0 && (
                <motion.span 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute top-2 right-2 w-4 h-4 bg-primary text-white text-[8px] font-black flex items-center justify-center rounded-full border-2 border-surface"
                >
                  {items.length}
                </motion.span>
              )}
            </AnimatePresence>
          </button>

          <div className="h-8 w-px bg-white/10 hidden sm:block" />

          {user ? (
            <div className="flex items-center gap-4 group/user relative">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-[10px] font-black text-white/90 uppercase tracking-widest truncate max-w-[120px]">{user.displayName}</span>
                <span className="text-[8px] font-black text-primary uppercase tracking-[0.2em]">{profile?.role || 'OPERATOR'}</span>
              </div>
              <div className="relative">
                <img 
                  src={user.photoURL || ''} 
                  alt="Profile" 
                  className="w-10 h-10 rounded-[14px] border-2 border-white/5 group-hover/user:border-primary/50 transition-all cursor-pointer object-cover"
                />
                
                {/* Desktop Dropdown */}
                <div className="absolute top-full right-0 mt-4 w-56 opacity-0 translate-y-2 group-hover/user:opacity-100 group-hover/user:translate-y-0 transition-all pointer-events-none group-hover/user:pointer-events-auto origin-top-right">
                   <div className="bg-surface/90 backdrop-blur-2xl p-3 rounded-2xl border border-white/10 shadow-2xl">
                      <div className="px-4 py-3 border-b border-white/5 mb-2">
                        <p className="text-[8px] text-white/20 font-black uppercase tracking-widest truncate">{user.email}</p>
                      </div>
                      <Link 
                        to="/meus-pedidos"
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                      >
                        <UserIcon className="w-4 h-4 text-primary" />
                        Meus Projetos
                      </Link>
                      <button 
                        onClick={() => logout()}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-500/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-red-400 transition-all"
                      >
                        <LogOut className="w-4 h-4" />
                        Sair do Terminal
                      </button>
                   </div>
                </div>
              </div>
            </div>
          ) : (
            <Button size="sm" isShimmer className="rounded-xl px-6 font-black text-[10px] tracking-widest" onClick={handleLogin}>
              ENTRAR
            </Button>
          )}

          <button 
            className="lg:hidden p-2 text-white/60 hover:text-white"
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
            className="fixed inset-0 z-40 bg-surface/95 backdrop-blur-2xl flex flex-col pt-32 px-12 lg:hidden"
          >
            <div className="flex flex-col gap-6">
              {navLinks.map((link) => (
                <Link 
                  key={link.path}
                  to={link.path} 
                  className="text-4xl font-display font-black uppercase tracking-tighter hover:text-primary transition-all text-white/50"
                >
                  {link.name}
                </Link>
              ))}
              
              {profile?.role === 'ADMIN' && (
                <>
                  <div className="h-px bg-white/10 my-4" />
                  <Link 
                    to="/admin" 
                    className="text-4xl font-display font-black uppercase tracking-tighter hover:text-primary transition-all text-primary"
                  >
                    Painel Admin
                  </Link>
                  <Link 
                    to="/calculadora" 
                    className="text-2xl font-display font-black uppercase tracking-tighter hover:text-primary transition-all text-primary/60"
                  >
                    Calculadora
                  </Link>
                </>
              )}
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
            className="w-full bg-primary/15 border-b border-primary/20 backdrop-blur-md overflow-hidden relative z-40"
          >
            <div className="max-w-7xl mx-auto px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-2 w-2 relative shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                <p className="text-xs text-white/80 font-medium leading-relaxed">
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
                  className="bg-white/5 border border-white/10 text-white placeholder-white/20 text-xs rounded-xl px-4 py-2 focus:border-primary/50 focus:outline-none transition-all w-full sm:w-44 font-mono"
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
                  className="text-xs text-white/40 hover:text-white/80 transition-all font-medium uppercase tracking-widest ml-1 shrink-0 px-2 py-1"
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
