import React from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Navbar } from "./components/layout/Navbar";
import { Footer } from "./components/layout/Footer";
import { DebugMarker } from "./components/layout/DebugMarker";
import { ErrorBoundary } from "./components/layout/ErrorBoundary";
import FloatingSupport from "./components/ui/FloatingSupport";
import { Toaster } from "sonner";
import { AuthProvider } from "./contexts/AuthContext";
import { CartProvider } from "./contexts/CartContext";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";

// Pages
import Home from "./pages/public/Home";
import Catalog from "./pages/public/Catalog";
import ProductDetail from "./pages/public/ProductDetail";
import CustomQuote from "./pages/public/CustomQuote";
import FilamentCalculator from "./pages/public/FilamentCalculator";
import Checkout from "./pages/public/Checkout";
import MyOrders from "./pages/public/MyOrders";
import AdminDashboard from "./pages/admin/AdminDashboard";
import Knowledge from "./pages/public/Knowledge";

function PageWrapper({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.02 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <Router>
        <RouterContent />
      </Router>
    </ThemeProvider>
  );
}

function RouterContent() {
  const location = useLocation();
  const isAdminPage = location.pathname.startsWith('/admin');
  const { theme } = useTheme();

  return (
    <AuthProvider>
      <CartProvider>
        <ErrorBoundary>
        <div className="relative min-h-screen selection:bg-primary/30 text-foreground bg-surface transition-colors duration-300">
          <div className="noise" />
          {/* BACKGROUND EFFECTS */}
          <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-primary-dark/10 rounded-full blur-[100px]" />
            <div className="absolute inset-0 opacity-70 bg-[linear-gradient(to_right,#64748b18_1px,transparent_1px),linear-gradient(to_bottom,#64748b18_1px,transparent_1px)] bg-[size:24px_24px]" />
          </div>

          {!isAdminPage && (
            <header>
              <Navbar />
            </header>
          )}

          <main className="relative">
            <Routes>
              <Route path="/" element={<PageWrapper><Home /></PageWrapper>} />
              <Route path="/catalogo" element={<PageWrapper><Catalog /></PageWrapper>} />
              <Route path="/produto/:id" element={<PageWrapper><ProductDetail /></PageWrapper>} />
              <Route path="/calculadora" element={<PageWrapper><FilamentCalculator /></PageWrapper>} />
              <Route path="/upload" element={<PageWrapper><CustomQuote /></PageWrapper>} />
              <Route 
                path="/checkout" 
                element={
                  <ProtectedRoute>
                    <PageWrapper><Checkout /></PageWrapper>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/meus-pedidos" 
                element={
                  <ProtectedRoute>
                    <PageWrapper><MyOrders /></PageWrapper>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin" 
                element={
                  <ProtectedRoute requireAdmin>
                    <PageWrapper><AdminDashboard /></PageWrapper>
                  </ProtectedRoute>
                } 
              />
              <Route path="/conhecimento" element={<PageWrapper><Knowledge /></PageWrapper>} />
              <Route path="*" element={<PageWrapper><Home /></PageWrapper>} />
            </Routes>
          </main>

          {!isAdminPage && (
            <footer>
              <Footer />
            </footer>
          )}
          
          <FloatingSupport />
          <Toaster position="top-right" richColors expand theme={theme} />
          <DebugMarker />
        </div>
        </ErrorBoundary>
      </CartProvider>
    </AuthProvider>
  );
}
