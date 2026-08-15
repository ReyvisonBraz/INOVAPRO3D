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
import ShapeGrid from "./components/ui/ShapeGrid";
import GradualBlur from "./components/ui/GradualBlur";

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

  // Cores do ShapeGrid de fundo — seguem o tema claro/escuro.
  const gridBorderColor = theme === "dark" ? "rgba(148, 163, 184, 0.14)" : "rgba(15, 23, 42, 0.14)";
  const gridHoverColor = theme === "dark" ? "rgba(59, 130, 246, 0.18)" : "rgba(37, 99, 235, 0.14)";

  return (
    <AuthProvider>
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
            <ShapeGrid
              direction="diagonal"
              speed={0.25}
              squareSize={48}
              shape="hexagon"
              borderColor={gridBorderColor}
              hoverFillColor={gridHoverColor}
            />
            {/* GradualBlur nas bordas — desfoca os hexágonos no topo e no
                rodapé da tela, sumindo com o "degradê em x/y" que aparece
                no mobile e dando um fade suave ao fundo animado. */}
            <GradualBlur
              position="top"
              target="parent"
              height="6rem"
              strength={2}
              divCount={5}
              curve="bezier"
              className="bg-fade-top"
            />
            <GradualBlur
              position="bottom"
              target="parent"
              height="6rem"
              strength={2}
              divCount={5}
              curve="bezier"
              className="bg-fade-bottom"
            />
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
