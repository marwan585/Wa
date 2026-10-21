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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Search,
  Ban,
  Trash2,
  RotateCcw,
  Coins,
  ShieldAlert,
} from "lucide-react";
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

interface UserRow {
  id: string;
  username: string;
  email: string;
  phone: string;
  balance: number;
  totalEarned: number;
  status: string;
  createdAt: string;
  _count: { blasts: number; sessions: number; withdrawals: number };
}

export default function AdminUsers() {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("ALL");
  const [confirmDelete, setConfirmDelete] = useState<UserRow | null>(null);
  const [adjustUser, setAdjustUser] = useState<UserRow | null>(null);
  const [adjustAmount, setAdjustAmount] = useState("");

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status !== "ALL") params.set("status", status);
    const res = await api<{ users: UserRow[] }>(`/api/admin/users?${params}`);
    if (res.ok) setUsers(res.data.users);
  }, [q, status]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  async function toggleBan(u: UserRow) {
    const action = u.status === "BANNED" ? "unban" : "ban";
    const res = await api(`/api/admin/users/${u.id}`, {
      method: "PATCH",
      body: JSON.stringify({ action }),
    });
    if (res.ok) {
      toast({ title: action === "ban" ? "Pengguna diblokir" : "Blokir dibuka" });
      await load();
    }
  }

  async function deleteUser() {
    if (!confirmDelete) return;
    const res = await api(`/api/admin/users/${confirmDelete.id}`, { method: "DELETE" });
    if (res.ok) {
      toast({ title: "Pengguna dihapus", description: confirmDelete.username });
      setConfirmDelete(null);
      await load();
    } else {
      toast({ title: "Gagal", description: res.data.error, variant: "destructive" });
    }
  }

  async function adjustBalance() {
    if (!adjustUser) return;
    const amount = Number(adjustAmount);
    if (!amount) {
      toast({ title: "Jumlah tidak valid", variant: "destructive" });
      return;
    }
    const res = await api(`/api/admin/users/${adjustUser.id}`, {
      method: "PATCH",
      body: JSON.stringify({ action: "adjustBalance", amount }),
    });
    if (res.ok) {
      toast({ title: "Saldo disesuaikan", description: `${adjustUser.username}: ${amount > 0 ? "+" : ""}${rupiah(amount)}` });
      setAdjustUser(null);
      setAdjustAmount("");
      await load();
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Manajemen Pengguna</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Lihat, blokir, hapus pengguna, dan sesuaikan saldo.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Cari username, email, atau nomor…"
            className="pl-10 h-11 border-slate-200"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="sm:w-44 h-11 border-slate-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Semua Status</SelectItem>
            <SelectItem value="ACTIVE">Aktif</SelectItem>
            <SelectItem value="BANNED">Diblokir</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {users === null ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
        </div>
      ) : users.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-sm text-slate-500">
            Tidak ada pengguna yang cocok.
          </CardContent>
        </Card>
      ) : (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-0">
            {/* Desktop table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs text-slate-500 uppercase tracking-wide">
                    <th className="px-5 py-3.5">Pengguna</th>
                    <th className="px-4 py-3.5">Saldo</th>
                    <th className="px-4 py-3.5">Blast</th>
                    <th className="px-4 py-3.5">Sesi</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5">Daftar</th>
                    <th className="px-5 py-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-slate-900">{u.username}</p>
                        <p className="text-[11px] text-slate-400">{u.email} • +{u.phone}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-bold text-slate-800">{rupiah(u.balance)}</p>
                        <p className="text-[11px] text-slate-400">earn {rupiah(u.totalEarned)}</p>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">{u._count.blasts}</td>
                      <td className="px-4 py-3.5 text-slate-600">{u._count.sessions}</td>
                      <td className="px-4 py-3.5">
                        {u.status === "BANNED" ? (
                          <Badge variant="destructive" className="gap-1">
                            <ShieldAlert className="h-3 w-3" />
                            Banned
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Aktif</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 text-xs">{dateTime(u.createdAt)}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1 text-teal-700 border-teal-200 hover:bg-teal-50"
                            onClick={() => {
                              setAdjustUser(u);
                              setAdjustAmount("");
                            }}
                          >
                            <Coins className="h-3.5 w-3.5" />
                            Saldo
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1 text-amber-700 border-amber-200 hover:bg-amber-50"
                            onClick={() => toggleBan(u)}
                          >
                            {u.status === "BANNED" ? <RotateCcw className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
                            {u.status === "BANNED" ? "Buka" : "Ban"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1 text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => setConfirmDelete(u)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="lg:hidden divide-y divide-slate-100">
              {users.map((u) => (
                <div key={u.id} className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">{u.username}</p>
                      <p className="text-[11px] text-slate-400 truncate">{u.email}</p>
                      <p className="text-[11px] text-slate-400">+{u.phone}</p>
                    </div>
                    {u.status === "BANNED" ? (
                      <Badge variant="destructive">Banned</Badge>
                    ) : (
                      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Aktif</Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Saldo: <b className="text-slate-800">{rupiah(u.balance)}</b></span>
                    <span className="text-slate-500">Blast: <b className="text-slate-800">{u._count.blasts}</b></span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 h-8 text-teal-700 border-teal-200" onClick={() => { setAdjustUser(u); setAdjustAmount(""); }}>
                      <Coins className="h-3.5 w-3.5 mr-1" />
                      Saldo
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 h-8 text-amber-700 border-amber-200" onClick={() => toggleBan(u)}>
                      {u.status === "BANNED" ? "Buka Blokir" : "Blokir"}
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 text-red-600 border-red-200" onClick={() => setConfirmDelete(u)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete confirm */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus pengguna?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete?.username} beserta semua data blast, sesi WhatsApp, dan riwayat
              withdraw-nya akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={deleteUser}>
              Hapus Permanen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Adjust balance dialog */}
      <Dialog open={!!adjustUser} onOpenChange={(o) => !o && setAdjustUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sesuaikan Saldo</DialogTitle>
            <DialogDescription>
              Gunakan nilai positif untuk menambah dan negatif untuk mengurangi saldo{" "}
              <b>{adjustUser?.username}</b> (saldo saat ini {rupiah(adjustUser?.balance)}).
            </DialogDescription>
          </DialogHeader>
          <Input
            type="number"
            placeholder="Contoh: 5000 atau -2000"
            value={adjustAmount}
            onChange={(e) => setAdjustAmount(e.target.value)}
            className="h-11"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAdjustUser(null)}>Batal</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={adjustBalance}>
              Simpan
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
