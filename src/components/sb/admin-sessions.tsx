"use client";

import { useEffect, useState, useCallback } from "react";
import { api, dateTime } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Smartphone, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

interface SessionRow {
  id: string;
  phone: string;
  status: string;
  createdAt: string;
  username: string;
  email: string;
  userStatus: string;
}

const statusMeta: Record<string, { label: string; cls: string; dot: string }> = {
  CONNECTED: { label: "Terhubung", cls: "bg-emerald-100 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  PAIRING_CODE: { label: "Menunggu Pairing", cls: "bg-amber-100 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  CONNECTING: { label: "Menyambung…", cls: "bg-sky-50 text-sky-700 border-sky-200", dot: "bg-sky-500" },
  WAITING_PAIRING: { label: "Menyiapkan…", cls: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400" },
  DISCONNECTED: { label: "Terputus", cls: "bg-red-50 text-red-600 border-red-200", dot: "bg-red-400" },
};

export default function AdminSessions() {
  const [sessions, setSessions] = useState<SessionRow[] | null>(null);

  const load = useCallback(async () => {
    const res = await api<{ sessions: SessionRow[] }>("/api/admin/sessions");
    if (res.ok) setSessions(res.data.sessions);
  }, []);

  useEffect(() => {
    const t0 = setTimeout(load, 0);
    const t = setInterval(load, 6000);
    return () => {
      clearTimeout(t0);
      clearInterval(t);
    };
     
  }, []);

  if (!sessions) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
      </div>
    );
  }

  const connected = sessions.filter((s) => s.status === "CONNECTED").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Sesi WhatsApp Aktif</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Semua sesi WhatsApp pengguna yang terdaftar di server.
          </p>
        </div>
        <Badge className="bg-emerald-600 hover:bg-emerald-600 gap-1.5 px-3 py-1.5">
          <span className="sb-pulse-dot h-2 w-2 rounded-full bg-white" />
          {connected} terhubung / {sessions.length} total
        </Badge>
      </div>

      {sessions.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-14 text-center">
            <Smartphone className="h-12 w-12 text-slate-200 mx-auto mb-4" />
            <p className="font-semibold text-slate-700">Belum ada sesi WhatsApp</p>
            <p className="text-sm text-slate-500 mt-1">Sesi pengguna akan muncul di sini.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sessions.map((s) => {
            const meta = statusMeta[s.status] || statusMeta.DISCONNECTED;
            return (
              <Card key={s.id} className="border-slate-200 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0">
                        <Smartphone className="h-4.5 w-4.5 text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate">+{s.phone}</p>
                        <p className="text-[11px] text-slate-400 truncate">{s.username} • {s.email}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={cn("gap-1.5 shrink-0 text-[10px]", meta.cls)}>
                      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot, (s.status === "CONNECTING" || s.status === "PAIRING_CODE") && "sb-pulse-dot")} />
                      {meta.label}
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Dibuat {dateTime(s.createdAt)}</span>
                    {s.userStatus === "BANNED" && (
                      <span className="flex items-center gap-1 text-red-500 font-semibold">
                        <ShieldAlert className="h-3 w-3" />
                        Pemilik dibanned
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
