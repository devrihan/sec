import { useEffect, useRef, useState } from 'react';
import { BrowserRouter, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { toast, Toaster } from 'sonner';
import { AppHeader } from '../components/AppHeader';
import { MobileNav, SidebarNav } from '../components/SidebarNav';
import { HelpChat } from '../components/HelpChat';
import { ErrorBoundary } from '../components/page-parts';
import { TransactionModal } from '../components/TransactionModal';
import { TooltipProvider } from '../components/ui/tooltip';
import { NOTIFICATION_TICK_MS } from '../config/rewards';
import { runNotificationChecks } from '../services/notificationService';
import { markRead, setNotificationListener } from '../services/notificationStore';
import { subscribe } from '../services/store';
import { useTheme } from '../services/themeService';
import { AppRoutes } from './routes';

/** Time-based reminders run on a tick; state changes re-check soon after, so new sessions react quickly. */
function useNotificationEngine() {
  const navigate = useNavigate();

  useEffect(() => {
    setNotificationListener((n) => {
      toast(n.title, {
        description: n.body,
        action: n.href
          ? {
              label: 'View',
              onClick: () => {
                markRead(n.id);
                navigate(n.href as string);
              },
            }
          : undefined,
      });
    });

    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = subscribe(() => {
      clearTimeout(timer);
      timer = setTimeout(() => runNotificationChecks(), 250);
    });
    runNotificationChecks();
    const tick = setInterval(() => runNotificationChecks(), NOTIFICATION_TICK_MS);

    return () => {
      clearTimeout(timer);
      clearInterval(tick);
      unsubscribe();
      setNotificationListener(null);
    };
  }, [navigate]);
}

/** Loam's shell: fixed-height flex with a scrolling main, so scrolling is reset on main. */
export function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const theme = useTheme();
  const { pathname } = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  useNotificationEngine();

  useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
  }, [pathname]);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-dvh overflow-hidden bg-background">
        <SidebarNav collapsed={collapsed} />
        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeader onToggleSidebar={() => setCollapsed((v) => !v)} />
          {/* isolate: a page background (the dashboard galaxy) can sit behind the content but above this colour. */}
          <main ref={mainRef} id="main" className="isolate flex-1 overflow-auto bg-canvas [scrollbar-gutter:stable]">
            <div className="min-h-full space-y-sp-4xl px-4 py-6 md:px-sp-5xl md:py-sp-4xl">
              <ErrorBoundary>
                <Outlet />
              </ErrorBoundary>
              <p className="text-center text-[12px] leading-4 tracking-[-0.072px] text-muted-foreground">
                Demo prototype. All students, scores and exam records are fictional sample data.
              </p>
            </div>
          </main>
          <MobileNav />
          <HelpChat />
        </div>
        <TransactionModal />
        <Toaster position="bottom-right" closeButton theme={theme} />
      </div>
    </TooltipProvider>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
