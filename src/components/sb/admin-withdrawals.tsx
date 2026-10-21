"use client";

import { useEffect, useState, useCallback } from "react";
import { api, rupiah, dateTime } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
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
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, XCircle, Banknote, Clock3 } from "lucide-react";
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
  user: { username: string; email: string; phone: string };
}

const statusMeta: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  PENDING: { label: "Pending", cls: "bg-amber-100 text-amber-700 hover:bg-amber-100", icon: <Clock3 className="h-3 w-3 mr-1" /> },
  SUCCESS: { label: "Berhasil", cls: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100", icon: <CheckCircle2 className="h-3 w-3 mr-1" /> },
  FAILED: { label: "Gagal", cls: "bg-red-100 text-red-600 hover:bg-red-100", icon: <XCircle className="h-3 w-3 mr-1" /> },
};

export default function AdminWithdrawals() {
  const { toast } = useToast();
  const [items, setItems] = useState<WdRow[] | null>(null);
  const [status, setStatus] = useState("ALL");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState<string>("");

  const load = useCallback(async () => {
    const params = status !== "ALL" ? `?status=${status}` : "";
    const res = await api<{ withdrawals: WdRow[] }>(`/api/admin/withdrawals${params}`);
    if (res.ok) setItems(res.data.withdrawals);
  }, [status]);

  useEffect(() => {
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
     
  }, []);

  async function process(w: WdRow, action: "approve" | "reject") {
    setProcessing(w.id + action);
    try {
      const res = await api(`/api/admin/withdrawals/${w.id}`, {
        method: "PATCH",
        body: JSON.stringify({ action, note: notes[w.id] || "" }),
      });
      if (!res.ok) {
        toast({ title: "Gagal", description: res.data.error, variant: "destructive" });
        return;
      }
      toast({
        title: action === "approve" ? "Withdraw disetujui" : "Withdraw ditolak",
        description:
          action === "approve"
            ? `${rupiah(w.amount)} untuk ${w.user.username}`
            : `Saldo ${rupiah(w.amount)} dikembalikan ke ${w.user.username}`,
      });
      await load();
    } finally {
      setProcessing("");
    }
  }

  if (!items) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
      </div>
    );
  }

  const pending = items.filter((w) => w.status === "PENDING");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Konfirmasi Withdraw</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Setujui atau tolak permintaan pencairan pengguna. Menolak akan mengembalikan saldo otomatis.
          </p>
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40 h-10 border-slate-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Semua</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="SUCCESS">Berhasil</SelectItem>
            <SelectItem value="FAILED">Gagal</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {pending.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-center gap-2">
          <Banknote className="h-4 w-4" />
          {pending.length} permintaan menunggu konfirmasi — total {rupiah(pending.reduce((a, b) => a + b.amount, 0))}
        </div>
      )}

      {items.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-sm text-slate-500">
            Tidak ada permintaan withdraw.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((w) => {
            const meta = statusMeta[w.status] || statusMeta.PENDING;
            const isPending = w.status === "PENDING";
            return (
              <Card key={w.id} className={cn("shadow-sm", isPending ? "border-amber-200 bg-amber-50/30" : "border-slate-200")}>
                <CardContent className="p-5">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-lg font-extrabold text-slate-900">{rupiah(w.amount)}</p>
                        <Badge className={meta.cls}>
                          {meta.icon}
                          {meta.label}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] border-slate-200 text-slate-500">
                          {w.method}
                        </Badge>
                      </div>
                      <div className="mt-1.5 text-sm text-slate-600">
                        <span className="font-semibold text-slate-800">{w.user.username}</span>{" "}
                        <span className="text-slate-400">({w.user.email})</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Tujuan: <b className="text-slate-700">{w.accountInfo}</b>
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Diajukan {dateTime(w.createdAt)}
                        {w.processedAt ? ` • Diproses ${dateTime(w.processedAt)}` : ""}
                      </p>
                      {w.note && <p className="text-[11px] mt-0.5 text-slate-500">Catatan: {w.note}</p>}
                    </div>

                    {isPending ? (
                      <div className="w-full lg:w-80 space-y-2.5 shrink-0">
                        <Input
                          placeholder="Catatan (opsional) — mis. alasan tolak"
                          className="h-10 border-slate-200 bg-white"
                          value={notes[w.id] || ""}
                          onChange={(e) => setNotes((n) => ({ ...n, [w.id]: e.target.value }))}
                        />
                        <div className="flex gap-2">
                          <Button
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 gap-1.5"
                            disabled={!!processing}
                            onClick={() => process(w, "approve")}
                          >
                            {processing === w.id + "approve" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                            Setujui
                          </Button>
                          <Button
                            variant="outline"
                            className="flex-1 border-red-200 text-red-600 hover:bg-red-50 gap-1.5"
                            disabled={!!processing}
                            onClick={() => process(w, "reject")}
                          >
                            {processing === w.id + "reject" ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                            Tolak
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="shrink-0 text-[11px] text-slate-400">
                        Sudah diproses
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
