"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, MessageCircle, ArrowLeft, Eye, EyeOff, AlertCircle } from "lucide-react";
import { navigate, api, useApp } from "@/lib/store";

export default function AuthPage({ mode }: { mode: "login" | "register" }) {
  const { refresh } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);

  const [form, setForm] = useState({
    username: "",
    email: "",
    phone: "",
    password: "",
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        const res = await api("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ username: form.username, password: form.password }),
        });
        if (!res.ok) {
          setError(res.data.error || "Gagal masuk");
          return;
        }
        await refresh();
        navigate("/dashboard");
      } else {
        const res = await api("/api/auth/register", {
          method: "POST",
          body: JSON.stringify(form),
        });
        if (!res.ok) {
          setError(res.data.error || "Gagal mendaftar");
          return;
        }
        await refresh();
        navigate("/dashboard/whatsapp");
      }
    } finally {
      setLoading(false);
    }
  }

  const inputCls = "h-11 border-slate-200 focus-visible:ring-emerald-500";

  return (
    <div className="min-h-screen sb-hero-bg flex flex-col">
      <div className="p-4 sm:px-6">
        <Button variant="ghost" size="sm" className="gap-1.5 text-slate-600" onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4" />
          Kembali ke beranda
        </Button>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 pb-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 mb-4">
              <MessageCircle className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
              {mode === "login" ? "Selamat Datang Kembali" : "Buat Akun Baru"}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Sister<span className="font-bold text-emerald-600">Blast</span> —{" "}
              {mode === "login"
                ? "Masuk untuk melanjutkan blast Anda"
                : "Daftar gratis dan mulai menghasilkan hari ini"}
            </p>
          </div>

          <Card className="border-emerald-100 shadow-xl shadow-emerald-900/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">
                {mode === "login" ? "Masuk ke akun Anda" : "Formulir Pendaftaran"}
              </CardTitle>
              <CardDescription>
                {mode === "login"
                  ? "Gunakan username dan password Anda"
                  : "Isi semua kolom dengan data yang benar"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert variant="destructive" className="mb-4 py-2.5">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">{error}</AlertDescription>
                </Alert>
              )}
              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    placeholder="username_anda"
                    className={inputCls}
                    value={form.username}
                    onChange={set("username")}
                    required
                    autoComplete="username"
                  />
                </div>

                {mode === "register" && (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="email">Email (Gmail)</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="nama@gmail.com"
                        className={inputCls}
                        value={form.email}
                        onChange={set("email")}
                        required
                        autoComplete="email"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="phone">Nomor HP</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="081234567890 / 6281234567890"
                        className={inputCls}
                        value={form.phone}
                        onChange={set("phone")}
                        required
                        autoComplete="tel"
                      />
                      <p className="text-[11px] text-slate-500">
                        Format bebas, otomatis dikonversi ke kode negara 62.
                      </p>
                    </div>
                  </>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPass ? "text" : "password"}
                      placeholder={mode === "register" ? "Minimal 6 karakter" : "Password Anda"}
                      className={`${inputCls} pr-10`}
                      value={form.password}
                      onChange={set("password")}
                      required
                      autoComplete={mode === "register" ? "new-password" : "current-password"}
                    />
                    <button
                      type="button"
                      aria-label="Tampilkan password"
                      onClick={() => setShowPass((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/25 gap-2"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {mode === "login" ? "Masuk" : "Daftar Sekarang"}
                </Button>
              </form>

              <div className="mt-5 text-center text-sm text-slate-600">
                {mode === "login" ? (
                  <>
                    Belum punya akun?{" "}
                    <button className="font-semibold text-emerald-600 hover:text-emerald-700 hover:underline" onClick={() => navigate("/register")}>
                      Daftar gratis
                    </button>
                  </>
                ) : (
                  <>
                    Sudah punya akun?{" "}
                    <button className="font-semibold text-emerald-600 hover:text-emerald-700 hover:underline" onClick={() => navigate("/login")}>
                      Masuk di sini
                    </button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
