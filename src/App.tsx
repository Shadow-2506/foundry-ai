import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Landing from '@/pages/Landing';
import Index from '@/pages/Index';
import Brain from '@/pages/Brain';
import Graph from '@/pages/Graph';
import Vault from '@/pages/Vault';
import TimeMachine from '@/pages/TimeMachine';
import Evolution from '@/pages/Evolution';
import Generator from '@/pages/Generator';
import Settings from '@/pages/Settings';
import DemoMode from '@/pages/DemoMode';
import Login from '@/pages/Login';
import Signup from '@/pages/Signup';
import Profile from '@/pages/Profile';
import NotFound from '@/pages/NotFound';
import { Toaster } from '@/components/ui/sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { parcleService } from '@/services/parcleService';
import { FoundryLogo } from '@/components/FoundryLogo';
import { APP_VERSION } from '@/lib/version';

const LOADING_STEPS = [
  'Loading Organizational Memory...',
  'Building Decision Graph...',
  'Analyzing Historical Context...',
  'Generating Insights...',
];

function LoadingScreen({ step }: { step: number }) {
  return (
    <motion.div
      key="loader"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.6, ease: 'easeInOut' } }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background overflow-hidden"
    >
      {/* Subtle radial background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 50% 50%, hsl(252 78% 67% / 0.07) 0%, transparent 70%)',
        }}
      />

      {/* Dot-grid texture overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage:
            'radial-gradient(hsl(var(--muted-foreground) / 0.15) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* Main content */}
      <div className="relative flex flex-col items-center gap-0">

        {/* Animated orbital rings behind the logo */}
        <div className="relative w-52 h-52 flex items-center justify-center mb-2">
          {/* Outermost ring */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0 rounded-full"
            style={{
              border: '1px solid hsl(252 78% 67% / 0.18)',
              borderTopColor: 'hsl(252 78% 67% / 0.55)',
            }}
          />

          {/* Mid ring counter-rotating */}
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            className="absolute rounded-full"
            style={{
              width: '76%',
              height: '76%',
              border: '1px solid hsl(252 78% 67% / 0.12)',
              borderBottomColor: 'hsl(252 78% 67% / 0.4)',
            }}
          />

          {/* Orbital dot on outer ring */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0"
            style={{ transformOrigin: 'center' }}
          >
            <div
              className="absolute"
              style={{
                top: '50%',
                left: '100%',
                transform: 'translate(-50%, -50%)',
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: 'hsl(142 71% 45%)',
                boxShadow: '0 0 8px hsl(142 71% 45% / 0.7)',
              }}
            />
          </motion.div>

          {/* Orbital dot on mid ring */}
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            className="absolute"
            style={{
              width: '76%',
              height: '76%',
              transformOrigin: 'center',
            }}
          >
            <div
              className="absolute"
              style={{
                top: 0,
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: 'hsl(38 92% 50%)',
                boxShadow: '0 0 8px hsl(38 92% 50% / 0.7)',
              }}
            />
          </motion.div>

          {/* Second orbital dot on mid ring, offset 180° */}
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            className="absolute"
            style={{
              width: '76%',
              height: '76%',
              transformOrigin: 'center',
            }}
          >
            <div
              className="absolute"
              style={{
                bottom: 0,
                left: '50%',
                transform: 'translate(-50%, 50%)',
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: 'hsl(252 78% 67%)',
                boxShadow: '0 0 8px hsl(252 78% 67% / 0.7)',
              }}
            />
          </motion.div>

          {/* Center: FoundryLogo icon with pulse */}
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="relative z-10 flex items-center justify-center"
          >
            {/* Soft glowing backdrop circle */}
            <motion.div
              animate={{ scale: [1, 1.12, 1], opacity: [0.25, 0.45, 0.25] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute rounded-full"
              style={{
                width: 96,
                height: 96,
                background: 'hsl(252 78% 67% / 0.15)',
              }}
            />
            {/* Logo itself */}
            <div className="text-primary">
              <FoundryLogo size={64} showText={false} />
            </div>
          </motion.div>
        </div>

        {/* Wordmark */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="flex items-baseline gap-1.5 mb-8"
        >
          <span className="text-foreground font-semibold text-2xl tracking-tight">
            Foundry
          </span>
          <span className="text-primary font-semibold text-2xl tracking-tight">
            AI
          </span>
        </motion.div>

        {/* Progress bar */}
        <div
          className="rounded-full overflow-hidden bg-primary/10"
          style={{ width: 220, height: 2 }}
        >
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={{ width: '0%' }}
            animate={{
              width: `${((step + 1) / LOADING_STEPS.length) * 100}%`,
            }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>

        {/* Step label */}
        <AnimatePresence mode="wait">
          <motion.p
            key={step}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
            className="mt-3 text-xs font-medium tracking-widest uppercase text-muted-foreground"
            style={{ letterSpacing: '0.12em' }}
          >
            {LOADING_STEPS[step]}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Version badge */}
      <div className="absolute bottom-4 right-4 text-xs text-muted-foreground/60">
        v{APP_VERSION}
      </div>
    </motion.div>
  );
}

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [loadingStep, setLoadingStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setLoadingStep(prev => (prev < LOADING_STEPS.length - 1 ? prev + 1 : prev));
    }, 500);

    const initializeApp = async () => {
      console.log('🚀 Initializing FoundryAI...');
      try {
        const parcleConn = await parcleService.connect();
        if (parcleConn.success) {
          console.log('✅ Parcle Connection: SUCCESS');
        } else {
          console.warn('❌ Parcle Connection: FAILED -', parcleConn.error);
        }
      } catch (err) {
        console.error('❌ Parcle Connection: UNEXPECTED ERROR -', err);
      }

      setTimeout(() => {
        setIsLoading(false);
        clearInterval(interval);
      }, 2000);
    };

    initializeApp();
    return () => clearInterval(interval);
  }, []);

  return (
    <ThemeProvider defaultTheme="dark" storageKey="foundry-theme">
      <AuthProvider>
        <AnimatePresence>
          {isLoading ? (
            <LoadingScreen step={loadingStep} />
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="min-h-screen"
            >
              <Router>
                <DashboardLayout>
                  <Routes>
                    {/* Public routes — no auth required */}
                    <Route path="/" element={<Landing />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />

                    {/* Protected dashboard routes */}
                    <Route path="/dashboard" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                    <Route path="/brain" element={<ProtectedRoute><Brain /></ProtectedRoute>} />
                    <Route path="/graph" element={<ProtectedRoute><Graph /></ProtectedRoute>} />
                    <Route path="/vault" element={<ProtectedRoute><Vault /></ProtectedRoute>} />
                    <Route path="/time-machine" element={<ProtectedRoute><TimeMachine /></ProtectedRoute>} />
                    <Route path="/evolution" element={<ProtectedRoute><Evolution /></ProtectedRoute>} />
                    <Route path="/generator" element={<ProtectedRoute><Generator /></ProtectedRoute>} />
                    <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                    <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                    <Route path="/demo" element={<ProtectedRoute><DemoMode /></ProtectedRoute>} />

                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </DashboardLayout>
                <Toaster />
              </Router>
            </motion.div>
          )}
        </AnimatePresence>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
