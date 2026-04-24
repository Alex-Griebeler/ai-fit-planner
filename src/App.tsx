import { lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRoute } from "@/components/AdminRoute";
import { ParQGate } from "@/components/ParQGate";
import { BottomNav } from "@/components/BottomNav";
import { Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useScrollToTop } from '@/hooks/useScrollToTop';
// Lazy load pages for better performance
const Index = lazy(() => import('./pages/Index'));
const Login = lazy(() => import('./pages/Login'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const Result = lazy(() => import('./pages/Result'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings = lazy(() => import('./pages/Settings'));
const WorkoutExecution = lazy(() => import('./pages/WorkoutExecution'));
// WorkoutPreview removed from main flow - direct navigation to WorkoutExecution
const Pricing = lazy(() => import('./pages/Pricing'));
const Progress = lazy(() => import('./pages/Progress'));
const WorkoutComplete = lazy(() => import('./pages/WorkoutComplete'));
const Achievements = lazy(() => import('./pages/Achievements'));
const NotFound = lazy(() => import('./pages/NotFound'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const TermsOfUse = lazy(() => import('./pages/TermsOfUse'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const ParQ = lazy(() => import('./pages/ParQ'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minuto
      retry: 2,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Loading fallback component - memoized to prevent ref warnings
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background" role="status" aria-label="Carregando">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

// Page transition wrapper - Apple-style spring physics
function PageTransition({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  
  return (
    <motion.div
      key={location.pathname}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="min-h-screen"
    >
      {children}
    </motion.div>
  );
}

// Scroll to top on route change
function ScrollToTopWrapper({ children }: { children: React.ReactNode }) {
  useScrollToTop();
  return <>{children}</>;
}

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} storageKey="naifit-theme">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
        <BrowserRouter>
          <ScrollToTopWrapper>
            <Suspense fallback={<PageLoader />}>
              <PageTransition>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute>
                        <ParQGate>
                          <Dashboard />
                        </ParQGate>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/onboarding"
                    element={
                      <ProtectedRoute>
                        <ParQGate>
                          <Onboarding />
                        </ParQGate>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/result"
                    element={
                      <ProtectedRoute>
                        <ParQGate>
                          <Result />
                        </ParQGate>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/settings"
                    element={
                      <ProtectedRoute>
                        <ParQGate>
                          <Settings />
                        </ParQGate>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/workout"
                    element={
                      <ProtectedRoute>
                        <ParQGate>
                          <WorkoutExecution />
                        </ParQGate>
                      </ProtectedRoute>
                    }
                  />
                  {/* /workout-preview route removed - users now go directly to /workout */}
                  <Route path="/pricing" element={<Pricing />} />
                  <Route
                    path="/progress"
                    element={
                      <ProtectedRoute>
                        <ParQGate>
                          <Progress />
                        </ParQGate>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/workout-complete"
                    element={
                      <ProtectedRoute>
                        <ParQGate>
                          <WorkoutComplete />
                        </ParQGate>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/achievements"
                    element={
                      <ProtectedRoute>
                        <ParQGate>
                          <Achievements />
                        </ParQGate>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin"
                    element={
                      <AdminRoute>
                        <ParQGate>
                          <AdminDashboard />
                        </ParQGate>
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/par-q"
                    element={
                      <ProtectedRoute>
                        <ParQ />
                      </ProtectedRoute>
                    }
                  />
                  {/* Public legal pages */}
                  <Route path="/termos" element={<TermsOfUse />} />
                  <Route path="/privacidade" element={<PrivacyPolicy />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </PageTransition>
            </Suspense>
            <BottomNav />
          </ScrollToTopWrapper>
        </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
