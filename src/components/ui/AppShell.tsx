"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  ListTree,
  Stethoscope,
  AlertTriangle,
  CalendarCheck,
  BotMessageSquare,
  BarChart3,
  Settings,
  Menu,
  X,
  LogOut,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface AppShellProps {
  children: React.ReactNode;
  user?: {
    email: string;
    displayName: string;
    isDemoUser: boolean;
  };
}

export function AppShell({ children, user: initialUser }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<{
    email: string;
    displayName: string;
    isDemoUser: boolean;
  }>(
    initialUser || {
      email: "student@gapfinder.ai",
      displayName: "Alex Rivera",
      isDemoUser: true,
    }
  );

  useEffect(() => {
    async function loadUser() {
      // 1. Check /api/auth/me for authenticated server session
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data?.user) {
            setUser({
              email: data.user.email,
              displayName: data.user.displayName,
              isDemoUser: false,
            });
            return;
          }
        }
      } catch {
        // Fallback to client
      }

      // 2. Check browser Supabase client
      try {
        const supabase = createClient();
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          const displayName =
            authUser.user_metadata?.display_name ||
            authUser.email?.split("@")[0] ||
            "Student";
          setUser({
            email: authUser.email || "",
            displayName,
            isDemoUser: false,
          });
          return;
        }
      } catch {
        // Fallback
      }

      // 3. Fallback to initialUser prop if passed and not default demo, else demo
      if (initialUser && !initialUser.isDemoUser) {
        setUser(initialUser);
      }
    }

    loadUser();
  }, [initialUser]);

  const navigation = [
    { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { name: "Course Materials", href: "/materials", icon: FileText },
    { name: "Syllabus Topics", href: "/topics", icon: ListTree },
    { name: "Diagnostic Quiz", href: "/diagnostic", icon: Stethoscope },
    { name: "Knowledge Gap Report", href: "/gap-report", icon: AlertTriangle },
    { name: "Revision Plan", href: "/revision-plan", icon: CalendarCheck },
    { name: "Topic Assistant", href: "/assistant", icon: BotMessageSquare },
    { name: "Learning Progress", href: "/progress", icon: BarChart3 },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  const handleSignOut = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // Ignore
    }
    setUser({
      email: "student@gapfinder.ai",
      displayName: "Alex Rivera",
      isDemoUser: true,
    });
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
            GF
          </div>
          <span className="font-bold text-slate-900 text-sm tracking-tight">GapFinder AI</span>
        </Link>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1.5 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex">
          <div className="w-4/5 max-w-xs bg-white h-full p-4 flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">
                    GF
                  </div>
                  <span className="font-bold text-slate-900 text-sm">GapFinder AI</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {user?.isDemoUser && (
                <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Demo Mode Active</span>
                </div>
              )}

              <nav className="space-y-1">
                {navigation.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-indigo-50 text-indigo-700 font-semibold"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <item.icon className={`w-4 h-4 ${isActive ? "text-indigo-600" : "text-slate-400"}`} />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2.5 mb-3 px-2">
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center">
                  {user?.displayName ? user.displayName.charAt(0).toUpperCase() : "S"}
                </div>
                <div className="truncate">
                  <div className="text-xs font-semibold text-slate-900 truncate">
                    {user?.displayName || "Student"}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">{user?.email || "Student Account"}</div>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 shrink-0">
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-100 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm shadow-indigo-200">
            GF
          </div>
          <div>
            <div className="font-bold text-slate-900 text-sm tracking-tight">GapFinder AI</div>
            <div className="text-[11px] text-slate-500 font-medium">Diagnostic Revision</div>
          </div>
        </div>

        {/* Demo Mode Badge */}
        {user?.isDemoUser && (
          <div className="mx-3 mt-3 p-2.5 bg-amber-50/80 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-amber-800">Demo Mode Active</div>
              <p className="text-[11px] text-amber-700 leading-tight mt-0.5">
                Using preloaded CS 301 Data Science syllabus & notes.
              </p>
            </div>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-indigo-50 text-indigo-700 font-semibold shadow-xs"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <item.icon className={`w-4 h-4 shrink-0 ${isActive ? "text-indigo-600" : "text-slate-400"}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Card & Sign Out */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between p-2">
            <div className="flex items-center gap-2.5 truncate">
              <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center">
                {user?.displayName ? user.displayName.charAt(0).toUpperCase() : "S"}
              </div>
              <div className="truncate">
                <div className="text-xs font-semibold text-slate-900 truncate">
                  {user?.displayName || "Student"}
                </div>
                <div className="text-[10px] text-slate-500 truncate">{user?.email || "Student Account"}</div>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
