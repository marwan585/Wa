// PM2 Ecosystem — Sister Blast (Produksi VPS)
// Jalankan: pm2 start ecosystem.config.js && pm2 save
module.exports = {
  apps: [
    {
      name: "sister-blast",
      script: ".next/standalone/server.js",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
        PORT: 2053,
        HOSTNAME: "0.0.0.0",
        // SESUAIKAN path di bawah ini dengan lokasi project di VPS Anda:
        DATABASE_URL: "file:/opt/sisterblast/db/custom.db",
        SESSION_DIR: "/opt/sisterblast/sessions",
        // Ganti secret berikut dengan string acak panjang (wajib!):
        AUTH_SECRET: "ganti-dengan-string-acak-panjang-untuk-user",
        ADMIN_SECRET: "ganti-dengan-string-acak-panjang-untuk-admin",
        // Kredensial admin dibuat otomatis saat login pertama (tidak tampil di UI):
        ADMIN_USERNAME: "Marwan",
        ADMIN_PASSWORD: "marwan123",
      },
    },
  ],
};
