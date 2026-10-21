"use client";

import { useEffect, useState, useCallback } from "react";
import { api, rupiah, dateTime, useApp } from "@/lib/store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Wallet,
  Banknote,
  CheckCircle2,
  XCircle,
  Clock3,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface WdRow {
  id: string;
  amount: number;
  method: string;
  accountInfo: string;
  status: string;
  note?: string;
  createdAt: string;
  processedAt?: string;
}

const METHODS = ["DANA", "OVO", "GoPay", "ShopeePay", "Transfer Bank", "Pulsa"];

const statusMeta: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  PENDING: { label: "Diproses", cls: "bg-amber-100 text-amber-700 hover:bg-amber-100", icon: <Clock3 className="h-3 w-3 mr-1" /> },
  SUCCESS: { label: "Berhasil", cls: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100", icon: <CheckCircle2 className="h-3 w-3 mr-1" /> },
  FAILED: { label: "Gagal", cls: "bg-red-100 text-red-600 hover:bg-red-100", icon: <XCircle className="h-3 w-3 mr-1" /> },
};

export default function DashWithdraw() {
  const { toast } = useToast();
  const { refresh } = useApp();
  const [balance, setBalance] = useState<number | null>(null);
  const [minWd, setMinWd] = useState(10000);
  const [history, setHistory] = useState<WdRow[] | null>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("");
  const [accountInfo, setAccountInfo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await api<{ balance: number; minWithdraw: number; history: WdRow[] }>("/api/withdraw");
    if (res.ok) {
      setBalance(res.data.balance);
      setMinWd(res.data.minWithdraw);
      setHistory(res.data.history);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
     
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await api("/api/withdraw", {
        method: "POST",
        body: JSON.stringify({ amount: Number(amount), method, accountInfo }),
      });
      if (!res.ok) {
        setError(res.data.error || "Gagal mengajukan withdraw");
        return;
      }
      toast({
        title: "Withdraw diajukan",
        description: "Silakan tunggu konfirmasi dari admin.",
      });
      setAmount("");
      setMethod("");
      setAccountInfo("");
      await load();
      await refresh();
    } finally {
      setSubmitting(false);
    }
  }

  const quickAmounts = [minWd, 25000, 50000, 100000].filter(
    (v, i, a) => v > 0 && a.indexOf(v) === i
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Tarik Saldo</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Cairkan penghasilan Anda. Minimal withdraw {rupiah(minWd)}.
        </p>
      </div>

      {/* Balance banner */}
      <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 p-6 text-white shadow-xl shadow-emerald-600/25">
        <div className="flex items-center gap-2 text-emerald-100 text-sm">
          <Wallet className="h-4 w-4" />
          Saldo tersedia
        </div>
        <p className="mt-1 text-3xl sm:text-4xl font-extrabold tracking-tight">
          {balance === null ? "…" : rupiah(balance)}
        </p>
        <p className="mt-2 text-xs text-emerald-100/80">
          Withdraw akan diproses admin maksimal 1×24 jam.
        </p>
      </div>

      {/* Form */}
      <Card className="border-emerald-100 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Banknote className="h-4 w-4 text-emerald-600" />
            Ajukan Pencairan
          </CardTitle>
          <CardDescription>
            Pastikan data tujuan sudah benar. Saldo dipotong saat pengajuan dan dikembalikan otomatis jika ditolak.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4 py-2.5">
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="wd-amount">Jumlah (Rp)</Label>
              <Input
                id="wd-amount"
                type="number"
                min={minWd}
                placeholder={`Minimal ${minWd.toLocaleString("id-ID")}`}
                className="h-11 border-slate-200 focus-visible:ring-emerald-500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
              <div className="flex flex-wrap gap-2 pt-1">
                {quickAmounts.map((v) => (
                  <button
                    type="button"
                    key={v}
                    onClick={() => setAmount(String(v))}
                    className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                  >
                    {rupiah(v)}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Metode Pencairan</Label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger className="h-11 border-slate-200 focus:ring-emerald-500">
                    <SelectValue placeholder="Pilih metode" />
                  </SelectTrigger>
                  <SelectContent>
                    {METHODS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="wd-acc">Tujuan (Nomor / Rekening a.n.)</Label>
                <Input
                  id="wd-acc"
                  placeholder="081234567890 a.n. Budi"
                  className="h-11 border-slate-200 focus-visible:ring-emerald-500"
                  value={accountInfo}
                  onChange={(e) => setAccountInfo(e.target.value)}
                  required
                />
              </div>
            </div>

            <Alert className="border-emerald-200 bg-emerald-50/60 text-emerald-800">
              <Info className="h-4 w-4 text-emerald-600" />
              <AlertDescription className="text-[13px]">
                Anda hanya boleh memiliki <b>satu pengajuan aktif</b>. Status dapat dipantau pada riwayat di bawah.
              </AlertDescription>
            </Alert>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/25 gap-2"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Banknote className="h-4 w-4" />}
              Ajukan Withdraw
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* History */}
      <Card className="border-emerald-100 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Riwayat Withdraw</CardTitle>
          <CardDescription>Semua pengajuan pencairan Anda beserta statusnya.</CardDescription>
        </CardHeader>
        <CardContent>
          {history === null ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-10">
              <Banknote className="h-10 w-10 text-slate-200 mx-auto mb-3" />
              <p className="text-sm text-slate-500">Belum ada riwayat withdraw.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto sb-scroll">
              {history.map((w) => {
                const meta = statusMeta[w.status] || statusMeta.PENDING;
                return (
                  <div key={w.id} className="py-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900">{rupiah(w.amount)}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {w.method} — {w.accountInfo}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Diajukan {dateTime(w.createdAt)}
                        {w.processedAt ? ` • Diproses ${dateTime(w.processedAt)}` : ""}
                      </p>
                      {w.note && (
                        <p className={cn("text-[11px] mt-0.5", w.status === "FAILED" ? "text-red-500" : "text-slate-500")}>
                          Catatan admin: {w.note}
                        </p>
                      )}
                    </div>
                    <Badge className={cn("shrink-0", meta.cls)}>
                      {meta.icon}
                      {meta.label}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
