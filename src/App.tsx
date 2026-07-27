import React, { Suspense, lazy, useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigationType,
} from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { HelmetProvider } from "react-helmet-async";
import { Navbar } from "./components/layout/Navbar";
import { Footer } from "./components/layout/Footer";
import { ErrorBoundary } from "./components/layout/ErrorBoundary";
import FloatingSupport from "./components/ui/FloatingSupport";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { CartProvider } from "./contexts/CartContext";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import CompleteProfileModal from "./components/auth/CompleteProfileModal";
import { WelcomeModalPresence } from "./components/welcome/WelcomeModal";
import { maybeShowInstallToast } from "./lib/pwaInstall";
import { OnboardingProvider, useOnboarding } from "./contexts/OnboardingContext";
import CookieConsent from "./components/CookieConsent";
import { trackPageView } from "./lib/analytics";

const WELCOME_KEY = "inovapro3d:welcomed";

const Home = lazy(() => import("./pages/public/Home"));
const Catalog = lazy(() => import("./pages/public/Catalog"));
const ProductDetail = lazy(() => import("./pages/public/ProductDetail"));
const FilamentCalculator = lazy(() => import("./pages/public/FilamentCalculator"));
const Checkout = lazy(() => import("./pages/public/Checkout"));
const MyOrders = lazy(() => import("./pages/public/MyOrders"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const Knowledge = lazy(() => import("./pages/public/Knowledge"));
const About = lazy(() => import("./pages/public/About"));
const NotFound = lazy(() => import("./pages/public/NotFound"));

function RouteLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6">
      <div className="flex items-center gap-3 text-primary">
        <div className="h-5 w-5 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Carregando</span>
      </div>
    </div>
  );
}

function PageWrapper({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    // Em retornos pelo histórico, deixe o navegador restaurar a posição anterior.
    // Navegações novas continuam começando no topo.
    if (navigationType !== "POP") {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [location.pathname, navigationType]);

  useEffect(() => {
    trackPageView(location.pathname + location.search);
  }, [location.pathname, location.search]);

  return <div>{children}</div>;
}

export default function App() {
  return (
    <HelmetProvider>
      <ThemeProvider>
        <Router>
          <RouterContent />
        </Router>
      </ThemeProvider>
    </HelmetProvider>
  );
}

function ProfileModalGate() {
  const { needsProfileCompletion } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  if (!needsProfileCompletion || dismissed) return null;
  return (
    <AnimatePresence>
      <CompleteProfileModal onDismiss={() => setDismissed(true)} />
    </AnimatePresence>
  );
}

/** Tela de boas-vindas para novos visitantes (1ª visita, não logado, fora do admin). */
function WelcomeGate() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const isAdminPage = location.pathname.startsWith("/admin");
  const { activeStep, advance } = useOnboarding();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (activeStep !== "welcome" || loading || open) return;
    let welcomed = false;
    try {
      welcomed = Boolean(localStorage.getItem(WELCOME_KEY));
    } catch {
      /* modo privado */
    }
    if (!user && !isAdminPage && !welcomed) {
      setOpen(true);
    } else {
      advance(); // não vai exibir → passa para o próximo aviso (cookies)
    }
  }, [activeStep, loading, open, user, isAdminPage, advance]);

  const handleClose = () => {
    try {
      localStorage.setItem(WELCOME_KEY, "1");
    } catch {
      /* modo privado */
    }
    setOpen(false);
    advance();
  };

  return <WelcomeModalPresence open={open} onClose={handleClose} />;
}

/** Convite de instalação do app — dispara no seu passo do fluxo (2ª+ visita). */
function InstallGate() {
  const { activeStep, advance } = useOnboarding();

  useEffect(() => {
    if (activeStep !== "install") return;
    maybeShowInstallToast(); // mostra o toast se fizer sentido; senão, no-op
    advance();
  }, [activeStep, advance]);

  return null;
}

function RouterContent() {
  const location = useLocation();
  const isAdminPage = location.pathname.startsWith("/admin");
  const { theme } = useTheme();

  return (
    <AuthProvider>
      <CartProvider>
        <div className="relative min-h-screen selection:bg-primary/30 text-foreground bg-surface transition-colors duration-300">
          <div className="noise" />
          {/* BACKGROUND EFFECTS — radial-gradients em vez de filter: blur().
              O gradiente já nasce difuso, então não há camada para o
              compositor re-desfocar enquanto o conteúdo rola por cima. */}
          <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[radial-gradient(circle,rgba(37,99,235,0.10),transparent_70%)]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-[radial-gradient(circle,rgba(30,64,175,0.10),transparent_70%)]" />
            <div className="absolute inset-0 opacity-70 bg-[linear-gradient(to_right,#64748b18_1px,transparent_1px),linear-gradient(to_bottom,#64748b18_1px,transparent_1px)] bg-[size:24px_24px]" />
          </div>

          {!isAdminPage && (
            <header>
              <Navbar />
            </header>
          )}

          <main className="relative">
            <ErrorBoundary>
              <Suspense fallback={<RouteLoader />}>
                <Routes>
                  <Route
                    path="/"
                    element={
                      <PageWrapper>
                        <Home />
                      </PageWrapper>
                    }
                  />
                  <Route
                    path="/catalogo"
                    element={
                      <PageWrapper>
                        <Catalog />
                      </PageWrapper>
                    }
                  />
                  <Route
                    path="/produto/:id"
                    element={
                      <PageWrapper>
                        <ProductDetail />
                      </PageWrapper>
                    }
                  />
                  <Route
                    path="/calculadora"
                    element={
                      <ProtectedRoute requireAdmin>
                        <PageWrapper>
                          <FilamentCalculator />
                        </PageWrapper>
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/upload" element={<Navigate to="/catalogo" replace />} />
                  <Route
                    path="/checkout"
                    element={
                      <PageWrapper>
                        <Checkout />
                      </PageWrapper>
                    }
                  />
                  <Route
                    path="/meus-pedidos"
                    element={
                      <ProtectedRoute>
                        <PageWrapper>
                          <MyOrders />
                        </PageWrapper>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin"
                    element={
                      <ProtectedRoute requireAdmin>
                        <PageWrapper>
                          <AdminDashboard />
                        </PageWrapper>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/conhecimento"
                    element={
                      <PageWrapper>
                        <Knowledge />
                      </PageWrapper>
                    }
                  />
                  <Route
                    path="/sobre"
                    element={
                      <PageWrapper>
                        <About />
                      </PageWrapper>
                    }
                  />
                  <Route
                    path="*"
                    element={
                      <PageWrapper>
                        <NotFound />
                      </PageWrapper>
                    }
                  />
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </main>

          {!isAdminPage && (
            <footer>
              <Footer />
            </footer>
          )}

          {!isAdminPage && <FloatingSupport />}
          <Toaster
            position="bottom-center"
            richColors
            theme={theme}
            toastOptions={{ duration: 2800 }}
          />
          <ProfileModalGate />
          <OnboardingProvider>
            <WelcomeGate />
            <CookieConsent />
            <InstallGate />
          </OnboardingProvider>
        </div>
      </CartProvider>
    </AuthProvider>
  );
}
