"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Building2,
  Network,
  DollarSign,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Coins,
  MapPin,
  ClipboardList,
  BarChart3,
  ArrowUpRight,
  UserCircle2,
  Award,
} from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import { ThemeToggle } from "./theme-toggle";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { markNotificationsAsReadAction } from "@/lib/actions/notifications";

interface SidebarProps {
  role: "SUPER_ADMIN" | "ADMIN" | "AGENT";
}

interface SidebarItem {
  label: string;
  href: string;
  icon: React.ComponentType<any>;
  subItems?: { label: string; href: string }[];
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const [openMenus, setOpenMenus] = React.useState<Record<string, boolean>>(() => {
    return { "MLM": pathname.startsWith("/admin/mlm") };
  });

  React.useEffect(() => {
    if (pathname.startsWith("/admin/mlm")) {
      setOpenMenus((prev) => ({ ...prev, "MLM": true }));
    }
  }, [pathname]);

  // Notification States
  const [userId, setUserId] = React.useState<string | null>(null);
  const [unreadModules, setUnreadModules] = React.useState<Set<string>>(new Set());

  const supabase = React.useMemo(() => createClient(), []);

  // Fetch unread notifications and subscribe to realtime updates
  React.useEffect(() => {
    let active = true;
    let channel: any = null;
    let interval: any = null;

    async function initNotifications() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !active) return;
      setUserId(user.id);

      const fetchUnread = async () => {
        const { data: notifs } = await supabase
          .from("notifications")
          .select("id, message")
          .eq("user_id", user.id)
          .eq("is_read", false);

        if (notifs && active) {
          const modules = new Set<string>();
          notifs.forEach((n) => {
            try {
              const parsed = JSON.parse(n.message);
              if (parsed.module) {
                modules.add(parsed.module);
              }
            } catch (e) {
              // ignore
            }
          });
          setUnreadModules(modules);
        }
      };

      await fetchUnread();

      channel = supabase
        .channel(`user-notifs-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            if (active) {
              fetchUnread();
            }
          }
        )
        .subscribe();

      interval = setInterval(() => {
        if (active) {
          fetchUnread();
        }
      }, 10000);
    }

    initNotifications();

    return () => {
      active = false;
      if (channel) {
        channel.unsubscribe();
      }
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [supabase]);

  // Mark as read when navigating to a page
  React.useEffect(() => {
    if (!userId || !pathname) return;

    if (unreadModules.has(pathname)) {
      markNotificationsAsReadAction(userId, pathname).then(() => {
        setUnreadModules((prev) => {
          const next = new Set(prev);
          next.delete(pathname);
          return next;
        });
      });
    }
  }, [pathname, userId, unreadModules]);

  const handleLogout = () => {
    startTransition(async () => {
      await signOut();
    });
  };

  const agentItems: SidebarItem[] = [
    { label: "Dashboard", href: "/agent/dashboard", icon: LayoutDashboard },
    { label: "Properties & Sales", href: "/agent/properties", icon: Building2 },
    { label: "Sales Management", href: "/agent/sales", icon: BarChart3 },
    { label: "My Commissions", href: "/agent/commissions", icon: Coins },
    { label: "My Promotion Income", href: "/agent/promotions", icon: Award },
    { label: "My Downline", href: "/agent/network", icon: Network },
    { label: "My Payouts", href: "/agent/payouts", icon: DollarSign },
    { label: "Site Visit Record", href: "/agent/visits", icon: MapPin },
    { label: "My Profile", href: "/agent/profile", icon: UserCircle2 },
  ];

  const adminItems: SidebarItem[] = [
    { label: "Overview", href: "/admin/dashboard", icon: LayoutDashboard },
    { label: "Properties", href: "/admin/properties", icon: Building2 },
    { label: "Agents", href: "/admin/agents", icon: Users },
    { label: "Sales", href: "/admin/sales", icon: BarChart3 },
    { label: "Commissions", href: "/admin/commissions", icon: Coins },
    {
      label: "MLM",
      href: "#",
      icon: Network,
      subItems: [
        { label: "Promotion Levels", href: "/admin/mlm/promotion-levels" },
        { label: "Promotion History", href: "/admin/mlm/promotion-history" },
        { label: "Promotion Reports", href: "/admin/mlm/promotion-reports" },
        { label: "Promotion Payments", href: "/admin/mlm/promotion-payments" },
      ],
    },
    { label: "Withdrawals", href: "/admin/withdrawals", icon: ArrowUpRight },
    { label: "Payouts Requests", href: "/admin/payouts", icon: Coins },
    { label: "Visits Tracking", href: "/admin/visits", icon: MapPin },
    { label: "Activity Logs", href: "/admin/activity", icon: ClipboardList },
    { label: "Settings", href: "/admin/settings", icon: Settings },
  ];

  const items = role === "SUPER_ADMIN" || role === "ADMIN" ? adminItems : agentItems;

  const sidebarVariants = {
    open: { x: 0, opacity: 1 },
    closed: { x: "-100%", opacity: 0 },
  };

  return (
    <>
      {/* Mobile top navbar */}
      <div className="flex h-16 w-full items-center justify-between border-b border-border/40 bg-card/65 px-4 backdrop-blur-md lg:hidden z-30 fixed top-0 left-0">
        <div className="flex items-center gap-2">
          <Coins className="h-6 w-6 text-primary" />
          <span className="font-extrabold tracking-wider bg-gradient-to-r from-primary to-violet-400 bg-clip-text text-transparent">
            AuraCommission
          </span>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="rounded-xl border border-border/50 p-2 text-foreground"
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Desktop Sidebar */}
      <aside className="fixed bottom-0 left-0 top-0 z-40 hidden w-64 border-r border-border/30 bg-card/40 backdrop-blur-xl lg:flex flex-col justify-between py-6 px-4">
        <div className="space-y-6">
          <div className="flex items-center gap-3 pl-3">
            <Coins className="h-7 w-7 text-primary animate-pulse" />
            <div>
              <span className="font-extrabold text-lg tracking-wider bg-gradient-to-r from-primary to-violet-400 bg-clip-text text-transparent block">
                AuraComm
              </span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">
                {role} Portal
              </span>
            </div>
          </div>

          <nav className="space-y-1.5 pt-4">
            {items.map((item: any) => {
              const Icon = item.icon;
              const hasSubItems = !!item.subItems;

              if (hasSubItems) {
                const isMenuOpen = openMenus[item.label] || false;
                const isSubActive = item.subItems.some((sub: any) => pathname === sub.href);

                return (
                  <div key={item.label} className="space-y-1">
                    <button
                      onClick={() => setOpenMenus(prev => ({ ...prev, [item.label]: !prev[item.label] }))}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold tracking-wide transition-all duration-200 text-left",
                        isSubActive
                          ? "bg-primary/10 text-primary border border-primary/20"
                          : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1 truncate">{item.label}</span>
                      <motion.span
                        animate={{ rotate: isMenuOpen ? 90 : 0 }}
                        className="text-xs text-muted-foreground flex items-center justify-center w-4 h-4"
                      >
                        ▶
                      </motion.span>
                    </button>

                    <AnimatePresence initial={false}>
                      {isMenuOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          className="pl-7 space-y-1 overflow-hidden"
                        >
                          {item.subItems.map((sub: any) => {
                            const isSubActive = pathname === sub.href;
                            return (
                              <Link
                                key={sub.href}
                                href={sub.href}
                                className={cn(
                                  "block rounded-xl px-4 py-2 text-xs font-semibold tracking-wide transition-all duration-200",
                                  isSubActive
                                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                                    : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                                )}
                              >
                                {sub.label}
                              </Link>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              }

              const isActive = pathname === item.href;
              const isUnread = unreadModules.has(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold tracking-wide transition-all duration-200",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.02]"
                      : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 truncate">{item.label}</span>
                  {isUnread && (
                    <span className="h-2 w-2 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50 shrink-0 animate-pulse" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between px-3">
            <span className="text-xs text-muted-foreground font-semibold">Appearance</span>
            <ThemeToggle />
          </div>

          <button
            onClick={handleLogout}
            disabled={isPending}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-rose-500 hover:bg-rose-500/10 transition-all border border-transparent hover:border-rose-500/20 active:scale-[0.98]"
          >
            <LogOut className="h-4 w-4" />
            {isPending ? "Logging out..." : "Log Out"}
          </button>
        </div>
      </aside>

      {/* Mobile drawer overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            />
            {/* Sidebar content */}
            <motion.div
              variants={sidebarVariants}
              initial="closed"
              animate="open"
              exit="closed"
              transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
              className="fixed bottom-0 left-0 top-0 z-50 flex w-64 flex-col justify-between bg-card/90 border-r border-border/50 py-6 px-4 shadow-2xl backdrop-blur-xl lg:hidden"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Coins className="h-6 w-6 text-primary" />
                    <span className="font-extrabold text-lg tracking-wider bg-gradient-to-r from-primary to-violet-400 bg-clip-text text-transparent">
                      AuraComm
                    </span>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="rounded-xl p-1.5 hover:bg-muted text-foreground"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <nav className="space-y-1.5 pt-4">
                  {items.map((item: any) => {
                    const Icon = item.icon;
                    const hasSubItems = !!item.subItems;

                    if (hasSubItems) {
                      const isMenuOpen = openMenus[item.label] || false;
                      const isSubActive = item.subItems.some((sub: any) => pathname === sub.href);

                      return (
                        <div key={item.label} className="space-y-1">
                          <button
                            onClick={() => setOpenMenus(prev => ({ ...prev, [item.label]: !prev[item.label] }))}
                            className={cn(
                              "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold tracking-wide transition-all duration-200 text-left",
                              isSubActive
                                ? "bg-primary/10 text-primary border border-primary/20"
                                : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                            )}
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            <span className="flex-1 truncate">{item.label}</span>
                            <motion.span
                              animate={{ rotate: isMenuOpen ? 90 : 0 }}
                              className="text-xs text-muted-foreground flex items-center justify-center w-4 h-4"
                            >
                              ▶
                            </motion.span>
                          </button>

                          <AnimatePresence initial={false}>
                            {isMenuOpen && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.15 }}
                                className="pl-7 space-y-1 overflow-hidden"
                              >
                                {item.subItems.map((sub: any) => {
                                  const isSubActive = pathname === sub.href;
                                  return (
                                    <Link
                                      key={sub.href}
                                      href={sub.href}
                                      onClick={() => setIsOpen(false)}
                                      className={cn(
                                        "block rounded-xl px-4 py-2 text-xs font-semibold tracking-wide transition-all duration-200",
                                        isSubActive
                                          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                                          : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                                      )}
                                    >
                                      {sub.label}
                                    </Link>
                                  );
                                })}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    }

                    const isActive = pathname === item.href;
                    const isUnread = unreadModules.has(item.href);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsOpen(false)}
                        className={cn(
                          "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold tracking-wide transition-all duration-200",
                          isActive
                            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.02]"
                            : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="flex-1 truncate">{item.label}</span>
                        {isUnread && (
                          <span className="h-2 w-2 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50 shrink-0 animate-pulse" />
                        )}
                      </Link>
                    );
                  })}
                </nav>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between px-3">
                  <span className="text-xs text-muted-foreground font-semibold">Appearance</span>
                  <ThemeToggle />
                </div>

                <button
                  onClick={handleLogout}
                  disabled={isPending}
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-rose-500 hover:bg-rose-500/10 transition-all active:scale-[0.98]"
                >
                  <LogOut className="h-4 w-4" />
                  {isPending ? "Logging out..." : "Log Out"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
