"use client";

import { useEffect, useState, useCallback } from "react";
import { api, navigate, dateTime } from "@/lib/store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Plus,
  Trash2,
  Smartphone,
  MessageCircle,
  Copy,
  CheckCircle2,
  KeyRound,
  Info,
  RefreshCw,
  RotateCcw,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SessionRow {
  id: string;
  phone: string;
  status: string;
  pairingCode?: string;
  accountType?: string;
  createdAt: string;
}

const statusMeta: Record<string, { label: string; cls: string; dot: string }> = {
  CONNECTED: { label: "Terhubung", cls: "bg-emerald-100 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  PAIRING_CODE: { label: "Menunggu Pairing", cls: "bg-amber-100 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  CONNECTING: { label: "Menyambung…", cls: "bg-sky-50 text-sky-700 border-sky-200", dot: "bg-sky-500" },
  WAITING_PAIRING: { label: "Menyiapkan…", cls: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400" },
  DISCONNECTED: { label: "Terputus", cls: "bg-red-50 text-red-600 border-red-200", dot: "bg-red-400" },
};

export default function DashWhatsapp() {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<SessionRow[] | null>(null);
  const [phone, setPhone] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await api<{ sessions: SessionRow[] }>("/api/whatsapp/sessions");
    if (res.ok) setSessions(res.data.sessions);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
     
  }, []);

  async function addSession(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!phone.trim()) return;
    setAdding(true);
    try {
      const res = await api("/api/whatsapp/sessions", {
        method: "POST",
        body: JSON.stringify({ phone }),
      });
      if (!res.ok) {
        setError(res.data.error || "Gagal membuat sesi");
        return;
      }
      setPhone("");
      toast({ title: "Sesi dibuat", description: "Masukkan kode pairing di aplikasi WhatsApp Anda." });
      await load();
    } finally {
      setAdding(false);
    }
  }

  async function removeSession(id: string) {
    await api(`/api/whatsapp/sessions?id=${id}`, { method: "DELETE" });
    toast({ title: "Sesi dihapus", description: "Koneksi WhatsApp telah diputus." });
    await load();
  }

  function copyCode(code: string) {
    navigator.clipboard?.writeText(code);
    toast({ title: "Kode disalin", description: `${code} siap dipakai di WhatsApp.` });
  }

  async function regeneratePairing(id: string) {
    const res = await api<{ session: SessionRow }>(`/api/whatsapp/sessions/${id}`, {
      method: "POST",
      body: JSON.stringify({ action: "REGENERATE_PAIRING" }),
    });
    if (!res.ok) {
      toast({ title: "Gagal", description: res.data.error || "Coba lagi sebentar.", variant: "destructive" });
    } else {
      toast({ title: "Kode baru dibuat", description: "Masukkan kode terbaru di WhatsApp Anda." });
    }
    await load();
  }

  async function reconnect(id: string) {
    await api(`/api/whatsapp/sessions/${id}`, {
      method: "POST",
      body: JSON.stringify({ action: "RECONNECT" }),
    });
    toast({ title: "Menyambungkan ulang…", description: "Jika kredensial masih valid, sesi langsung aktif." });
    await load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Koneksi WhatsApp</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Hubungkan nomor WhatsApp Anda dengan metode pairing code (tanpa scan QR).
        </p>
      </div>

      {/* Pairing steps */}
      <div className="rounded-2xl border border-emerald-100 bg-white/80 shadow-sm p-4 sm:p-5">
        <p className="flex items-center gap-2.5 text-sm font-bold text-slate-900 mb-3.5">
          <span className="h-7 w-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-500/25 shrink-0">
            <Info className="h-4 w-4 text-white" />
          </span>
          Cara Pairing — tanpa scan QR
        </p>
        <ol className="space-y-2.5">
          {[
            <>Buka aplikasi <b>WhatsApp</b> atau <b>WhatsApp Business</b> di HP Anda.</>,
            <>Masuk ke <b>Setelan</b> → <b>Perangkat Tertaut</b>.</>,
            <>Pilih <b>Tautkan dengan Nomor Telepon Saja</b>.</>,
            <>Masukkan <b>kode 8 digit</b> yang tampil pada kartu sesi di halaman ini.</>,
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="mt-0.5 h-5 w-5 shrink-0 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-[10px] font-bold flex items-center justify-center shadow-sm">
                {i + 1}
              </span>
              <p className="text-[13px] leading-relaxed text-slate-600">{step}</p>
            </li>
          ))}
        </ol>
        <p className="mt-3 pt-3 border-t border-emerald-50 text-[11px] text-slate-400">
          Mendukung akun WhatsApp biasa maupun WhatsApp Business.
        </p>
      </div>

      {/* Add form */}
      <Card className="border-emerald-100 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4 text-emerald-600" />
            Tambah Sesi Baru
          </CardTitle>
          <CardDescription>
            Maksimal 3 sesi per akun. Gunakan format kode negara, contoh: 6281234567890
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4 py-2.5">
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={addSession} className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="wa-phone">Nomor WhatsApp</Label>
              <Input
                id="wa-phone"
                placeholder="6281234567890"
                className="h-11 border-slate-200 focus-visible:ring-emerald-500"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="numeric"
              />
            </div>
            <Button
              type="submit"
              disabled={adding}
              className="h-11 bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/25 gap-2"
            >
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />}
              Buat Sesi & Pairing
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Sessions list */}
      {sessions === null ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
        </div>
      ) : sessions.length === 0 ? (
        <Card className="border-dashed border-2 border-slate-200">
          <CardContent className="py-14 text-center">
            <MessageCircle className="h-12 w-12 text-slate-200 mx-auto mb-4" />
            <p className="font-semibold text-slate-700">Belum ada sesi WhatsApp</p>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              Tambahkan nomor WhatsApp Anda di atas untuk mulai blast dan mendapatkan saldo.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {sessions.map((s) => {
            const meta = statusMeta[s.status] || statusMeta.DISCONNECTED;
            const isPairing = s.status === "PAIRING_CODE" && !!s.pairingCode;
            return (
              <Card
                key={s.id}
                className={cn(
                  "border shadow-sm transition-colors",
                  isPairing ? "border-amber-300 bg-amber-50/40" : "border-emerald-100"
                )}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20">
                        <MessageCircle className="h-5 w-5 text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate flex items-center gap-1.5">
                          +{s.phone}
                          {s.status === "CONNECTED" && s.accountType === "BUSINESS" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 border border-purple-200 px-2 py-0.5 text-[10px] font-bold text-purple-700 shrink-0">
                              <Building2 className="h-3 w-3" />
                              WA Business
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] text-slate-400">{dateTime(s.createdAt)}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={cn("gap-1.5 shrink-0", meta.cls)}>
                      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot, (s.status === "CONNECTING" || s.status === "PAIRING_CODE") && "sb-pulse-dot")} />
                      {meta.label}
                    </Badge>
                  </div>

                  {isPairing && (
                    <div className="mt-4 rounded-xl border border-amber-200 bg-white p-4 text-center">
                      <p className="text-[11px] font-medium text-amber-700 flex items-center justify-center gap-1.5 mb-2">
                        <KeyRound className="h-3.5 w-3.5" />
                        Masukkan kode ini di aplikasi WhatsApp
                      </p>
                      <p className="text-3xl font-extrabold tracking-[0.3em] text-slate-900 select-all">
                        {s.pairingCode}
                      </p>
                      <div className="mt-3 flex justify-center gap-2">
                        <Button size="sm" variant="outline" className="gap-1.5 h-8" onClick={() => copyCode(s.pairingCode!)}>
                          <Copy className="h-3.5 w-3.5" />
                          Salin
                        </Button>
                      </div>
                    </div>
                  )}

                  {s.status === "CONNECTED" && (
                    <div className="mt-4 rounded-xl bg-emerald-50 border border-emerald-100 px-3.5 py-2.5 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <p className="text-xs text-emerald-700">
                        {s.accountType === "BUSINESS"
                          ? "Akun WhatsApp Business terhubung — siap dipakai untuk blast."
                          : "Siap dipakai untuk blast — buka menu Blast untuk mulai menghasilkan."}
                      </p>
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" className="gap-1.5 flex-1" onClick={load}>
                      <RefreshCw className="h-3.5 w-3.5" />
                      Muat ulang
                    </Button>
                    {s.status !== "CONNECTED" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 flex-1 border-amber-300 text-amber-700 hover:bg-amber-50"
                        onClick={() => regeneratePairing(s.id)}
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                        Kode Pairing Baru
                      </Button>
                    )}
                    {(s.status === "DISCONNECTED" || s.status === "PAIRING_CODE") && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 flex-1"
                        onClick={() => reconnect(s.id)}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Sambungkan Ulang
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                      onClick={() => removeSession(s.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Hapus
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="text-center">
        <Button variant="link" className="text-emerald-600 gap-1.5" onClick={() => navigate("/dashboard/blast")}>
          Lanjut ke halaman Blast
          <CheckCircle2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
