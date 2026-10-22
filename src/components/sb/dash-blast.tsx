"use client";

import { useEffect, useState, useCallback } from "react";
import { api, rupiah, dateTime, useApp } from "@/lib/store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Play,
  Square,
  Send,
  Database,
  Coins,
  CheckCircle2,
  XCircle,
  Info,
  ShieldAlert,
  Activity,
  Timer,
  Save,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BlastRow {
  id: string;
  targetNumber: string;
  status: string;
  earning: number;
  note?: string;
  createdAt: string;
}

interface BlastData {
  running: boolean;
  run: {
    sent: number;
    failed: number;
    earned: number;
    delaySec?: number;
    lastMessage?: string;
    lastError?: string;
    startedAt: number;
  } | null;
  targets: { available: number; used: number };
  stats: { sentCount: number; revokedCount: number };
  settings: {
    ratePerChat: number;
    maintenance: boolean;
    maintenanceNote: string;
    hasMessage: boolean;
    blastDelay: number;
    minDelay: number;
    maxDelay: number;
  };
  recent: BlastRow[];
}

export default function DashBlast() {
  const { toast } = useToast();
  const { refresh } = useApp();
  const [data, setData] = useState<BlastData | null>(null);
  const [sessions, setSessions] = useState<Array<{ id: string; phone: string; status: string }>>([]);
  const [sessionId, setSessionId] = useState<string>("");
  const [acting, setActing] = useState(false);
  const [delayInput, setDelayInput] = useState<string>("");
  const [savingDelay, setSavingDelay] = useState(false);

  const loadAll = useCallback(async () => {
    const [blastRes, sessRes] = await Promise.all([
      api<BlastData>("/api/blast"),
      api<{ sessions: Array<{ id: string; phone: string; status: string }> }>("/api/whatsapp/sessions"),
    ]);
    if (blastRes.ok) {
      setData(blastRes.data);
      // Isi input jeda hanya sekali (agar tidak menimpa saat user sedang mengetik)
      setDelayInput((prev) => (prev === "" ? String(blastRes.data.settings.blastDelay) : prev));
    }
    if (sessRes.ok) {
      const conns = sessRes.data.sessions;
      setSessions(conns);
      setSessionId((prev) => {
        if (prev && conns.some((c) => c.id === prev)) return prev;
        const connected = conns.find((c) => c.status === "CONNECTED");
        return connected?.id || "";
      });
    }
  }, []);

  useEffect(() => {
    loadAll();
    const t = setInterval(loadAll, 3000);
    return () => clearInterval(t);
     
  }, []);

  async function act(action: "start" | "stop") {
    setActing(true);
    try {
      const res = await api("/api/blast", {
        method: "POST",
        body: JSON.stringify({ action, sessionId }),
      });
      if (!res.ok) {
        toast({ title: "Gagal", description: res.data.error || "Terjadi kesalahan", variant: "destructive" });
        return;
      }
      toast({
        title: action === "start" ? "Blast dimulai" : "Blast dihentikan",
        description:
          action === "start"
            ? "Pesan mulai dikirim ke nomor target satu per satu."
            : "Proses blast dihentikan.",
      });
      await loadAll();
      await refresh();
    } finally {
      setActing(false);
    }
  }

  async function saveDelay() {
    const n = parseInt(delayInput, 10);
    if (!Number.isFinite(n)) {
      toast({ title: "Jeda tidak valid", description: "Masukkan angka detik.", variant: "destructive" });
      return;
    }
    setSavingDelay(true);
    try {
      const res = await api<{ ok: boolean; delay: number }>("/api/blast", {
        method: "POST",
        body: JSON.stringify({ action: "set-delay", delay: n }),
      });
      if (!res.ok) {
        toast({
          title: "Gagal",
          description: res.data.error || `Tidak bisa menyimpan jeda (HTTP ${res.status})`,
          variant: "destructive",
        });
        return;
      }
      setDelayInput(String(res.data.delay));
      toast({
        title: "Jeda disimpan",
        description: `Jeda ${res.data.delay} detik — langsung berlaku untuk pesan berikutnya.`,
      });
      await loadAll();
    } finally {
      setSavingDelay(false);
    }
  }

  if (!data) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
      </div>
    );
  }

  const connectedSessions = sessions.filter((s) => s.status === "CONNECTED");
  const running = data.running;
  const totalProcessed = (data.run?.sent || 0) + (data.run?.failed || 0);
  const progress = running ? Math.min(95, (totalProcessed % 10) * 10 + 5) : 100;
  const blocked = data.settings.maintenance || !data.settings.hasMessage;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Blast Pesan</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Kirim pesan admin ke nomor target dan dapatkan {rupiah(data.settings.ratePerChat)} per chat terkirim.
        </p>
      </div>

      {data.settings.maintenance && (
        <Alert className="border-amber-200 bg-amber-50 text-amber-800">
          <ShieldAlert className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-sm">
            <b>Maintenance aktif.</b> {data.settings.maintenanceNote}
          </AlertDescription>
        </Alert>
      )}
      {!data.settings.maintenance && !data.settings.hasMessage && (
        <Alert className="border-amber-200 bg-amber-50 text-amber-800">
          <Info className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-sm">
            Pesan blast belum diatur oleh admin. Silakan tunggu.
          </AlertDescription>
        </Alert>
      )}

      {/* Keamanan anti-cheat: dilarang menghapus pesan terkirim */}
      <Alert className="border-rose-200 bg-rose-50 text-rose-800">
        <ShieldAlert className="h-4 w-4 text-rose-600" />
        <AlertDescription className="text-sm">
          <b>Aturan penting:</b> DILARANG menghapus pesan yang sudah terkirim.
          Sistem memantau setiap pesan blast — jika Anda menghapus pesan
          ("Hapus untuk semua") setelah terkirim, saldo otomatis DITARIK
          sebesar nilai chat tersebut.
        </AlertDescription>
      </Alert>

      {/* Control panel */}
      <Card className="border-emerald-100 shadow-md shadow-emerald-900/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-600" />
            Panel Kontrol
          </CardTitle>
          <CardDescription>
            Pilih sesi WhatsApp yang terhubung, atur jeda antar pesan, lalu mulai blast.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Sesi WhatsApp</label>
              <Select value={sessionId} onValueChange={setSessionId}>
                <SelectTrigger className="h-11 border-slate-200 focus:ring-emerald-500">
                  <SelectValue placeholder={connectedSessions.length ? "Pilih sesi" : "Tidak ada sesi terhubung"} />
                </SelectTrigger>
                <SelectContent>
                  {connectedSessions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      +{s.phone} — Terhubung
                    </SelectItem>
                  ))}
                  {sessions.filter((s) => s.status !== "CONNECTED").map((s) => (
                    <SelectItem key={s.id} value={s.id} disabled>
                      +{s.phone} — {s.status === "PAIRING_CODE" ? "Belum dipairing" : "Terputus"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {connectedSessions.length === 0 && (
                <p className="text-[11px] text-amber-600">
                  Belum ada sesi terhubung. Buka menu WhatsApp untuk pairing.
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Nomor Target Tersedia</label>
              <div className="h-11 rounded-md border border-slate-200 bg-slate-50 px-3 flex items-center gap-2 text-sm">
                <Database className="h-4 w-4 text-emerald-600" />
                <span className="font-bold text-slate-900">{data.targets.available}</span>
                <span className="text-slate-400">/ dipakai {data.targets.used}</span>
              </div>
            </div>
          </div>

          {/* Pengaturan jeda antar pesan */}
          <div className="rounded-xl border border-sky-100 bg-sky-50/40 p-4">
            <div className="grid sm:grid-cols-[1fr_auto] gap-3 items-end">
              <div className="space-y-1.5">
                <label htmlFor="blast-delay" className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                  <Timer className="h-4 w-4 text-sky-600" />
                  Jeda per chat (detik)
                </label>
                <Input
                  id="blast-delay"
                  type="number"
                  min={data.settings.minDelay}
                  max={data.settings.maxDelay}
                  className="h-11 border-slate-200 bg-white focus-visible:ring-sky-500"
                  value={delayInput}
                  onChange={(e) => setDelayInput(e.target.value)}
                  inputMode="numeric"
                />
                <p className="text-[11px] leading-relaxed text-slate-500">
                  Batas {data.settings.minDelay}–{data.settings.maxDelay} detik. Sistem otomatis menambah variasi acak ±20%
                  agar pola kirim terlihat alami. Perubahan langsung berlaku, bahkan saat blast sedang berjalan.
                </p>
              </div>
              <Button
                onClick={saveDelay}
                disabled={savingDelay}
                className="h-11 bg-sky-600 hover:bg-sky-700 gap-2"
              >
                {savingDelay ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Simpan Jeda
              </Button>
            </div>
            <p className="mt-2.5 flex items-start gap-1.5 text-[11px] text-sky-700">
              <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>
                Jeda aktif: <b>{data.run?.delaySec ?? data.settings.blastDelay} detik</b> · Rekomendasi 10–30 detik
                untuk nomor baru agar tidak terdeteksi spam oleh WhatsApp.
              </span>
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => act("start")}
              disabled={acting || running || !sessionId || blocked || data.targets.available === 0}
              className="flex-1 min-w-36 h-12 bg-emerald-600 hover:bg-emerald-700 text-base shadow-lg shadow-emerald-600/25 gap-2"
            >
              {acting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5" />}
              Mulai Blast
            </Button>
            <Button
              onClick={() => act("stop")}
              disabled={acting || !running}
              variant="outline"
              className="flex-1 min-w-36 h-12 text-base border-red-200 text-red-600 hover:bg-red-50 gap-2"
            >
              <Square className="h-5 w-5" />
              Hentikan
            </Button>
          </div>

          {running && (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 space-y-2.5">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                <span className="sb-pulse-dot h-2 w-2 rounded-full bg-emerald-500" />
                Blast sedang berjalan…
              </div>
              <Progress value={progress} className="h-2 bg-emerald-100 [&>div]:bg-emerald-500" />
              {data.run?.lastMessage && (
                <p className="text-xs text-emerald-700/80">{data.run.lastMessage}</p>
              )}
              <p className="text-[11px] text-emerald-600/80 flex items-center gap-1">
                <Timer className="h-3 w-3" />
                Jeda antar pesan: {data.run?.delaySec ?? data.settings.blastDelay} detik (+ variasi acak)
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Live run stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-emerald-100 shadow-sm">
          <CardContent className="p-4 sm:p-5 text-center">
            <p className="text-[11px] text-slate-500 mb-1">Terkirim (sesi ini)</p>
            <p className="text-2xl font-extrabold text-emerald-600">{data.run?.sent ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-100 shadow-sm">
          <CardContent className="p-4 sm:p-5 text-center">
            <p className="text-[11px] text-slate-500 mb-1">Gagal (sesi ini)</p>
            <p className="text-2xl font-extrabold text-red-500">{data.run?.failed ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-100 shadow-sm">
          <CardContent className="p-4 sm:p-5 text-center">
            <p className="text-[11px] text-slate-500 mb-1 flex items-center justify-center gap-1">
              <Coins className="h-3 w-3" /> Diperoleh
            </p>
            <p className="text-2xl font-extrabold text-slate-900">{rupiah(data.run?.earned ?? 0)}</p>
          </CardContent>
        </Card>
      </div>

      {/* History */}
      <Card className="border-emerald-100 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Send className="h-4 w-4 text-emerald-600" />
            Riwayat Blast Terakhir
          </CardTitle>
          <CardDescription>
            20 aktivitas blast terakhir Anda.
            {data.stats.revokedCount > 0 && (
              <span className="text-rose-600 font-medium">
                {" "}
                {data.stats.revokedCount} pesan dihapus &amp; saldo ditarik.
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.recent.length === 0 ? (
            <div className="text-center py-10">
              <Send className="h-10 w-10 text-slate-200 mx-auto mb-3" />
              <p className="text-sm text-slate-500">Belum ada riwayat blast.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto sb-scroll">
              {data.recent.map((b) => (
                <div key={b.id} className="flex items-center justify-between py-3 gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800">+{b.targetNumber}</p>
                    <p className="text-[11px] text-slate-400">
                      {dateTime(b.createdAt)}
                      {(b.status === "FAILED" || b.status === "REVOKED") && b.note
                        ? ` — ${b.note}`
                        : ""}
                    </p>
                  </div>
                  {b.status === "SENT" ? (
                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 shrink-0">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      +{rupiah(b.earning)}
                    </Badge>
                  ) : b.status === "REVOKED" ? (
                    <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 shrink-0 gap-1">
                      <Trash2 className="h-3 w-3" />
                      Dihapus −{rupiah(b.earning)}
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="shrink-0 gap-1">
                      <XCircle className="h-3 w-3" />
                      Gagal
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
