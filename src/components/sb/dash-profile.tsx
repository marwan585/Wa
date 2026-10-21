"use client";

import { useState } from "react";
import { api, dateTime, useApp, navigate } from "@/lib/store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import {
  UserRound,
  Mail,
  Phone,
  CalendarDays,
  KeyRound,
  Loader2,
  BadgeCheck,
  ShieldAlert,
} from "lucide-react";

export default function DashProfile() {
  const { toast } = useToast();
  const { user, refresh } = useApp();
  const [phone, setPhone] = useState(user?.phone || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingPhone, setSavingPhone] = useState(false);
  const [savingPass, setSavingPass] = useState(false);

  async function savePhone(e: React.FormEvent) {
    e.preventDefault();
    setSavingPhone(true);
    try {
      const res = await api("/api/profile", {
        method: "PUT",
        body: JSON.stringify({ phone }),
      });
      if (!res.ok) {
        toast({ title: "Gagal", description: res.data.error, variant: "destructive" });
        return;
      }
      toast({ title: "Profil diperbarui", description: "Nomor HP berhasil diubah." });
      await refresh();
    } finally {
      setSavingPhone(false);
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setSavingPass(true);
    try {
      const res = await api("/api/profile", {
        method: "PUT",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) {
        toast({ title: "Gagal", description: res.data.error, variant: "destructive" });
        return;
      }
      toast({ title: "Password diubah", description: "Gunakan password baru saat login berikutnya." });
      setCurrentPassword("");
      setNewPassword("");
    } finally {
      setSavingPass(false);
    }
  }

  const inputCls = "h-11 border-slate-200 focus-visible:ring-emerald-500";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Profil Saya</h1>
        <p className="text-sm text-slate-500 mt-0.5">Kelola data akun dan keamanan Anda.</p>
      </div>

      {/* Identity card */}
      <Card className="border-emerald-100 shadow-sm overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-emerald-600 to-teal-700" />
        <CardContent className="p-5 sm:p-6 relative">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12 sm:-mt-14">
            <div className="h-24 w-24 rounded-3xl bg-white p-1.5 shadow-lg shadow-slate-900/10 shrink-0">
              <div className="h-full w-full rounded-[1.25rem] bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <span className="text-3xl font-extrabold text-white">
                  {user?.username?.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
            <div className="flex-1 pb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-extrabold text-slate-900">{user?.username}</h2>
                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 gap-1">
                  <BadgeCheck className="h-3 w-3" />
                  Aktif
                </Badge>
              </div>
              <p className="text-sm text-slate-500">Anggota Sister Blast</p>
            </div>
          </div>

          <Separator className="my-5" />

          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                <UserRound className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-slate-400">Username</p>
                <p className="font-semibold text-slate-800 truncate">{user?.username}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                <Mail className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-slate-400">Email</p>
                <p className="font-semibold text-slate-800 truncate">{user?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                <Phone className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-[11px] text-slate-400">Nomor HP</p>
                <p className="font-semibold text-slate-800">+{user?.phone}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                <CalendarDays className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-[11px] text-slate-400">Bergabung</p>
                <p className="font-semibold text-slate-800">{dateTime(user?.createdAt)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit forms */}
      <div className="grid md:grid-cols-2 gap-5">
        <Card className="border-emerald-100 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Phone className="h-4 w-4 text-emerald-600" />
              Ubah Nomor HP
            </CardTitle>
            <CardDescription>Nomor kontak Anda, terpisah dari sesi WhatsApp blast.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={savePhone} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="pf-phone">Nomor HP Baru</Label>
                <Input
                  id="pf-phone"
                  className={inputCls}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="081234567890"
                  inputMode="numeric"
                />
              </div>
              <Button type="submit" disabled={savingPhone} className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2">
                {savingPhone && <Loader2 className="h-4 w-4 animate-spin" />}
                Simpan Nomor
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-emerald-100 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-emerald-600" />
              Ubah Password
            </CardTitle>
            <CardDescription>Gunakan password yang kuat dan mudah Anda ingat.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={savePassword} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="pf-curpass">Password Saat Ini</Label>
                <Input
                  id="pf-curpass"
                  type="password"
                  className={inputCls}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pf-newpass">Password Baru</Label>
                <Input
                  id="pf-newpass"
                  type="password"
                  className={inputCls}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  required
                  autoComplete="new-password"
                />
              </div>
              <Button type="submit" disabled={savingPass} className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2">
                {savingPass && <Loader2 className="h-4 w-4 animate-spin" />}
                Simpan Password
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Alert className="border-slate-200 bg-slate-50 text-slate-700">
        <ShieldAlert className="h-4 w-4" />
        <AlertDescription className="text-[13px]">
          Jaga kerahasiaan akun Anda. Sister Blast tidak pernah meminta password melalui
          pesan WhatsApp.{" "}
          <button className="font-semibold text-emerald-600 hover:underline" onClick={() => navigate("/")}>
            Kembali ke beranda
          </button>
        </AlertDescription>
      </Alert>
    </div>
  );
}
