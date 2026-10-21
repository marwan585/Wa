"use client";

import { useState, useEffect } from "react";
import { useApp, navigate, rupiah } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { api } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Loader2,
  Shield,
  Lock,
  UserRound,
  LayoutDashboard,
  Users,
  Smartphone,
  Banknote,
  Settings2,
  Database,
  Radio,
  LogOut,
  MessageCircle,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import AdminHome from "@/components/sb/admin-home";
import AdminUsers from "@/components/sb/admin-users";
import AdminSessions from "@/components/sb/admin-sessions";
import AdminWithdrawals from "@/components/sb/admin-withdrawals";
import AdminSettings from "@/components/sb/admin-settings";
import AdminNumbers from "@/components/sb/admin-numbers";
import AdminBlasts from "@/components/sb/admin-blasts";

const menu = [
  { key: "/adm", label: "Dashboard", icon: LayoutDashboard },
  { key: "/adm/users", label: "Pengguna", icon: Users },
  { key: "/adm/sessions", label: "Sesi WhatsApp", icon: Smartphone },
  { key: "/adm/blasts", label: "Monitor Blast", icon: Radio },
  { key: "/adm/withdrawals", label: "Withdraw", icon: Banknote },
  { key: "/adm/numbers", label: "Database Nomor", icon: Database },
  { key: "/adm/settings", label: "Pengaturan", icon: Settings2 },
];

function AdminLogin() {
  const { checkAdmin } = useApp();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api("/api/admin/auth", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        setError(res.data.error || "Gagal masuk");
        return;
      }
      await checkAdmin();
      toast({ title: "Selamat datang, Admin" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 opacity-25" style={{ background: "radial-gradient(50rem 24rem at 50% -10%, oklch(0.55 0.14 163), transparent 60%)" }} />
      <div className="relative w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mb-4">
            <Shield className="h-7 w-7 text-emerald-400" />
          </div>
          <h1 className="text-xl font-extrabold text-white">Panel Administrator</h1>
          <p className="text-xs text-slate-500 mt-1">Area terbatas — khusus admin Sister Blast</p>
        </div>
        <Card className="border-white/10 bg-white/5 backdrop-blur-md border-0 shadow-2xl">
          <CardHeader className="pb-2" />
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4 py-2.5">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">{error}</AlertDescription>
              </Alert>
            )}
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="adm-user" className="text-slate-300">Username</Label>
                <div className="relative">
                  <UserRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <Input
                    id="adm-user"
                    className="h-11 pl-10 bg-slate-900/60 border-white/10 text-white placeholder:text-slate-600 focus-visible:ring-emerald-500"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    autoComplete="off"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="adm-pass" className="text-slate-300">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <Input
                    id="adm-pass"
                    type="password"
                    className="h-11 pl-10 bg-slate-900/60 border-white/10 text-white placeholder:text-slate-600 focus-visible:ring-emerald-500"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="off"
                  />
                </div>
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 gap-2 shadow-lg shadow-emerald-600/25"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Masuk Panel
              </Button>
            </form>
          </CardContent>
        </Card>
        <div className="mt-5 text-center">
          <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-300 gap-1.5" onClick={() => navigate("/")}>
            <ArrowLeft className="h-3.5 w-3.5" />
            Kembali ke situs
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function AdminShell({ route }: { route: string }) {
  const { admin, adminChecked, adminName, checkAdmin, logoutAdmin, refresh } = useApp();
  const { toast } = useToast();

  useEffect(() => {
    checkAdmin();
  }, [checkAdmin]);

  // Poll user session (maintenance flag) in background
  useEffect(() => {
    if (!admin) return;
    const t = setInterval(refresh, 30000);
    return () => clearInterval(t);
  }, [admin, refresh]);

  if (!adminChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="h-7 w-7 animate-spin text-emerald-500" />
      </div>
    );
  }
  if (!admin) return <AdminLogin />;

  const sub = route.replace("/adm", "") || "/";
  const page = (() => {
    switch (sub) {
      case "/users":
        return <AdminUsers />;
      case "/sessions":
        return <AdminSessions />;
      case "/blasts":
        return <AdminBlasts />;
      case "/withdrawals":
        return <AdminWithdrawals />;
      case "/numbers":
        return <AdminNumbers />;
      case "/settings":
        return <AdminSettings />;
      default:
        return <AdminHome />;
    }
  })();

  const current = menu.find((m) => m.key === ("/adm" + (sub === "/" ? "" : sub)))?.key || "/adm";

  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      {/* Mobile topbar */}
      <div className="lg:hidden sticky top-0 z-40 bg-slate-950 border-b border-white/10">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <Shield className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="font-extrabold text-white text-sm">Admin Panel</p>
          </div>
          <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white gap-1.5" onClick={logoutAdmin}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
        <nav className="flex overflow-x-auto sb-scroll px-2 pb-2 gap-1">
          {menu.map((m) => (
            <button
              key={m.key}
              onClick={() => navigate(m.key)}
              className={cn(
                "flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                current === m.key ? "bg-emerald-600 text-white" : "text-slate-400 hover:bg-white/10"
              )}
            >
              <m.icon className="h-3.5 w-3.5" />
              {m.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex-1 flex">
        {/* Sidebar */}
        <aside className="hidden lg:flex w-64 flex-col bg-slate-950 border-r border-white/5">
          <div className="h-16 flex items-center gap-2.5 px-5 border-b border-white/5">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
              <Shield className="h-5 w-5 text-emerald-400" />
            </div>
            <div className="leading-tight">
              <p className="font-extrabold text-white text-sm">Admin Panel</p>
              <p className="text-[10px] text-slate-500">Sister Blast Control</p>
            </div>
          </div>

          <nav className="flex-1 px-3 py-4 space-y-1">
            {menu.map((m) => (
              <button
                key={m.key}
                onClick={() => navigate(m.key)}
                className={cn(
                  "w-full flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all",
                  current === m.key
                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/25"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                )}
              >
                <m.icon className="h-4.5 w-4.5" />
                {m.label}
              </button>
            ))}
          </nav>

          <div className="px-4 pb-5">
            <div className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-3 flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
                <UserRound className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">{adminName || "Admin"}</p>
                <p className="text-[10px] text-slate-500">Administrator</p>
              </div>
            </div>
            <Button
              variant="ghost"
              className="mt-2 w-full justify-start gap-2.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10"
              onClick={async () => {
                await logoutAdmin();
                navigate("/adm");
                toast({ title: "Keluar dari panel admin" });
              }}
            >
              <LogOut className="h-4 w-4" />
              Keluar
            </Button>
            <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-slate-600">
              <MessageCircle className="h-3 w-3" />
              Sister Blast Admin
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-6 lg:py-8 pb-20 lg:pb-8">
          <div className="max-w-6xl mx-auto">{page}</div>
        </main>
      </div>
    </div>
  );
}
