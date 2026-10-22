<div align="center">

# 💬 Sister Blast

**Platform WhatsApp Blast modern — dapatkan saldo untuk setiap pesan terkirim.**

Dibangun dengan Next.js 16 · Baileys · Prisma · Tailwind CSS · shadcn/ui

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![Node](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js)
![Prisma](https://img.shields.io/badge/Prisma-SQLite-2D3748?logo=prisma)
![Baileys](https://img.shields.io/badge/Baileys-WhatsApp%20Bot-25D366?logo=whatsapp)

</div>

---

## ✨ Fitur

### 👤 Untuk Pengguna
| Fitur | Keterangan |
|---|---|
| 📝 Registrasi & Login | Gmail, username, nomor HP + password |
| 📱 Koneksi WhatsApp | **Pairing code** (tanpa scan QR), auto-reconnect, dukungan **WhatsApp Business** |
| 🚀 Blast Pesan | Kirim pesan ke nomor target dari admin, otomatis dengan jeda aman |
| 💰 Saldo Otomatis | Reward per chat berhasil (rate ditentukan admin, min. Rp 900) |
| 🏦 Tarik Saldo | Minimum Rp 10.000 + riwayat lengkap |
| 🧭 UI Modern | Floating app navigator, sidebar collapsible, glassmorphism |

### 🛡️ Untuk Admin (URL tersembunyi `/#/adm`)
| Fitur | Keterangan |
|---|---|
| 📊 Dashboard | Statistik user, blast, & pendapatan |
| 👥 Manajemen User | Blokir / hapus / pantau pengguna |
| 📶 Monitor Sesi | Lihat semua sesi WhatsApp aktif |
| 📨 Monitor Blast | Pantau progres blast real-time |
| ✅ Konfirmasi Withdraw | Setujui / tolak penarikan saldo |
| 💬 Isi Pesan Blast | Atur template pesan yang dikirim |
| 🔢 Database Nomor | Impor nomor target format **JSON** (kode negara) |
| ⚙️ Rate & Maintenance | Set fee per chat + mode maintenance |
| 🔒 Kredensial Aman | Admin dibuat otomatis dari environment — **tidak tampil di UI** |

---

## ⚡ Instalasi Cepat — 1 Command

> Untuk VPS Ubuntu 20.04+ (as root). `setup.sh` menginstal semuanya otomatis: tarik kode terbaru, install dependensi, sinkron database, build, dan jalankan via PM2. **Database & sesi WhatsApp selalu aman** (di-backup otomatis sebelum update).

**0️⃣ Persiapan sekali saja** (jika VPS masih kosong):

```bash
apt update && apt install -y curl git && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt install -y nodejs && npm install -g pm2 && git clone https://github.com/marwan585/Wa.git /root/Wa
```

**1️⃣ Install & jalankan semuanya (1 command):**

```bash
cd /root/Wa && bash setup.sh
```

**🔄 Update ke versi terbaru kapan saja — command yang sama:**

```bash
cd /root/Wa && bash setup.sh
```

Selesai! 🎉 Website live di **`http://IP-VPS:2053`** — Panel admin di **`http://IP-VPS:2053/#/adm`**

---

## 📖 Instalasi Manual (Langkah demi Langkah)

### 1. Persiapan VPS
```bash
apt update && apt upgrade -y
apt install -y curl git wget
# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node -v          # pastikan v20.x
npm install -g pm2
```

### 2. Clone Project
```bash
git clone https://github.com/marwan585/Wa.git /root/Wa
cd /root/Wa
```

### 3. Install & Build
```bash
npm install --legacy-peer-deps
npx prisma generate
npx prisma db push
npm run build
```

### 4. Konfigurasi Environment
Edit `ecosystem.config.js` — sesuaikan bagian `env`:

| Variabel | Keterangan |
|---|---|
| `PORT` | Port aplikasi (default **2053** — juga didukung Cloudflare HTTPS) |
| `DATABASE_URL` | `file:/root/Wa/db/custom.db` (path absolut) |
| `SESSION_DIR` | `/root/Wa/sessions` (penyimpanan kredensial WA) |
| `AUTH_SECRET` / `ADMIN_SECRET` | **Wajib diganti** string acak: `openssl rand -hex 32` |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Kredensial admin — dibuat otomatis saat login pertama, tidak pernah tampil di UI |

### 5. Jalankan dengan PM2
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup       # ikuti instruksi agar auto-start saat reboot
```

### 6. Buka Firewall
```bash
ufw allow 22/tcp
ufw allow 2053/tcp
ufw enable
```
> ⚠️ Jika VPS memakai security group cloud (Vultr/DigitalOcean/AWS), buka port **2053/TCP** di dashboard penyedia.

---

## 🌐 Akses Website

| Halaman | URL |
|---|---|
| Beranda | `http://IP:2053/#/` |
| Daftar User | `http://IP:2053/#/register` |
| Dashboard User | `http://IP:2053/#/dashboard` |
| **Panel Admin** | `http://IP:2053/#/adm` *(URL rahasia — tidak ada tautan di UI)* |

### 🔗 Cara Pairing WhatsApp
1. Login → menu **WhatsApp** → masukkan nomor (contoh `6281234567890`)
2. Kode 8 digit muncul di layar
3. Di HP: **WhatsApp / WhatsApp Business → Setelan → Perangkat Tertaut → Tautkan dengan Nomor Telepon Saja**
4. Masukkan kode → status berubah **Terhubung** ✅
5. Menu **Blast** → mulai kirim & menghasilkan saldo

---

## 🛠️ Perintah Berguna

```bash
pm2 status                        # status aplikasi
pm2 logs sister-blast             # log real-time
pm2 restart sister-blast          # restart
pm2 monit                         # monitor CPU/RAM
npm run build && pm2 restart sister-blast   # deploy kode baru
npx prisma db push                # terapkan perubahan skema DB
```

**Backup database otomatis (crontab -e):**
```bash
0 * * * * cp /root/Wa/db/custom.db /root/backup-db/custom-$(date +\%F-\%H).db
```

---

## 🔧 Troubleshooting

| Masalah | Solusi |
|---|---|
| `EADDRINUSE` (port dipakai) | `pkill -9 -x nginx; fuser -k 2053/tcp; pm2 restart sister-blast` |
| Website tak bisa diakses | Cek `ufw status` & security group cloud → buka 2053/TCP |
| Kode pairing tak muncul | Klik **Kode Pairing Baru** di kartu sesi |
| Sesi putus setelah restart | Otomatis dipulihkan saat boot; jika belum klik **Sambungkan Ulang** |
| Nomor target habis | Admin → Database Nomor → impor JSON baru |

---

## 🔒 Checklist Keamanan Produksi

- [x] Kredensial admin hanya di environment server — tidak pernah dikirim ke browser
- [x] Password di-hash bcrypt, sesi via JWT httpOnly cookie
- [ ] Ganti `AUTH_SECRET` & `ADMIN_SECRET` dengan string acak (sudah otomatis via 1-command install)
- [ ] Aktifkan UFW & tutup port yang tidak perlu
- [ ] Backup database secara berkala
- [ ] Gunakan Cloudflare (port 2053 didukung) untuk HTTPS + proteksi DDoS

---

## 🏗️ Teknologi

- **Next.js 16** (App Router, standalone output) — fullstack
- **Baileys** — protokol WhatsApp Web (pairing code, multi-device)
- **Prisma + SQLite** — database ringan tanpa setup
- **Tailwind CSS 4 + shadcn/ui** — UI modern glassmorphism
- **PM2** — process manager produksi

## 📄 Lisensi

Proyek privat — seluruh hak dilindungi pemilik.
