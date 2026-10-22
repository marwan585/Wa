# Panduan Deploy Sister Blast di VPS (Port 2053)

Panduan lengkap menjalankan **Sister Blast** di VPS Anda sendiri, berjalan langsung di **IP VPS dengan port 2053**.

> ℹ️ **Kenapa port 2053?** Port di atas 1024 tidak butuh izin khusus (tidak perlu `setcap`), bebas konflik dengan nginx/apache bawaan, dan **2053 adalah salah satu port HTTPS yang didukung Cloudflare** — memudahkan setup HTTPS via Cloudflare nanti.

---

## ⚡ Instalasi Cepat (1 Command)

Jika project sudah di-clone di `/root/Wa`, jalankan **satu command** berikut — otomatis update kode terbaru dari GitHub, install dependensi, build, dan jalankan via PM2:

```bash
cd /root/Wa && git fetch origin && git reset --hard origin/main && mkdir -p sessions && sed -i "s|/opt/sisterblast|$PWD|g; s|ganti-dengan-string-acak-panjang-untuk-user|$(openssl rand -hex 32)|; s|ganti-dengan-string-acak-panjang-untuk-admin|$(openssl rand -hex 32)|" ecosystem.config.js && echo "DATABASE_URL=file:$PWD/db/custom.db" > .env && npm install --legacy-peer-deps && npx prisma generate && npm run build && (pm2 delete sister-blast 2>/dev/null; true) && pm2 start ecosystem.config.js && pm2 save && sleep 3 && pm2 logs sister-blast --lines 15 --nostream
```

Apa yang dilakukan command ini:
1. **Sinkronisasi kode** — ambil versi terbaru dari GitHub
2. **Sesuaikan path** — `DATABASE_URL` & `SESSION_DIR` otomatis mengikuti lokasi project (`/root/Wa`)
3. **Generate secret acak** — `AUTH_SECRET` & `ADMIN_SECRET` dibuat otomatis (aman)
4. **Install + build + start** — npm install, prisma generate, next build, PM2 start **port 2053**

> Catatan: jika command ini dijalankan ulang, database akan kembali ke kondisi awal (versi GitHub) dan semua sesi login user ter-logout (secret baru dibuat). Data penting sebaiknya di-backup dulu.

---

## 1. Persiapan VPS

Spesifikasi minimum: **1 vCPU, 1 GB RAM, 10 GB storage**, sistem operasi **Ubuntu 20.04 / 22.04 / 24.04**.

Login ke VPS Anda:

```bash
ssh root@IP_VPS_ANDA
```

Update sistem dan pasang dependensi dasar:

```bash
apt update && apt upgrade -y
apt install -y curl git wget libcap2-bin
```

Pasang **Node.js 20** (LTS):

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node -v   # pastikan v20.x
```

Pasang **PM2** (process manager agar website berjalan 24 jam & auto-restart):

```bash
npm install -g pm2
```

---

## 2. Upload Project ke VPS

**Opsi A — dari komputer lokal (rsync, paling cepat):**

Jalankan di komputer Anda (bukan di VPS):

```bash
rsync -avz --exclude node_modules --exclude .next --exclude sessions \
  ./ root@IP_VPS_ANDA:/opt/sisterblast/
```

**Opsi B — via Git:**

```bash
cd /opt
git clone https://github.com/username/sisterblast.git
cd sisterblast
```

---

## 3. Install & Build

Di dalam folder project (`/opt/sisterblast`):

```bash
# Install dependensi
npm install

# Siapkan database SQLite + generate client
npx prisma generate
npx prisma db push

# Build produksi
npm run build
```

Setelah build selesai, folder `.next/standalone` berisi server produksi yang siap dijalankan.

---

## 4. Buka Firewall Port 2053

Port **2053** berada di atas 1024, jadi **tidak perlu** `setcap` atau izin khusus. Cukup buka firewall:

```bash
ufw allow 22/tcp
ufw allow 2053/tcp
ufw enable
ufw status
```

> ⚠️ Jika VPS Anda memakai security group penyedia cloud (Vultr, DigitalOcean, AWS, dll), buka juga port **2053/TCP** di dashboard penyedia tersebut.

---

## 5. Konfigurasi Environment & Jalankan

File `ecosystem.config.js` sudah disertakan di project. **Edit dulu** nilai berikut sesuai lokasi di VPS:

```bash
nano ecosystem.config.js
```

- `DATABASE_URL` → `file:/opt/sisterblast/db/custom.db` (path absolut)
- `SESSION_DIR` → `/opt/sisterblast/sessions`
- `AUTH_SECRET` & `ADMIN_SECRET` → **ganti dengan string acak panjang** (misal hasil `openssl rand -hex 32`)
- `ADMIN_USERNAME` / `ADMIN_PASSWORD` → kredensial admin (hanya tersimpan di server, tidak pernah tampil di UI)

Buat folder sesi lalu jalankan:

```bash
mkdir -p sessions
pm2 start ecosystem.config.js
pm2 save
pm2 startup    # ikuti perintahnya agar PM2 auto-start saat reboot
```

Cek status:

```bash
pm2 status
pm2 logs sister-blast --lines 30
```

---

## 6. Akses Website

Website kini berjalan di **IP VPS Anda, port 2053**:

```
http://IP_VPS_ANDA:2053
```

Contoh: `http://103.150.10.20:2053`

| Halaman            | Alamat (hash route)                      |
|--------------------|------------------------------------------|
| Beranda            | `http://IP:2053/#/`                      |
| Daftar             | `http://IP:2053/#/register`              |
| Login              | `http://IP:2053/#/login`                 |
| Dashboard          | `http://IP:2053/#/dashboard`             |
| **Panel Admin**    | `http://IP:2053/#/adm` (tidak ada tautan di UI — simpan URL ini) |

> 💡 **Bonus Cloudflare:** 2053 termasuk port HTTPS yang didukung Cloudflare (`https://IP:2053` bisa diproksi via Cloudflare dengan SSL mode Full).

---

## 7. (Opsional) HTTPS dengan Domain + Nginx + SSL Gratis

Jika punya domain, arahkan A record ke IP VPS lalu pasang Nginx sebagai reverse proxy + SSL Let's Encrypt:

```bash
apt install -y nginx certbot python3-certbot-nginx

# Site config
cat > /etc/nginx/sites-available/sisterblast <<'EOF'
server {
    listen 443;
    server_name domainanda.com;
    location / {
        proxy_pass http://127.0.0.1:2053;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

ln -s /etc/nginx/sites-available/sisterblast /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

Aplikasi sudah berjalan di port 2053 — Nginx hanya meneruskan trafik dari port 443 (HTTPS) ke aplikasi. Tidak perlu ubah port di `ecosystem.config.js`.

Pasang SSL gratis:

```bash
certbot --nginx -d domainanda.com --redirect
```

Website kini bisa diakses via `https://domainanda.com`.

---

## 8. Perintah Berguna Sehari-hari

| Perintah                          | Fungsi                                  |
|-----------------------------------|-----------------------------------------|
| `pm2 status`                      | Lihat status aplikasi                   |
| `pm2 logs sister-blast`           | Lihat log real-time                     |
| `pm2 restart sister-blast`        | Restart aplikasi                        |
| `pm2 monit`                       | Monitor CPU/RAM                         |
| `npx prisma db push`              | Terapkan perubahan skema database       |
| `npm run build && pm2 restart sister-blast` | Deploy kode baru              |

**Backup database** (penting!):

```bash
crontab -e
# tambahkan baris ini (backup tiap jam):
0 * * * * cp /opt/sisterblast/db/custom.db /root/backup-db/custom-$(date +\%F-\%H).db
```

---

## 9. Troubleshooting

| Masalah | Solusi |
|---------|--------|
| `Error: listen EACCES` (port terlarang) | Tidak seharusnya terjadi di port 2053. Jika berubah ke port < 1024, jalankan `setcap 'cap_net_bind_service=+ep' $(which node)` lalu `pm2 restart sister-blast` |
| `Error: listen EADDRINUSE` (port dipakai proses lain) | Jalankan 1 command: `ss -tlnp \| grep ':2053 '; pkill -9 -x nginx 2>/dev/null; pm2 kill 2>/dev/null; apt install -y psmisc >/dev/null 2>&1; fuser -k 2053/tcp 2>/dev/null; sleep 2; cd /root/Wa && pm2 start ecosystem.config.js && pm2 save && sleep 4 && pm2 logs sister-blast --lines 15 --nostream` |
| Website tidak bisa diakses | Cek `ufw status`, pastikan **2053** dibuka; cek `pm2 logs`; jika VPS pakai security group cloud, buka 2053/TCP di dashboard penyedia |
| Pairing WhatsApp gagal | Pastikan VPS bisa keluar internet (WebSocket ke `web.whatsapp.com` port 443 — ini trafik keluar, tidak bentrok dengan port aplikasi). Cek `pm2 logs` |
| Nomor target habis | Login admin → Database Nomor → impor JSON baru |
| Lupa login admin | Hapus baris tabel Admin di database (`db/custom.db`) — akun admin akan dibuat ulang otomatis dari `ADMIN_USERNAME`/`ADMIN_PASSWORD` saat login berikutnya |

---

## 10. Checklist Keamanan Produksi

- [ ] Ganti `AUTH_SECRET` dan `ADMIN_SECRET` dengan string acak (jangan pakai default)
- [ ] Ganti password admin default
- [ ] Jangan bagikan URL panel admin (`#/adm`) ke siapa pun
- [ ] Aktifkan `ufw` dan hanya buka port 22 & 443
- [ ] Rutin backup `db/custom.db` dan folder `sessions/`
- [ ] Gunakan Nginx + SSL jika memakai domain
