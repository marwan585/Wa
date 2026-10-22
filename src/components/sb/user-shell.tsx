"use client";

import { useEffect, useState } from "react";
import { useApp, navigate, rupiah } from "@/lib/store";
import { Button } from "@/components/ui/button";
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
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import DashHome from "@/components/sb/dash-home";
import DashWhatsapp from "@/components/sb/dash-whatsapp";
import DashBlast from "@/components/sb/dash-blast";
import DashWithdraw from "@/components/sb/dash-withdraw";
import DashProfile from "@/components/sb/dash-profile";

const menu = [
  { key: "/dashboard", label: "Beranda", short: "Beranda", icon: LayoutDashboard },
  { key: "/dashboard/whatsapp", label: "WhatsApp", short: "WA", icon: Smartphone },
  { key: "/dashboard/blast", label: "Blast", short: "Blast", icon: Send },
  { key: "/dashboard/withdraw", label: "Tarik Saldo", short: "Saldo", icon: Wallet },
  { key: "/dashboard/profile", label: "Profil", short: "Profil", icon: UserRound },
];

export default function UserShell({ route }: { route: string }) {
  const { user, loaded, settings, refresh, logout } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(true);

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
    <div className="min-h-screen bg-gradient-to-br from-emerald-50/60 via-background to-teal-50/40">
      {/* ============ DESKTOP SIDEBAR (collapsible) ============ */}
      <aside
        className={cn(
          "hidden lg:flex fixed inset-y-0 left-0 z-40 flex-col border-r border-emerald-100/70 bg-white/80 backdrop-blur-xl sb-sidebar",
          sidebarOpen ? "w-[264px]" : "w-[80px]"
        )}
      >
        {/* Logo */}
        <div className={cn("h-16 flex items-center border-b border-emerald-100/70", sidebarOpen ? "gap-2.5 px-5" : "justify-center px-3")}>
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 shrink-0">
            <MessageCircle className="h-5 w-5 text-white" />
          </div>
          {sidebarOpen && (
            <div className="leading-tight min-w-0">
              <p className="font-extrabold tracking-tight text-slate-900">
                Sister<span className="sb-gradient-text">Blast</span>
              </p>
              <p className="text-[10px] text-slate-500">Dashboard Pengguna</p>
            </div>
          )}
        </div>

        {/* Balance card */}
        <div className={cn("pt-4", sidebarOpen ? "px-4" : "px-3")}>
          {sidebarOpen ? (
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-600 to-teal-700 p-4 text-white shadow-xl shadow-emerald-600/25">
              <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-white/10" />
              <div className="absolute -bottom-8 -left-4 h-16 w-16 rounded-full bg-white/10" />
              <p className="relative text-[11px] text-emerald-100 font-medium">Saldo Anda</p>
              <p className="relative text-2xl font-extrabold tracking-tight">{rupiah(user.balance)}</p>
              <div className="relative mt-2 flex items-center justify-between text-[11px] text-emerald-100">
                <span>Total earn: {rupiah(user.totalEarned)}</span>
              </div>
              <Button
                size="sm"
                className="relative mt-3 w-full h-8 bg-white/15 hover:bg-white/25 text-white border border-white/25"
                onClick={() => navigate("/dashboard/withdraw")}
              >
                <Wallet className="h-3.5 w-3.5 mr-1.5" />
                Tarik Saldo
              </Button>
            </div>
          ) : (
            <button
              onClick={() => navigate("/dashboard/withdraw")}
              title={`Saldo: ${rupiah(user.balance)}`}
              className="sb-nav-item w-full h-11 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-lg shadow-emerald-600/25 hover:scale-105"
            >
              <Wallet className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className={cn("flex-1 py-4 space-y-1.5 overflow-y-auto sb-scroll", sidebarOpen ? "px-4" : "px-3")}>
          {menu.map((m) => {
            const active = current === m.key;
            return (
              <button
                key={m.key}
                onClick={() => navigate(m.key)}
                title={m.label}
                className={cn(
                  "sb-nav-item w-full flex items-center rounded-xl text-sm font-medium",
                  sidebarOpen ? "gap-3 px-3.5 py-2.5" : "justify-center py-2.5",
                  active
                    ? "sb-nav-active text-white"
                    : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-700"
                )}
              >
                <m.icon className={cn("h-5 w-5 shrink-0", active && "drop-shadow")} />
                {sidebarOpen && <span className="truncate">{m.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className={cn("pb-5", sidebarOpen ? "px-4" : "px-3")}>
          {settings?.maintenance && sidebarOpen && (
            <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 flex items-start gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-[11px] leading-snug text-amber-700">
                Server sedang maintenance. Blast dinonaktifkan sementara.
              </p>
            </div>
          )}
          <div className={cn("rounded-xl border border-slate-200 bg-white/70", sidebarOpen ? "px-3.5 py-3" : "px-2 py-2.5 flex justify-center")}>
            {sidebarOpen ? (
              <>
                <p className="text-xs font-semibold text-slate-800 truncate">{user.username}</p>
                <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
              </>
            ) : (
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center" title={user.username}>
                <UserRound className="h-4 w-4 text-emerald-700" />
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size={sidebarOpen ? "default" : "icon"}
            className={cn(
              "mt-2 text-slate-500 hover:text-red-600 hover:bg-red-50",
              sidebarOpen ? "w-full justify-start gap-2.5" : "mx-auto"
            )}
            onClick={async () => {
              await logout();
              navigate("/");
            }}
          >
            <LogOut className="h-4 w-4" />
            {sidebarOpen && "Keluar"}
          </Button>
        </div>
      </aside>

      {/* ============ FLOATING SIDEBAR TOGGLE FAB (desktop) ============ */}
      <button
        onClick={() => setSidebarOpen((v) => !v)}
        aria-label={sidebarOpen ? "Tutup sidebar" : "Buka sidebar"}
        className="sb-fab hidden lg:flex fixed top-1/2 -translate-y-1/2 z-50 h-11 w-11 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white items-center justify-center shadow-xl shadow-emerald-600/40 border-[3px] border-white"
        style={{ left: sidebarOpen ? 244 : 60 }}
      >
        {sidebarOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}
      </button>

      {/* ============ MOBILE TOPBAR ============ */}
      <div className="lg:hidden sticky top-0 z-40 sb-glass border-b border-emerald-100/80">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-500/25">
              <MessageCircle className="h-4.5 w-4.5 text-white" />
            </div>
            <p className="font-extrabold text-slate-900">
              Sister<span className="sb-gradient-text">Blast</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-md shadow-emerald-600/25">
              {rupiah(user.balance)}
            </span>
            <Button
              size="icon"
              variant="ghost"
              className="h-9 w-9 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl"
              onClick={async () => {
                await logout();
                navigate("/");
              }}
            >
              <LogOut className="h-4.5 w-4.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* ============ MAIN CONTENT ============ */}
      <main
        className={cn(
          "transition-[margin] duration-300 px-4 sm:px-6 lg:px-8 py-6 lg:py-8 pb-32 lg:pb-10",
          sidebarOpen ? "lg:ml-[264px]" : "lg:ml-[80px]"
        )}
      >
        <div className="max-w-5xl mx-auto">{page}</div>
      </main>

      {/* ============ FLOATING APP NAVIGATOR (mobile dock) ============ */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-50 flex justify-center pointer-events-none px-3" style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px) * 0.6)" }}>
        <nav className="pointer-events-auto sb-dock sb-dock-in rounded-[22px] px-1.5 py-1.5 flex items-center gap-0.5">
          {menu.map((m) => {
            const active = current === m.key;
            return (
              <button
                key={m.key}
                onClick={() => navigate(m.key)}
                className={cn(
                  "sb-nav-item flex flex-col items-center justify-center gap-0.5 rounded-2xl min-w-[52px] px-1.5 py-2",
                  active
                    ? "sb-nav-active sb-dock-item-active text-white scale-[1.05]"
                    : "text-slate-500 active:bg-emerald-50"
                )}
              >
                <m.icon className={cn("h-[21px] w-[21px]", active && "drop-shadow")} />
                <span className="text-[10px] font-bold leading-none">{m.short}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
