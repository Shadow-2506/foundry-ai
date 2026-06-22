import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FoundryLogo } from '@/components/FoundryLogo';
import {
  LayoutDashboard,
  Brain,
  Network,
  Database,
  History,
  TrendingUp,
  PlusSquare,
  Settings,
  Menu,
  X,
  Moon,
  Sun,
  Bell,
  User,
  LogOut,
  LogIn,
  PlayCircle,
  CheckCheck,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/components/theme-provider';
import { useAuth } from '../../context/AuthContext';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { notificationService, NotificationItem } from '@/services/notificationService';
import { AboutModal } from '@/components/AboutModal';
import { APP_VERSION } from '@/lib/version';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: Brain, label: 'Org Brain', path: '/brain' },
  { icon: Network, label: 'Decision Graph', path: '/graph' },
  { icon: Database, label: 'Memory Vault', path: '/vault' },
  { icon: History, label: 'Time Machine', path: '/time-machine' },
  { icon: TrendingUp, label: 'Evolution', path: '/evolution' },
  { icon: PlusSquare, label: 'Project Gen', path: '/generator' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  const loadNotifications = async () => {
    const list = await notificationService.getNotifications();
    setNotifications(list);
  };

  useEffect(() => {
    loadNotifications();
    window.addEventListener('foundry_notification_added', loadNotifications);
    return () => window.removeEventListener('foundry_notification_added', loadNotifications);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    await notificationService.markAllAsRead();
    loadNotifications();
  };

  const handleNotificationClick = (item: NotificationItem) => {
    setIsNotificationOpen(false);
    const title = item.title.toLowerCase();
    const msg = item.message.toLowerCase();
    if (title.includes('memory') || msg.includes('memory') || msg.includes('vault')) {
      navigate('/vault');
    } else if (title.includes('project') || msg.includes('project')) {
      navigate('/generator');
    } else if (title.includes('analysis') || msg.includes('time machine')) {
      navigate('/time-machine');
    } else if (title.includes('genome') || msg.includes('genome')) {
      navigate('/brain');
    } else {
      navigate('/dashboard');
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  // Pages that should NOT show the dashboard chrome
  const isPublicPage = ['/login', '/signup', '/'].includes(location.pathname);
  if (isPublicPage) return <>{children}</>;

  return (
    <div className="min-h-screen bg-background text-foreground flex overflow-hidden">
      {/* Fixed Sidebar */}
      <aside className="hidden lg:flex flex-col fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border">
        {/* Branding — single location */}
        <div className="h-16 px-6 flex items-center border-b border-border shrink-0">
          <Link to="/dashboard" className="flex items-center">
            <FoundryLogo size={32} showText={true} />
          </Link>
        </div>

        <nav className="flex-1 px-4 space-y-1 py-4 overflow-y-auto">
          {navItems.map((item) => (
            <Link key={item.path} to={item.path}>
              <Button
                variant={location.pathname === item.path ? 'secondary' : 'ghost'}
                className="w-full justify-start gap-3 h-11"
              >
                <item.icon className="w-5 h-5 shrink-0" />
                <span>{item.label}</span>
              </Button>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-border space-y-1 shrink-0">
          <Link to="/demo">
            <Button
              variant={location.pathname === '/demo' ? 'secondary' : 'ghost'}
              className="w-full justify-start gap-3 h-11 text-primary hover:text-primary hover:bg-primary/10"
            >
              <PlayCircle className="w-5 h-5 shrink-0" />
              <span>Demo Mode</span>
            </Button>
          </Link>

          <Button
            variant="ghost"
            className="w-full justify-start gap-3"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <Sun className="w-5 h-5 shrink-0" /> : <Moon className="w-5 h-5 shrink-0" />}
            <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </Button>

          <Button
            variant="ghost"
            className="w-full justify-start gap-3"
            onClick={() => setIsAboutOpen(true)}
          >
            <Info className="w-5 h-5 shrink-0" />
            <span>About</span>
          </Button>

          {user ? (
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={signOut}
            >
              <LogOut className="w-5 h-5 shrink-0" />
              <span>Sign Out</span>
            </Button>
          ) : (
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-primary hover:text-primary hover:bg-primary/10"
              onClick={() => navigate('/login')}
            >
              <LogIn className="w-5 h-5 shrink-0" />
              <span>Sign In</span>
            </Button>
          )}

          <p className="px-3 pt-1 text-[10px] text-muted-foreground/50">v{APP_VERSION}</p>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
              onClick={() => setIsMobileSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-50 w-72 bg-card border-r border-border flex flex-col lg:hidden"
            >
              <div className="h-16 px-6 flex items-center justify-between border-b border-border shrink-0">
                <Link to="/dashboard" className="flex items-center" onClick={() => setIsMobileSidebarOpen(false)}>
                  <FoundryLogo size={32} showText={true} />
                </Link>
                <Button variant="ghost" size="icon" onClick={() => setIsMobileSidebarOpen(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <nav className="flex-1 px-4 space-y-1 py-4 overflow-y-auto">
                {navItems.map((item) => (
                  <Link key={item.path} to={item.path} onClick={() => setIsMobileSidebarOpen(false)}>
                    <Button
                      variant={location.pathname === item.path ? 'secondary' : 'ghost'}
                      className="w-full justify-start gap-3 h-11"
                    >
                      <item.icon className="w-5 h-5 shrink-0" />
                      <span>{item.label}</span>
                    </Button>
                  </Link>
                ))}
              </nav>

              <div className="p-4 border-t border-border space-y-1 shrink-0">
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3"
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                >
                  {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                  <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3"
                  onClick={() => { setIsAboutOpen(true); setIsMobileSidebarOpen(false); }}
                >
                  <Info className="w-5 h-5" />
                  <span>About</span>
                </Button>
                {user ? (
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => { signOut(); setIsMobileSidebarOpen(false); }}
                  >
                    <LogOut className="w-5 h-5" />
                    <span>Sign Out</span>
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-3"
                    onClick={() => { navigate('/login'); setIsMobileSidebarOpen(false); }}
                  >
                    <LogIn className="w-5 h-5" />
                    <span>Sign In</span>
                  </Button>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content area — offset by sidebar width on desktop */}
      <div className="flex flex-col flex-1 min-w-0 lg:ml-64">
        {/* Sticky Header */}
        <header className="h-16 border-b border-border bg-card/50 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-40">
          <div className="flex items-center gap-4">
            {/* Hamburger — mobile only */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setIsMobileSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>
          </div>

          <div className="flex items-center gap-4 relative" ref={notificationRef}>
            {/* Notification Bell */}
            <Button variant="ghost" size="icon" className="relative" onClick={() => setIsNotificationOpen(!isNotificationOpen)}>
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-4 h-4 bg-primary text-[10px] font-bold text-primary-foreground rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </Button>

            <AnimatePresence>
              {isNotificationOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 top-12 w-80 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden"
                >
                  <div className="p-4 border-b border-border flex items-center justify-between">
                    <span className="font-bold text-sm">Notifications</span>
                    {unreadCount > 0 && (
                      <Button variant="ghost" size="sm" onClick={handleMarkAllRead} className="text-xs gap-1 text-primary">
                        <CheckCheck className="w-3.5 h-3.5" />
                        Mark all read
                      </Button>
                    )}
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-border">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-muted-foreground">No notifications yet.</div>
                    ) : (
                      notifications.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => handleNotificationClick(item)}
                          className={`p-3 text-xs space-y-1 cursor-pointer hover:bg-secondary/30 transition-colors ${item.is_read ? 'opacity-70' : 'bg-primary/5'}`}
                        >
                          <div className="flex justify-between items-start">
                            <span className="font-semibold text-foreground">{item.title}</span>
                            <span className="text-[9px] text-muted-foreground">{new Date(item.created_at).toLocaleTimeString()}</span>
                          </div>
                          <p className="text-muted-foreground leading-relaxed">{item.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {user ? (
              <Link to="/profile" className="flex items-center gap-3 pl-4 border-l border-border">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium">{user.email?.split('@')[0]}</p>
                  <p className="text-xs text-muted-foreground">Member</p>
                </div>
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                  <User className="w-5 h-5 text-primary" />
                </div>
              </Link>
            ) : (
              <Button variant="outline" size="sm" onClick={() => navigate('/login')}>
                Sign In
              </Button>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <AboutModal open={isAboutOpen} onOpenChange={setIsAboutOpen} />
    </div>
  );
}
