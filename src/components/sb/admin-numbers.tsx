"use client";

import { useEffect, useState, useCallback } from "react";
import { api, dateTime } from "@/lib/store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Upload,
  Plus,
  Trash2,
  Database,
  FileJson,
  CheckCircle2,
  Eraser,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface NumberRow {
  id: string;
  phone: string;
  country: string;
  status: string;
  createdAt: string;
}

interface NumbersData {
  items: NumberRow[];
  total: number;
  available: number;
  used: number;
  page: number;
  totalPages: number;
}

export default function AdminNumbers() {
  const { toast } = useToast();
  const [data, setData] = useState<NumbersData | null>(null);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("ALL");
  const [jsonInput, setJsonInput] = useState("");
  const [importing, setImporting] = useState(false);
  const [singlePhone, setSinglePhone] = useState("");
  const [addingSingle, setAddingSingle] = useState(false);
  const [confirmClear, setConfirmClear] = useState<"used" | "all" | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page) });
    if (filter !== "ALL") params.set("status", filter);
    const res = await api<NumbersData>(`/api/admin/numbers?${params}`);
    if (res.ok) setData(res.data);
  }, [page, filter]);

  useEffect(() => {
    load();
     
  }, [page, filter]);

  async function importJson() {
    setImporting(true);
    try {
      let payload: unknown;
      try {
        payload = JSON.parse(jsonInput);
      } catch {
        toast({ title: "JSON tidak valid", description: "Periksa kembali format JSON Anda.", variant: "destructive" });
        return;
      }
      const res = await api<{ inserted: number; duplicates: number; invalid: number }>("/api/admin/numbers", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        toast({ title: "Gagal impor", description: res.data.error, variant: "destructive" });
        return;
      }
      toast({
        title: "Impor berhasil",
        description: `${res.data.inserted} nomor baru • ${res.data.duplicates} duplikat dilewati • ${res.data.invalid} tidak valid`,
      });
      setJsonInput("");
      setPage(1);
      await load();
    } finally {
      setImporting(false);
    }
  }

  async function addSingle() {
    setAddingSingle(true);
    try {
      const res = await api("/api/admin/numbers", {
        method: "PUT",
        body: JSON.stringify({ phone: singlePhone }),
      });
      if (!res.ok) {
        toast({ title: "Gagal", description: res.data.error, variant: "destructive" });
        return;
      }
      toast({ title: "Nomor ditambahkan", description: `+${singlePhone}` });
      setSinglePhone("");
      await load();
    } finally {
      setAddingSingle(false);
    }
  }

  async function clearData(mode: "used" | "all") {
    const res = await api(`/api/admin/numbers?mode=${mode}`, { method: "DELETE" });
    if (res.ok) {
      toast({ title: mode === "used" ? "Nomor terpakai dibersihkan" : "Semua nomor dihapus" });
      setConfirmClear(null);
      setPage(1);
      await load();
    }
  }

  async function removeOne(id: string) {
    const res = await api(`/api/admin/numbers?id=${id}`, { method: "DELETE" });
    if (res.ok) await load();
  }

  if (!data) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Database Nomor Target</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Nomor tujuan blast. Setiap nomor hanya dipakai satu kali lalu ditandai USED.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 gap-1">
            <CheckCircle2 className="h-3 w-3" />
            {data.available} tersedia
          </Badge>
          <Badge variant="outline" className="border-slate-200 text-slate-500">
            {data.used} dipakai
          </Badge>
        </div>
      </div>

      <div className="grid xl:grid-cols-5 gap-5">
        {/* Import & add */}
        <div className="xl:col-span-2 space-y-5">
          <Card className="border-emerald-100 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileJson className="h-4 w-4 text-emerald-600" />
                Impor JSON
              </CardTitle>
              <CardDescription>
                Format: <code className="bg-slate-100 px-1 rounded text-emerald-700">[&quot;6281234567890&quot;]</code> atau{" "}
                <code className="bg-slate-100 px-1 rounded text-emerald-700">[{'{'}&quot;phone&quot;: &quot;81234567890&quot;, &quot;country&quot;: &quot;62&quot;{'}'}]</code>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                rows={7}
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder={'[\n  "6281234567890",\n  { "phone": "8123456791", "country": "62" }\n]'}
                className="font-mono text-xs border-slate-200 focus-visible:ring-emerald-500 resize-none"
              />
              <Button
                disabled={importing || !jsonInput.trim()}
                className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2"
                onClick={importJson}
              >
                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Impor Nomor
              </Button>
            </CardContent>
          </Card>

          <Card className="border-emerald-100 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Plus className="h-4 w-4 text-emerald-600" />
                Tambah Manual
              </CardTitle>
              <CardDescription>Satu nomor dengan kode negara di depan.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="num-single">Nomor (format kode negara)</Label>
                <Input
                  id="num-single"
                  placeholder="6281234567890"
                  className="h-11 border-slate-200"
                  value={singlePhone}
                  onChange={(e) => setSinglePhone(e.target.value)}
                  inputMode="numeric"
                />
              </div>
              <Button
                disabled={addingSingle || !singlePhone.trim()}
                variant="outline"
                className="w-full gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                onClick={addSingle}
              >
                {addingSingle ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Tambah Nomor
              </Button>
            </CardContent>
          </Card>

          <Card className="border-red-100 shadow-sm">
            <CardContent className="p-5 space-y-3">
              <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <Eraser className="h-4 w-4 text-red-500" />
                Bersihkan Database
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50" onClick={() => setConfirmClear("used")}>
                  Hapus Terpakai
                </Button>
                <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50" onClick={() => setConfirmClear("all")}>
                  Hapus Semua
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* List */}
        <Card className="xl:col-span-3 border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="h-4 w-4 text-emerald-600" />
                Daftar Nomor ({data.total})
              </CardTitle>
              <Select value={filter} onValueChange={(v) => { setFilter(v); setPage(1); }}>
                <SelectTrigger className="w-36 h-9 border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua</SelectItem>
                  <SelectItem value="AVAILABLE">Tersedia</SelectItem>
                  <SelectItem value="USED">Dipakai</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <CardDescription>
              Halaman {data.page} dari {data.totalPages}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.items.length === 0 ? (
              <div className="text-center py-12">
                <Database className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                <p className="text-sm text-slate-500">Belum ada nomor pada filter ini.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[480px] overflow-y-auto sb-scroll">
                {data.items.map((n) => (
                  <div key={n.id} className="flex items-center justify-between py-2.5 gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 font-mono">+{n.phone}</p>
                      <p className="text-[11px] text-slate-400">{dateTime(n.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {n.status === "AVAILABLE" ? (
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Tersedia</Badge>
                      ) : (
                        <Badge variant="outline" className="border-slate-200 text-slate-500">Dipakai</Badge>
                      )}
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-red-600" onClick={() => removeOne(n.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {data.totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 mt-2 border-t border-slate-100">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="gap-1">
                  <ChevronLeft className="h-4 w-4" />
                  Sebelumnya
                </Button>
                <span className="text-xs text-slate-500">
                  {data.page} / {data.totalPages}
                </span>
                <Button size="sm" variant="outline" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)} className="gap-1">
                  Berikutnya
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!confirmClear} onOpenChange={(o) => !o && setConfirmClear(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmClear === "all" ? "Hapus SEMUA nomor?" : "Hapus nomor terpakai?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmClear === "all"
                ? "Seluruh database nomor target akan dikosongkan. Pengguna tidak bisa blast sampai Anda menambahkan nomor baru."
                : "Nomor yang sudah dipakai akan dihapus. Nomor yang masih tersedia tetap aman."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => confirmClear && clearData(confirmClear)}>
              Ya, Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
