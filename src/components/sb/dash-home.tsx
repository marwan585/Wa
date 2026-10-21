"use client";

import { useEffect, useState } from "react";
import { useApp, navigate, rupiah, api, dateTime } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Wallet,
  Send,
  Smartphone,
  Loader2,
  TrendingUp,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  RefreshCw,
  ArrowRight,
} from "lucide-react";

interface BlastRow {
  id: string;
  targetNumber: string;
  status: string;
  earning: number;
  createdAt: string;
}

export default function DashHome() {
  const { user, settings, refresh } = useApp();
  const [recent, setRecent] = useState<BlastRow[] | null>(null);
  const [sentCount, setSentCount] = useState<number | null>(null);

  const load = async () => {
    const res = await api<{ stats: { sentCount: number }; recent: BlastRow[] }>("/api/blast");
    if (res.ok) {
      setRecent(res.data.recent);
      setSentCount(res.data.stats?.sentCount ?? 0);
    }
  };

  useEffect(() => {
    const t0 = setTimeout(load, 0);
    const t = setInterval(refresh, 15000);
    return () => {
      clearTimeout(t0);
      clearInterval(t);
    };
     
  }, []);

  const cards = [
    {
      label: "Saldo Tersedia",
      value: rupiah(user?.balance),
      icon: Wallet,
      tone: "from-emerald-600 to-teal-700",
      action: () => navigate("/dashboard/withdraw"),
      actionLabel: "Tarik",
    },
    {
      label: "Total Penghasilan",
      value: rupiah(user?.totalEarned),
      icon: TrendingUp,
      tone: "from-teal-600 to-cyan-700",
      action: undefined,
      actionLabel: undefined,
    },
    {
      label: "Rate per Chat",
      value: rupiah(settings?.ratePerChat),
      icon: Send,
      tone: "from-emerald-500 to-emerald-700",
      action: () => navigate("/dashboard/blast"),
      actionLabel: "Blast",
    },
    {
      label: "Chat Terkirim",
      value: sentCount === null ? "…" : String(sentCount),
      icon: CheckCircle2,
      tone: "from-slate-700 to-slate-900",
      action: () => navigate("/dashboard/blast"),
      actionLabel: "Riwayat",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Halo, {user?.username}!
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Pantau saldo dan aktivitas blast Anda di sini.
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={load}>
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {settings?.maintenance && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-2.5">
          <ShieldAlert className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Server dalam mode maintenance</p>
            <p className="text-xs text-amber-700 mt-0.5">{settings.maintenanceNote}</p>
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Card key={c.label} className="border-emerald-100/80 shadow-sm sb-card-hover">
            <CardContent className="p-4 sm:p-5">
              <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${c.tone} flex items-center justify-center shadow-md mb-3`}>
                <c.icon className="h-4.5 w-4.5 text-white" />
              </div>
              <p className="text-[11px] text-slate-500">{c.label}</p>
              <p className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight truncate">
                {c.value}
              </p>
              {c.action && (
                <button
                  onClick={c.action}
                  className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:text-emerald-700"
                >
                  {c.actionLabel}
                  <ArrowRight className="h-3 w-3" />
                </button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Card className="border-emerald-100 shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-emerald-100 flex items-center justify-center shrink-0">
              <Smartphone className="h-6 w-6 text-emerald-700" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-slate-900">Koneksi WhatsApp</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Kelola & pairing nomor WhatsApp untuk blast.
              </p>
            </div>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => navigate("/dashboard/whatsapp")}>
              Buka
            </Button>
          </CardContent>
        </Card>
        <Card className="border-emerald-100 shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-teal-100 flex items-center justify-center shrink-0">
              <Send className="h-6 w-6 text-teal-700" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-slate-900">Mulai Blast</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Kirim pesan & dapatkan {rupiah(settings?.ratePerChat)} per chat.
              </p>
            </div>
            <Button size="sm" className="bg-teal-600 hover:bg-teal-700" onClick={() => navigate("/dashboard/blast")}>
              Buka
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent blasts */}
      <Card className="border-emerald-100 shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-900">Aktivitas Blast Terbaru</h2>
            <Button variant="ghost" size="sm" className="text-emerald-600" onClick={() => navigate("/dashboard/blast")}>
              Lihat semua
            </Button>
          </div>
          {recent === null ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
            </div>
          ) : recent.length === 0 ? (
            <div className="text-center py-10">
              <Send className="h-10 w-10 text-slate-200 mx-auto mb-3" />
              <p className="text-sm text-slate-500">Belum ada aktivitas blast.</p>
              <p className="text-xs text-slate-400 mt-1">
                Hubungkan WhatsApp lalu mulai blast untuk mendapatkan saldo.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto sb-scroll">
              {recent.map((b) => (
                <div key={b.id} className="flex items-center justify-between py-2.5 gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800">
                      +{b.targetNumber}
                    </p>
                    <p className="text-[11px] text-slate-400">{dateTime(b.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {b.status === "SENT" ? (
                      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        +{rupiah(b.earning)}
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="gap-1">
                        <XCircle className="h-3 w-3" />
                        Gagal
                      </Badge>
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
