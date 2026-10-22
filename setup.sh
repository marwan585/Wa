#!/usr/bin/env bash
# ============================================================
#  SISTER BLAST — Setup / Update Otomatis (1 Command)
#  Pakai di VPS:  bash setup.sh
#  Script ini: update kode -> install -> database -> build -> start
#  Database & sesi WhatsApp TIDAK pernah dihapus.
# ============================================================
set -uo pipefail

G='\033[0;32m'; Y='\033[1;33m'; R='\033[0;31m'; B='\033[1;36m'; N='\033[0m'
step() { echo -e "\n${B}==> $1${N}"; }
ok()   { echo -e "${G}  ✔ $1${N}"; }
warn() { echo -e "${Y}  ⚠ $1${N}"; }
fail() { echo -e "${R}  ✘ $1${N}"; exit 1; }

# ---------- 0. Masuk folder project ----------
cd "$(dirname "$0")" || fail "Gagal masuk folder project"
APP_DIR="$(pwd)"
echo -e "${B}==============================================${N}"
echo -e "${B}   SISTER BLAST — Installer / Updater${N}"
echo -e "${B}   Folder: ${APP_DIR}${N}"
echo -e "${B}==============================================${N}"

# ---------- 1. Update kode dari GitHub ----------
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  step "1/7 Tarik kode terbaru dari GitHub"
  # Backup data produksi dulu (jaga-jaga repo lama masih men-track db/.env)
  BK="/tmp/.sb-backup"
  mkdir -p "$BK/db" "$BK/sessions"
  cp -a db/custom.db "$BK/db/" 2>/dev/null || true
  cp -a .env "$BK/" 2>/dev/null || true
  cp -a sessions/. "$BK/sessions/" 2>/dev/null || true
  git fetch origin main || warn "git fetch gagal (offline?) — pakai kode lokal"
  git reset --hard origin/main || warn "reset gagal — pakai kode lokal"
  # Pulihkan data jika ikut terhapus oleh reset
  mkdir -p db sessions
  [ -f db/custom.db ] || cp -a "$BK/db/custom.db" db/custom.db 2>/dev/null || true
  [ -f .env ] || cp -a "$BK/.env" .env 2>/dev/null || true
  ok "Kode versi terbaru aktif (db/sessions/.env aman)"
else
  warn "1/7 Bukan repo git — lewati update kode"
fi

# ---------- 2. Cek Node.js ----------
step "2/7 Cek Node.js"
command -v node >/dev/null 2>&1 || fail "Node.js belum terpasang.\n     Install dulu: curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y nodejs git"
ok "Node $(node -v) & npm $(npm -v)"

# ---------- 3. Path database/sesi + secret (persisten) ----------
step "3/7 Sesuaikan konfigurasi ecosystem.config.js"
mkdir -p db sessions
SECRETS_FILE="${APP_DIR}/.sb-secrets"
if [ ! -f "$SECRETS_FILE" ]; then
  AUTH_SECRET="$(openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n')"
  ADMIN_SECRET="$(openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n')"
  printf 'AUTH_SECRET=%s\nADMIN_SECRET=%s\n' "$AUTH_SECRET" "$ADMIN_SECRET" > "$SECRETS_FILE"
  chmod 600 "$SECRETS_FILE"
  ok "Secret baru dibuat & disimpan (.sb-secrets)"
else
  ok "Secret lama dipakai kembali (.sb-secrets)"
fi
AUTH_SECRET="$(grep '^AUTH_SECRET=' "$SECRETS_FILE" | cut -d= -f2)"
ADMIN_SECRET="$(grep '^ADMIN_SECRET=' "$SECRETS_FILE" | cut -d= -f2)"
sed -i "s|file:/opt/sisterblast/db/custom.db|file:${APP_DIR}/db/custom.db|g" ecosystem.config.js
sed -i "s|SESSION_DIR: \"/opt/sisterblast/sessions\"|SESSION_DIR: \"${APP_DIR}/sessions\"|" ecosystem.config.js
sed -i "s|ganti-dengan-string-acak-panjang-untuk-user|${AUTH_SECRET}|" ecosystem.config.js
sed -i "s|ganti-dengan-string-acak-panjang-untuk-admin|${ADMIN_SECRET}|" ecosystem.config.js
node -e "require('./ecosystem.config.js')" && ok "ecosystem.config.js valid" || fail "ecosystem.config.js tidak valid"
[ -f .env ] || echo "DATABASE_URL=file:${APP_DIR}/db/custom.db" > .env
ok "Path DB: ${APP_DIR}/db/custom.db"

# ---------- 4. Dependencies ----------
step "4/7 Install dependencies (npm install)"
npm install --legacy-peer-deps --no-audit --no-fund --loglevel=error
ok "Dependencies siap"

# ---------- 5. Prisma ----------
step "5/7 Generate Prisma client & sinkron skema database"
npx prisma generate --loglevel=error
npx prisma db push --skip-generate
ok "Database siap (data lama tetap utuh)"

# ---------- 6. Build ----------
step "6/7 Build aplikasi produksi (2-5 menit)"
npm run build --loglevel=error || fail "Build gagal — jalankan 'npm run build' manual untuk lihat error"
# Sertakan aset statis ke dalam build standalone agar tampilan tidak rusak
cp -r public .next/standalone/public 2>/dev/null || true
mkdir -p .next/standalone/.next
cp -r .next/static .next/standalone/.next/ 2>/dev/null || true
ok "Build selesai (aset statis terpasang)"

# ---------- 7. Firewall + PM2 ----------
step "7/7 Jalankan aplikasi (PM2)"
if command -v ufw >/dev/null 2>&1 && ufw status 2>/dev/null | grep -q "active"; then
  ufw allow 2053/tcp >/dev/null 2>&1 && ok "Port 2053 dibuka di firewall"
fi
# Hentikan aplikasi via PM2 lalu bunuh proses yatim (bukan milik PM2).
# Proses ganda akan berebut lock SQLite -> "database is locked" -> tombol/aksi gagal acak.
pm2 delete sister-blast >/dev/null 2>&1 || true
pkill -f "\.next/standalone/server.js" 2>/dev/null || true
pkill -f "next start" 2>/dev/null || true
pkill -f "next-server" 2>/dev/null || true
sleep 2
pm2 start ecosystem.config.js >/dev/null 2>&1 || fail "PM2 gagal start — cek 'pm2 logs'"
pm2 save >/dev/null 2>&1
sleep 3
pm2 status sister-blast

IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
echo ""
echo -e "${G}==============================================${N}"
echo -e "${G}   SISTER BLAST BERJALAN!${N}"
echo -e "${G}==============================================${N}"
echo -e "   Situs  : ${B}http://${IP:-<IP-VPS>}:2053${N}"
echo -e "   Admin  : ${B}http://${IP:-<IP-VPS>}:2053/#/adm${N}"
echo -e "   Log    : pm2 logs sister-blast"
echo -e "${Y}   Database & sesi WhatsApp tidak diubah oleh script ini.${N}"
echo ""
