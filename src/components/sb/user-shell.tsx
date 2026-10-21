"use client";

import { useEffect } from "react";
import { useApp, navigate, rupiah } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  MessageCircle,
  LayoutDashboard,
  Smartphone,
  Send,
  Wallet,
  UserRound,
  LogOut,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import DashHome from "@/components/sb/dash-home";
import DashWhatsapp from "@/components/sb/dash-whatsapp";
import DashBlast from "@/components/sb/dash-blast";
import DashWithdraw from "@/components/sb/dash-withdraw";
import DashProfile from "@/components/sb/dash-profile";

const menu = [
  { key: "/dashboard", label: "Beranda", icon: LayoutDashboard },
  { key: "/dashboard/whatsapp", label: "WhatsApp", icon: Smartphone },
  { key: "/dashboard/blast", label: "Blast", icon: Send },
  { key: "/dashboard/withdraw", label: "Tarik Saldo", icon: Wallet },
  { key: "/dashboard/profile", label: "Profil", icon: UserRound },
];

export default function UserShell({ route }: { route: string }) {
  const { user, loaded, settings, refresh, logout } = useApp();

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (loaded && !user) navigate("/login");
  }, [loaded, user]);

  if (!loaded || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          <p className="text-sm">Memuat dashboard…</p>
        </div>
      </div>
    );
  }

  const sub = route.replace("/dashboard", "") || "/";
  const page = (() => {
    switch (sub) {
      case "/whatsapp":
        return <DashWhatsapp />;
      case "/blast":
        return <DashBlast />;
      case "/withdraw":
        return <DashWithdraw />;
      case "/profile":
        return <DashProfile />;
      default:
        return <DashHome />;
    }
  })();

  const current = menu.find((m) => m.key === ("/dashboard" + (sub === "/" ? "" : sub)))?.key || "/dashboard";

  return (
    <div className="min-h-screen flex flex-col bg-muted/40">
      {/* Mobile topbar */}
      <div className="lg:hidden sticky top-0 z-40 sb-glass border-b border-emerald-100">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <MessageCircle className="h-4 w-4 text-white" />
            </div>
            <p className="font-extrabold text-slate-900">Sister<span className="text-emerald-600">Blast</span></p>
          </div>
          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border border-emerald-200">
            {rupiah(user.balance)}
          </Badge>
        </div>
        {/* Mobile nav */}
        <nav className="flex overflow-x-auto sb-scroll px-2 pb-2 gap-1">
          {menu.map((m) => (
            <button
              key={m.key}
              onClick={() => navigate(m.key)}
              className={cn(
                "flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                current === m.key
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-emerald-50"
              )}
            >
              <m.icon className="h-3.5 w-3.5" />
              {m.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex-1 flex">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex w-64 flex-col border-r border-emerald-100/70 bg-white">
          <div className="h-16 flex items-center gap-2.5 px-5 border-b border-emerald-100/70">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-500/25">
              <MessageCircle className="h-5 w-5 text-white" />
            </div>
            <div className="leading-tight">
              <p className="font-extrabold tracking-tight text-slate-900">
                Sister<span className="sb-gradient-text">Blast</span>
              </p>
              <p className="text-[10px] text-slate-500">Dashboard Pengguna</p>
            </div>
          </div>

          {/* balance card */}
          <div className="px-4 pt-4">
            <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 p-4 text-white shadow-lg shadow-emerald-600/25">
              <p className="text-[11px] text-emerald-100">Saldo Anda</p>
              <p className="text-2xl font-extrabold tracking-tight">{rupiah(user.balance)}</p>
              <div className="mt-2 flex items-center justify-between text-[11px] text-emerald-100">
                <span>Total earn: {rupiah(user.totalEarned)}</span>
              </div>
              <Button
                size="sm"
                className="mt-3 w-full h-8 bg-white/15 hover:bg-white/25 text-white border border-white/20"
                onClick={() => navigate("/dashboard/withdraw")}
              >
                <Wallet className="h-3.5 w-3.5 mr-1.5" />
                Tarik Saldo
              </Button>
            </div>
          </div>

          <nav className="flex-1 px-4 py-4 space-y-1">
            {menu.map((m) => (
              <button
                key={m.key}
                onClick={() => navigate(m.key)}
                className={cn(
                  "w-full flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all",
                  current === m.key
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/25"
                    : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-700"
                )}
              >
                <m.icon className="h-4.5 w-4.5" />
                {m.label}
              </button>
            ))}
          </nav>

          <div className="px-4 pb-5">
            {settings?.maintenance && (
              <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 flex items-start gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-[11px] leading-snug text-amber-700">
                  Server sedang maintenance. Blast dinonaktifkan sementara.
                </p>
              </div>
            )}
            <div className="rounded-xl border border-slate-200 px-3.5 py-3">
              <p className="text-xs font-semibold text-slate-800">{user.username}</p>
              <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
            </div>
            <Button
              variant="ghost"
              className="mt-2 w-full justify-start gap-2.5 text-slate-500 hover:text-red-600 hover:bg-red-50"
              onClick={async () => {
                await logout();
                navigate("/");
              }}
            >
              <LogOut className="h-4 w-4" />
              Keluar
            </Button>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-6 lg:py-8 pb-20 lg:pb-8">
          <div className="max-w-5xl mx-auto">{page}</div>
        </main>
      </div>

      {/* Mobile bottom logout */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 sb-glass border-t border-emerald-100 px-4 py-2 flex justify-between items-center">
        <span className="text-xs text-slate-600 truncate">{user.username}</span>
        <Button
          size="sm"
          variant="ghost"
          className="text-slate-500 hover:text-red-600 gap-1.5"
          onClick={async () => {
            await logout();
            navigate("/");
          }}
        >
          <LogOut className="h-4 w-4" />
          Keluar
        </Button>
      </div>
    </div>
  );
}
