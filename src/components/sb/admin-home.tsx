"use client";

import { useEffect, useState, useCallback } from "react";
import { api, rupiah, dateTime, navigate } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Users,
  Send,
  Smartphone,
  Banknote,
  Database,
  ShieldAlert,
  TrendingUp,
  Clock3,
  ArrowRight,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Stats {
  totals: {
    users: number;
    bannedUsers: number;
    blasts: number;
    sentBlasts: number;
    failedBlasts: number;
    revokedBlasts: number;
    sessions: number;
    connectedSessions: number;
    pendingWithdrawals: number;
    pendingWithdrawAmount: number;
    paidWithdrawAmount: number;
    totalEarned: number;
    availableTargets: number;
    usedTargets: number;
  };
  recentUsers: Array<{
    id: string;
    username: string;
    email: string;
    balance: number;
    status: string;
    createdAt: string;
  }>;
}

export default function AdminHome() {
  const [stats, setStats] = useState<Stats | null>(null);

  const load = useCallback(async () => {
    const res = await api<Stats>("/api/admin/stats");
    if (res.ok) setStats(res.data);
  }, []);

  useEffect(() => {
    const t0 = setTimeout(load, 0);
    const t = setInterval(load, 10000);
    return () => {
      clearTimeout(t0);
      clearInterval(t);
    };
     
  }, []);

  if (!stats) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
      </div>
    );
  }

  const t = stats.totals;

  const cards = [
    { label: "Total Pengguna", value: String(t.users), sub: `${t.bannedUsers} diblokir`, icon: Users, cls: "from-emerald-600 to-teal-700", to: "/adm/users" },
    { label: "Total Blast", value: String(t.blasts), sub: `${t.sentBlasts} terkirim • ${t.failedBlasts} gagal${t.revokedBlasts ? ` • ${t.revokedBlasts} dihapus` : ""}`, icon: Send, cls: "from-teal-600 to-cyan-700", to: "/adm/blasts" },
    { label: "Sesi WhatsApp", value: String(t.sessions), sub: `${t.connectedSessions} terhubung`, icon: Smartphone, cls: "from-emerald-500 to-emerald-700", to: "/adm/sessions" },
    { label: "Withdraw Pending", value: String(t.pendingWithdrawals), sub: rupiah(t.pendingWithdrawAmount), icon: Banknote, cls: "from-amber-500 to-orange-600", to: "/adm/withdrawals" },
    { label: "Nomor Tersedia", value: String(t.availableTargets), sub: `${t.usedTargets} dipakai`, icon: Database, cls: "from-slate-700 to-slate-900", to: "/adm/numbers" },
    { label: "Total Dibayarkan", value: rupiah(t.paidWithdrawAmount), sub: "withdraw sukses", icon: Wallet, cls: "from-fuchsia-600 to-pink-700", to: "/adm/withdrawals" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Dashboard Admin</h1>
        <p className="text-sm text-slate-500 mt-0.5">Ringkasan seluruh aktivitas Sister Blast.</p>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
        {cards.map((c) => (
          <Card
            key={c.label}
            className="border-slate-200 shadow-sm sb-card-hover cursor-pointer"
            onClick={() => navigate(c.to)}
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className={cn("h-10 w-10 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-md mb-3", c.cls)}>
                  <c.icon className="h-5 w-5 text-white" />
                </div>
                <ArrowRight className="h-4 w-4 text-slate-300" />
              </div>
              <p className="text-[11px] text-slate-500">{c.label}</p>
              <p className="text-xl font-extrabold text-slate-900 tracking-tight">{c.value}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{c.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* highlights */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Card className="border-emerald-100">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-emerald-100 flex items-center justify-center shrink-0">
              <TrendingUp className="h-6 w-6 text-emerald-700" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Total Penghasilan Pengguna</p>
              <p className="text-xl font-extrabold sb-gradient-text">{rupiah(t.totalEarned)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-emerald-100">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0">
              <Clock3 className="h-6 w-6 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-slate-900">Menunggu Konfirmasi Withdraw</p>
              <p className="text-xs text-slate-500">{t.pendingWithdrawals} permintaan aktif</p>
            </div>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => navigate("/adm/withdrawals")}>
              Proses
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent users */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-900">Pengguna Terbaru</h2>
            <Button variant="ghost" size="sm" className="text-emerald-600" onClick={() => navigate("/adm/users")}>
              Kelola semua
            </Button>
          </div>
          {stats.recentUsers.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">Belum ada pengguna terdaftar.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {stats.recentUsers.map((u) => (
                <div key={u.id} className="flex items-center justify-between py-3 gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{u.username}</p>
                    <p className="text-[11px] text-slate-400 truncate">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-bold text-slate-700">{rupiah(u.balance)}</span>
                    {u.status === "BANNED" ? (
                      <Badge variant="destructive" className="gap-1">
                        <ShieldAlert className="h-3 w-3" />
                        Banned
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Aktif</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
