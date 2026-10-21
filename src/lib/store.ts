"use client";

import { create } from "zustand";

export interface UserInfo {
  id: string;
  username: string;
  email: string;
  phone: string;
  balance: number;
  totalEarned: number;
  createdAt?: string;
}

export interface SettingsInfo {
  ratePerChat: number;
  minWithdraw: number;
  maintenance: boolean;
  maintenanceNote: string;
  hasMessage: boolean;
}

interface AppState {
  user: UserInfo | null;
  settings: SettingsInfo | null;
  blastRunning: boolean;
  loaded: boolean;
  admin: boolean;
  adminName: string | null;
  adminChecked: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  checkAdmin: () => Promise<boolean>;
  logoutAdmin: () => Promise<void>;
}

export const useApp = create<AppState>((set) => ({
  user: null,
  settings: null,
  blastRunning: false,
  loaded: false,
  admin: false,
  adminName: null,
  adminChecked: false,

  refresh: async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (!res.ok) {
        set({ user: null, settings: null, blastRunning: false, loaded: true });
        return;
      }
      const data = await res.json();
      set({
        user: data.user,
        settings: data.settings,
        blastRunning: data.blastRunning ?? false,
        loaded: true,
      });
    } catch {
      set({ user: null, settings: null, loaded: true });
    }
  },

  logout: async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    set({ user: null, settings: null, blastRunning: false });
  },

  checkAdmin: async () => {
    try {
      const res = await fetch("/api/admin/auth", { cache: "no-store" });
      if (!res.ok) {
        set({ admin: false, adminChecked: true });
        return false;
      }
      const data = await res.json();
      set({ admin: data.admin === true, adminName: data.username ?? null, adminChecked: true });
      return data.admin === true;
    } catch {
      set({ admin: false, adminChecked: true });
      return false;
    }
  },

  logoutAdmin: async () => {
    await fetch("/api/admin/auth", { method: "DELETE" });
    set({ admin: false, adminName: null });
  },
}));

export function rupiah(n: number | undefined | null): string {
  if (n === undefined || n === null) return "Rp 0";
  return "Rp " + Number(n).toLocaleString("id-ID");
}

export function dateTime(d: string | Date | undefined | null): string {
  if (!d) return "-";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export async function api<T = unknown>(
  url: string,
  options?: RequestInit
): Promise<{ ok: boolean; status: number; data: T & { error?: string } }> {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
    cache: "no-store",
  });
  let data: T & { error?: string } = {} as T & { error?: string };
  try {
    data = await res.json();
  } catch {
    /* empty body */
  }
  return { ok: res.ok, status: res.status, data };
}

export function navigate(to: string) {
  window.location.hash = to;
}
