"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  MessageCircle,
  Zap,
  Wallet,
  ShieldCheck,
  Link2,
  Clock,
  TrendingUp,
  Users,
  Send,
  ArrowRight,
  CheckCircle2,
  Smartphone,
  Banknote,
} from "lucide-react";
import { navigate } from "@/lib/store";

const features = [
  {
    icon: Link2,
    title: "Pairing Tanpa Ribet",
    desc: "Hubungkan nomor WhatsApp Anda cukup dengan kode pairing 8 digit. Tanpa scan QR yang ribet, langsung terhubung dalam hitungan detik.",
  },
  {
    icon: Zap,
    title: "Blast Otomatis",
    desc: "Pesan dari admin dikirim otomatis ke nomor target satu per satu dengan jeda aman, sementara Anda tinggal menikmati pemasukan.",
  },
  {
    icon: Banknote,
    title: "Bayaran per Chat",
    desc: "Setiap chat yang berhasil terkirim langsung dicatat dan menambah saldo Anda. Minimal Rp 900 per chat terkirim.",
  },
  {
    icon: Wallet,
    title: "Withdraw Cepat",
    desc: "Tarik penghasilan mulai Rp 10.000 ke e-wallet atau rekening bank. Riwayat pencairan transparan dan bisa dipantau kapan saja.",
  },
  {
    icon: ShieldCheck,
    title: "Sesi Terenkripsi",
    desc: "Data sesi WhatsApp disimpan aman di server. Anda bisa memutus koneksi kapan pun dari dashboard Anda sendiri.",
  },
  {
    icon: Clock,
    title: "Riwayat Lengkap",
    desc: "Semua aktivitas blast dan pencairan terekam rapi lengkap dengan status, jumlah, dan waktunya.",
  },
];

const steps = [
  {
    icon: Users,
    step: "1",
    title: "Daftar Akun",
    desc: "Registrasi menggunakan Gmail, username, dan nomor HP. Gratis dan hanya butuh 1 menit.",
  },
  {
    icon: Smartphone,
    step: "2",
    title: "Pairing WhatsApp",
    desc: "Masukkan nomor WhatsApp Anda, dapatkan kode pairing, lalu konfirmasi di aplikasi WhatsApp.",
  },
  {
    icon: Send,
    step: "3",
    title: "Blast & Dapatkan Saldo",
    desc: "Mulai blast. Setiap pesan terkirim ke nomor target langsung menambah saldo Anda.",
  },
];

function ChatMock() {
  return (
    <div className="relative mx-auto w-[280px] sm:w-[320px]">
      <div className="sb-float rounded-[2.2rem] border-[10px] border-slate-900 bg-slate-900 shadow-2xl shadow-emerald-900/30">
        <div className="rounded-[1.6rem] overflow-hidden bg-[#0b141a]">
          <div className="flex items-center gap-3 bg-[#1f2c33] px-4 py-3">
            <div className="h-9 w-9 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <MessageCircle className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Sister Blast</p>
              <p className="text-[11px] text-emerald-400 flex items-center gap-1">
                <span className="sb-pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                online
              </p>
            </div>
          </div>
          <div className="px-3 py-4 space-y-2.5 min-h-[300px]">
            <div className="sb-bubble ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-[#005c4b] px-3 py-2">
              <p className="text-[12px] leading-snug text-emerald-50">
                Halo! Promo spesial hari ini, kunjungi toko kami sekarang
              </p>
              <p className="text-right text-[9px] text-emerald-200/70 mt-1">
                10:01 <span className="text-emerald-300">✓✓</span>
              </p>
            </div>
            <div className="sb-bubble mr-auto max-w-[85%] rounded-2xl rounded-tl-sm bg-[#202c33] px-3 py-2" style={{ animationDelay: "0.6s" }}>
              <p className="text-[12px] leading-snug text-slate-200">
                Terima kasih, pesan diterima!
              </p>
              <p className="text-right text-[9px] text-slate-400 mt-1">10:02</p>
            </div>
            <div className="sb-bubble ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-[#005c4b] px-3 py-2" style={{ animationDelay: "1.2s" }}>
              <p className="text-[12px] leading-snug text-emerald-50">
                Diskon 50% hanya berlaku hari ini ya kak!
              </p>
              <p className="text-right text-[9px] text-emerald-200/70 mt-1">
                10:03 <span className="text-emerald-300">✓✓</span>
              </p>
            </div>
            <div className="sb-bubble mr-auto max-w-[85%] rounded-2xl rounded-tl-sm bg-[#202c33] px-3 py-2" style={{ animationDelay: "1.8s" }}>
              <p className="text-[12px] leading-snug text-slate-200">
                Siap, langsung order
              </p>
              <p className="text-right text-[9px] text-slate-400 mt-1">10:04</p>
            </div>
          </div>
          <div className="flex items-center justify-between bg-[#111b21] px-4 py-2.5 border-t border-[#202c33]">
            <span className="text-[11px] text-slate-400">Chat terkirim hari ini</span>
            <span className="text-[13px] font-bold text-emerald-400">+ Rp 27.900</span>
          </div>
        </div>
      </div>
      <div className="absolute -left-10 top-10 hidden sm:block">
        <div className="sb-glass rounded-2xl border border-emerald-100 px-4 py-3 shadow-lg shadow-emerald-900/10">
          <p className="text-[10px] font-medium text-slate-500">Rate per chat</p>
          <p className="text-lg font-extrabold sb-gradient-text">Rp 900+</p>
        </div>
      </div>
      <div className="absolute -right-8 bottom-16 hidden sm:block">
        <div className="sb-glass rounded-2xl border border-emerald-100 px-4 py-3 shadow-lg shadow-emerald-900/10">
          <p className="text-[10px] font-medium text-slate-500">Status koneksi</p>
          <p className="text-sm font-bold text-emerald-600 flex items-center gap-1.5">
            <span className="sb-pulse-dot inline-block h-2 w-2 rounded-full bg-emerald-500" />
            Terhubung
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  const [rate, setRate] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/public-info")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.ratePerChat) setRate(d.ratePerChat);
      })
      .catch(() => undefined);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Navbar */}
      <header className="sticky top-0 z-50 sb-glass border-b border-emerald-100/60">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-500/30">
              <MessageCircle className="h-5 w-5 text-white" />
            </div>
            <div className="leading-tight">
              <p className="font-extrabold text-slate-900 tracking-tight">
                Sister<span className="sb-gradient-text">Blast</span>
              </p>
              <p className="text-[10px] text-slate-500 -mt-0.5">WhatsApp Blast Platform</p>
            </div>
          </div>
          <nav className="flex items-center gap-2">
            <Button variant="ghost" className="text-slate-700 hover:text-emerald-700" onClick={() => navigate("/login")}>
              Masuk
            </Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/25" onClick={() => navigate("/register")}>
              Daftar Gratis
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="sb-hero-bg">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-14 pb-16 sm:pt-20 sm:pb-24 grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-5 bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 gap-1.5 px-3 py-1.5">
                <TrendingUp className="h-3.5 w-3.5" />
                Penghasilan baru dari WhatsApp
              </Badge>
              <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.1]">
                Kirim Pesan WhatsApp,{" "}
                <span className="sb-gradient-text">Dibayar per Chat</span> Terkirim.
              </h1>
              <p className="mt-5 text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
                Sister Blast menghubungkan nomor WhatsApp Anda ke pesan promosi yang sudah
                disiapkan admin. Setiap pesan yang berhasil terkirim ke nomor target
                langsung menambah saldo —{" "}
                <span className="font-semibold text-emerald-700">
                  mulai Rp {rate ? rate.toLocaleString("id-ID") : "900"} per chat
                </span>
                .
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-base h-12 px-7 shadow-lg shadow-emerald-600/30 gap-2" onClick={() => navigate("/register")}>
                  Mulai Sekarang
                  <ArrowRight className="h-5 w-5" />
                </Button>
                <Button size="lg" variant="outline" className="h-12 px-7 border-emerald-200 text-emerald-700 hover:bg-emerald-50 text-base" onClick={() => navigate("/login")}>
                  Sudah punya akun
                </Button>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
                {["Gratis mendaftar", "Withdraw mulai Rp 10.000", "Tanpa syarat rumit"].map((t) => (
                  <span key={t} className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    {t}
                  </span>
                ))}
              </div>
            </div>
            <ChatMock />
          </div>
        </section>

        {/* Stats strip */}
        <section className="border-y border-emerald-100 bg-gradient-to-r from-emerald-50/80 via-white to-teal-50/60">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {[
              { icon: Send, label: "Chat Terkirim", value: "1 Jt+" },
              { icon: Users, label: "Pengguna Aktif", value: "500+" },
              { icon: Banknote, label: "Dibayarkan", value: "Rp 100 Jt+" },
              { icon: ShieldCheck, label: "Uptime Server", value: "99,9%" },
            ].map((s) => (
              <div key={s.label} className="flex flex-col items-center gap-1.5">
                <s.icon className="h-6 w-6 text-emerald-600" />
                <p className="text-xl sm:text-2xl font-extrabold text-slate-900">{s.value}</p>
                <p className="text-xs text-slate-500">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-20">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <Badge variant="outline" className="mb-3 border-emerald-200 text-emerald-700 bg-emerald-50">
              Fitur Unggulan
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
              Semua yang Anda butuhkan untuk{" "}
              <span className="sb-gradient-text">menghasilkan</span>
            </h2>
            <p className="mt-3 text-slate-600">
              Dashboard modern, koneksi WhatsApp yang stabil, dan sistem pembayaran
              yang transparan.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f) => (
              <Card key={f.title} className="sb-card-hover border-emerald-100/80 shadow-sm">
                <CardContent className="p-6">
                  <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-500/25 mb-4">
                    <f.icon className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="font-bold text-slate-900 mb-1.5">{f.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="bg-slate-950 relative overflow-hidden">
          <div className="absolute inset-0 opacity-20" style={{ background: "radial-gradient(40rem 20rem at 70% 0%, oklch(0.6 0.13 163), transparent 60%)" }} />
          <div className="relative mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-20">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <Badge className="mb-3 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/15">
                Cara Kerja
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                Mulai menghasilkan dalam 3 langkah
              </h2>
            </div>
            <div className="grid sm:grid-cols-3 gap-6">
              {steps.map((s, i) => (
                <div key={s.step} className="relative rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                  {i < steps.length - 1 && (
                    <div className="hidden sm:block absolute top-1/2 -right-4 text-emerald-500/60">
                      <ArrowRight className="h-6 w-6" />
                    </div>
                  )}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                      <s.icon className="h-5 w-5 text-emerald-400" />
                    </div>
                    <span className="text-3xl font-extrabold text-emerald-500/30">0{s.step}</span>
                  </div>
                  <h3 className="font-bold text-white mb-1.5">{s.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-20">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-600 to-teal-700 px-6 sm:px-12 py-12 sm:py-16 text-center shadow-2xl shadow-emerald-600/30">
            <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-emerald-300/20 blur-2xl" />
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Siap dapat penghasilan dari WhatsApp?
              </h2>
              <p className="mt-3 text-emerald-50/90 max-w-xl mx-auto">
                Bergabung sekarang, hubungkan nomor Anda, dan mulai blast hari ini juga.
                Pendaftaran gratis, tanpa biaya apa pun.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Button size="lg" className="bg-white text-emerald-700 hover:bg-emerald-50 h-12 px-8 text-base shadow-lg" onClick={() => navigate("/register")}>
                  Daftar Sekarang — Gratis
                </Button>
                <Button size="lg" variant="outline" className="border-white/40 text-white hover:bg-white/10 h-12 px-8 text-base" onClick={() => navigate("/login")}>
                  Masuk
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <MessageCircle className="h-4 w-4 text-white" />
              </div>
              <p className="font-extrabold text-slate-900">
                Sister<span className="sb-gradient-text">Blast</span>
              </p>
            </div>
            <p className="text-xs text-slate-500 text-center">
              © {new Date().getFullYear()} Sister Blast. Platform blast WhatsApp dengan bayaran per chat terkirim.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
