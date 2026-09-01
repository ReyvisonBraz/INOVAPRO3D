import React, { Suspense, lazy, useEffect, useRef, useState } from "react";
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
import { ErrorBoundary } from "./components/layout/ErrorBoundary";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { CartProvider } from "./contexts/CartContext";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { OnboardingProvider, useOnboarding } from "./contexts/OnboardingContext";
import { trackPageView } from "./lib/analytics";
import { maybeShowInstallToast } from "./lib/pwaInstall";
import Home from "./pages/public/Home";

const WELCOME_KEY = "inovapro3d:welcomed";

const Catalog = lazy(() => import("./pages/public/Catalog"));
const ProductDetail = lazy(() => import("./pages/public/ProductDetail"));
const FilamentCalculator = lazy(() => import("./pages/public/FilamentCalculator"));
const Checkout = lazy(() => import("./pages/public/Checkout"));
const MyOrders = lazy(() => import("./pages/public/MyOrders"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const Knowledge = lazy(() => import("./pages/public/Knowledge"));
const About = lazy(() => import("./pages/public/About"));
const NotFound = lazy(() => import("./pages/public/NotFound"));
const AppBackgroundEffects = lazy(() => import("./components/layout/AppBackgroundEffects"));
const CompleteProfileModal = lazy(() => import("./components/auth/CompleteProfileModal"));
const CookieConsent = lazy(() => import("./components/CookieConsent"));
const FloatingSupport = lazy(() => import("./components/ui/FloatingSupport"));
const Footer = lazy(() =>
  import("./components/layout/Footer").then((module) => ({ default: module.Footer })),
);
const Toaster = lazy(() => import("sonner").then((module) => ({ default: module.Toaster })));
const WelcomeModalPresence = lazy(() =>
  import("./components/welcome/WelcomeModal").then((module) => ({
    default: module.WelcomeModalPresence,
  })),
);

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
      <Suspense fallback={null}>
        <CompleteProfileModal onDismiss={() => setDismissed(true)} />
      </Suspense>
    </AnimatePresence>
  );
}

/** Tela de boas-vindas para novos visitantes (1ª visita, não logado, fora do admin). */
function WelcomeGate() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const isAdminPage = location.pathname.startsWith("/admin");
  const { activeStep, advance } = useOnboarding();
  const [welcomed, setWelcomed] = useState(() => {
    try {
      return Boolean(localStorage.getItem(WELCOME_KEY));
    } catch {
      return false;
    }
  });
  const skippedWelcome = useRef(false);
  const open = activeStep === "welcome" && !loading && !user && !isAdminPage && !welcomed;

  useEffect(() => {
    if (activeStep !== "welcome" || loading || open || skippedWelcome.current) return;
    skippedWelcome.current = true;
    advance(); // não vai exibir → passa para o próximo aviso (cookies)
  }, [activeStep, loading, open, advance]);

  const handleClose = () => {
    try {
      localStorage.setItem(WELCOME_KEY, "1");
    } catch {
      /* modo privado */
    }
    setWelcomed(true);
    advance();
  };

  return (
    <Suspense fallback={null}>
      <WelcomeModalPresence open={open} onClose={handleClose} />
    </Suspense>
  );
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

function DeferredCookieConsent() {
  const { activeStep } = useOnboarding();
  if (activeStep !== "cookies") return null;

  return (
    <Suspense fallback={null}>
      <CookieConsent />
    </Suspense>
  );
}

function DeferredFooter() {
  const footerRef = useRef<HTMLElement>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const footer = footerRef.current;
    if (!footer) return;

    if (!("IntersectionObserver" in window)) {
      const timer = globalThis.setTimeout(() => setEnabled(true), 0);
      return () => globalThis.clearTimeout(timer);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setEnabled(true);
        observer.disconnect();
      },
      { rootMargin: "800px 0px" },
    );
    observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  return (
    <footer ref={footerRef} className="min-h-px">
      {enabled && (
        <Suspense fallback={null}>
          <Footer />
        </Suspense>
      )}
    </footer>
  );
}

function useDeferredMount(delay = 1200) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setEnabled(true), delay);
    return () => window.clearTimeout(timer);
  }, [delay]);

  return enabled;
}

function usePrefersReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(() =>
    typeof window === "undefined"
      ? false
      : window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = (event: MediaQueryListEvent) => setReducedMotion(event.matches);
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  return reducedMotion;
}

function RouterContent() {
  const location = useLocation();
  const isAdminPage = location.pathname.startsWith("/admin");
  const requiresAuth =
    isAdminPage ||
    location.pathname === "/calculadora" ||
    location.pathname === "/checkout" ||
    location.pathname === "/meus-pedidos";
  const { theme } = useTheme();
  const deferredMountReady = useDeferredMount();
  const reducedMotion = usePrefersReducedMotion();
  const showVisualEffects = deferredMountReady && !reducedMotion;

  return (
    <AuthProvider eager={requiresAuth}>
      <CartProvider>
        {/* `isolate` cria um stacking context: o fundo fixo em z-[-1] pinta
            acima do bg-surface e abaixo do conteúdo (sem isso, o background
            opaco do wrapper encobriria a camada). */}
        <div className="relative isolate min-h-screen selection:bg-primary/30 text-foreground bg-surface transition-colors duration-300">
          <div className="noise" />
          {/* BACKGROUND EFFECTS — ShapeGrid (canvas animado) + glow radial.
              O canvas já nasce nítido, sem blur, e a grade estática antiga
              foi substituída pela malha hexagonal animada. */}
          <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[radial-gradient(circle,rgba(37,99,235,0.10),transparent_70%)]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-[radial-gradient(circle,rgba(30,64,175,0.10),transparent_70%)]" />
            {showVisualEffects && (
              <Suspense fallback={null}>
                <AppBackgroundEffects theme={theme} />
              </Suspense>
            )}
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

          {!isAdminPage && <DeferredFooter />}

          {!isAdminPage && (
            <Suspense fallback={null}>
              <FloatingSupport />
            </Suspense>
          )}
          {deferredMountReady && (
            <Suspense fallback={null}>
              <Toaster
                position="bottom-center"
                richColors
                theme={theme}
                toastOptions={{ duration: 2800 }}
              />
            </Suspense>
          )}
          <ProfileModalGate />
          <OnboardingProvider>
            <WelcomeGate />
            <DeferredCookieConsent />
            <InstallGate />
          </OnboardingProvider>
        </div>
      </CartProvider>
    </AuthProvider>
  );
}
