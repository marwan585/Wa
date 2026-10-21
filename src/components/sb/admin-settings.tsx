"use client";

import { useEffect, useState, useCallback } from "react";
import { api, rupiah } from "@/lib/store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Save,
  MessageSquareText,
  Percent,
  Wallet,
  Wrench,
  AlertTriangle,
} from "lucide-react";

interface SettingsData {
  messageTemplate: string;
  ratePerChat: number;
  minWithdraw: number;
  maintenance: boolean;
  maintenanceNote: string;
}

export default function AdminSettings() {
  const { toast } = useToast();
  const [data, setData] = useState<SettingsData | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await api<{ settings: SettingsData }>("/api/admin/settings");
    if (res.ok) setData(res.data.settings);
  }, []);

  useEffect(() => {
    load();
     
  }, []);

  async function save(patch: Partial<SettingsData>, label: string) {
    setSaving(true);
    try {
      const res = await api("/api/admin/settings", {
        method: "PUT",
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        toast({ title: "Gagal", description: res.data.error, variant: "destructive" });
        return;
      }
      toast({ title: "Tersimpan", description: label });
      await load();
    } finally {
      setSaving(false);
    }
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
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Pengaturan Sistem</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Atur pesan blast, rate per chat, minimal withdraw, dan mode maintenance.
        </p>
      </div>

      {/* Message template */}
      <Card className="border-emerald-100 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquareText className="h-4 w-4 text-emerald-600" />
            Pesan Blast
          </CardTitle>
          <CardDescription>
            Pesan ini yang akan dikirim ke nomor target saat pengguna melakukan blast.
            Gunakan <code className="bg-slate-100 px-1 rounded text-emerald-700">{"{nomor}"}</code>{" "}
            untuk menyisipkan nomor target otomatis.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            rows={5}
            value={data.messageTemplate}
            onChange={(e) => setData({ ...data, messageTemplate: e.target.value })}
            placeholder="Tulis pesan promosi di sini…"
            className="border-slate-200 focus-visible:ring-emerald-500 resize-none"
          />
          <div className="flex justify-between items-center">
            <p className="text-[11px] text-slate-400">{data.messageTemplate.length}/2000 karakter</p>
            <Button
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 gap-2"
              onClick={() => save({ messageTemplate: data.messageTemplate }, "Pesan blast diperbarui")}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Simpan Pesan
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Rate & withdraw */}
      <div className="grid md:grid-cols-2 gap-5">
        <Card className="border-emerald-100 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Percent className="h-4 w-4 text-emerald-600" />
              Rate per Chat
            </CardTitle>
            <CardDescription>
              Bayaran setiap 1 chat terkirim. Minimal Rp 900.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="set-rate">Nominal (Rp)</Label>
              <Input
                id="set-rate"
                type="number"
                min={900}
                className="h-11 border-slate-200"
                value={data.ratePerChat}
                onChange={(e) => setData({ ...data, ratePerChat: Number(e.target.value) })}
              />
            </div>
            <Button
              disabled={saving}
              className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2"
              onClick={() => save({ ratePerChat: data.ratePerChat }, "Rate diperbarui")}
            >
              <Save className="h-4 w-4" />
              Simpan Rate
            </Button>
          </CardContent>
        </Card>

        <Card className="border-emerald-100 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="h-4 w-4 text-emerald-600" />
              Minimal Withdraw
            </CardTitle>
            <CardDescription>
              Batas minimal saldo yang bisa dicairkan pengguna.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="set-minwd">Nominal (Rp)</Label>
              <Input
                id="set-minwd"
                type="number"
                min={1000}
                className="h-11 border-slate-200"
                value={data.minWithdraw}
                onChange={(e) => setData({ ...data, minWithdraw: Number(e.target.value) })}
              />
            </div>
            <Button
              disabled={saving}
              className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2"
              onClick={() => save({ minWithdraw: data.minWithdraw }, "Minimal withdraw diperbarui")}
            >
              <Save className="h-4 w-4" />
              Simpan Minimal
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Maintenance */}
      <Card className={data.maintenance ? "border-amber-300 shadow-md shadow-amber-500/10" : "border-slate-200 shadow-sm"}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Wrench className={data.maintenance ? "h-4 w-4 text-amber-600" : "h-4 w-4 text-slate-500"} />
            Mode Maintenance
            {data.maintenance && (
              <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 gap-1">
                <AlertTriangle className="h-3 w-3" />
                AKTIF
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Saat aktif, <b>seluruh pengguna tidak dapat blast pesan</b>. Sesi dan saldo tetap aman.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Separator />
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-800">Status Maintenance</p>
              <p className="text-xs text-slate-500">
                {data.maintenance ? "Blast dinonaktifkan untuk semua pengguna" : "Sistem berjalan normal"}
              </p>
            </div>
            <Switch
              checked={data.maintenance}
              onCheckedChange={(v) => save({ maintenance: v }, v ? "Maintenance AKTIF" : "Maintenance NONAKTIF")}
              className="data-[state=checked]:bg-amber-500"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="set-maintnote">Catatan untuk pengguna</Label>
            <Textarea
              id="set-maintnote"
              rows={2}
              value={data.maintenanceNote}
              onChange={(e) => setData({ ...data, maintenanceNote: e.target.value })}
              className="border-slate-200 resize-none"
              placeholder="Contoh: Server sedang diperbarui, kembali dalam 1 jam."
            />
            <Button
              size="sm"
              variant="outline"
              disabled={saving}
              className="gap-1.5"
              onClick={() => save({ maintenanceNote: data.maintenanceNote }, "Catatan disimpan")}
            >
              <Save className="h-3.5 w-3.5" />
              Simpan Catatan
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
