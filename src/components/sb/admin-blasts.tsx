"use client";

import { useEffect, useState, useCallback } from "react";
import { api, rupiah, dateTime } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Radio,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from "lucide-react";

interface BlastRow {
  id: string;
  userId: string;
  sessionPhone?: string;
  targetNumber: string;
  message: string;
  status: string;
  earning: number;
  note?: string;
  createdAt: string;
  user: { username: string };
}

export default function AdminBlasts() {
  const [items, setItems] = useState<BlastRow[] | null>(null);
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (status !== "ALL") params.set("status", status);
    const res = await api<{ blasts: BlastRow[] }>(`/api/admin/blasts?${params}`);
    if (res.ok) setItems(res.data.blasts);
  }, [status]);

  useEffect(() => {
    const t0 = setTimeout(load, 0);
    const t = setInterval(load, 8000);
    return () => {
      clearTimeout(t0);
      clearInterval(t);
    };
     
  }, []);

  const perPage = 20;
  const paged = items ? items.slice((page - 1) * perPage, page * perPage) : [];
  const totalPages = items ? Math.max(1, Math.ceil(items.length / perPage)) : 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Monitor Blast</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            100 aktivitas blast terakhir dari seluruh pengguna.
          </p>
        </div>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="w-40 h-10 border-slate-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Semua</SelectItem>
            <SelectItem value="SENT">Terkirim</SelectItem>
            <SelectItem value="FAILED">Gagal</SelectItem>
            <SelectItem value="REVOKED">Dihapus</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-0">
          {items === null ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
            </div>
          ) : paged.length === 0 ? (
            <div className="text-center py-14">
              <Radio className="h-10 w-10 text-slate-200 mx-auto mb-3" />
              <p className="text-sm text-slate-500">Belum ada aktivitas blast.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {paged.map((b) => (
                <div key={b.id} className="px-5 py-3.5 flex items-start justify-between gap-3 hover:bg-slate-50/70">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-slate-900">+{b.targetNumber}</p>
                      <Badge variant="outline" className="text-[10px] border-slate-200 text-slate-500">
                        oleh {b.user.username}
                      </Badge>
                      {b.sessionPhone && (
                        <span className="text-[10px] text-slate-400">via +{b.sessionPhone}</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1 max-w-xl">{b.message}</p>
                    {b.note && <p className="text-[11px] text-red-400 mt-0.5">{b.note}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {b.status === "SENT" ? (
                      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        +{rupiah(b.earning)}
                      </Badge>
                    ) : b.status === "REVOKED" ? (
                      <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 gap-1">
                        <Trash2 className="h-3 w-3" />
                        Dihapus −{rupiah(b.earning)}
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="gap-1">
                        <XCircle className="h-3 w-3" />
                        Gagal
                      </Badge>
                    )}
                    <span className="text-[10px] text-slate-400">{dateTime(b.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="gap-1">
            <ChevronLeft className="h-4 w-4" />
            Sebelumnya
          </Button>
          <span className="text-xs text-slate-500">
            Halaman {page} / {totalPages}
          </span>
          <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="gap-1">
            Berikutnya
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
