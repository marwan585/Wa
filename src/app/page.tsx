"use client";

import { useSyncExternalStore } from "react";
import Landing from "@/components/sb/landing";
import AuthPage from "@/components/sb/auth-page";
import UserShell from "@/components/sb/user-shell";
import AdminShell from "@/components/sb/admin-shell";

function subscribe(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

function getSnapshot(): string {
  return window.location.hash.replace(/^#/, "") || "/";
}

function getServerSnapshot(): string {
  return "/";
}

export default function Home() {
  const route = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (route === "/" || route === "") return <Landing />;
  if (route === "/login") return <AuthPage mode="login" />;
  if (route === "/register") return <AuthPage mode="register" />;

  if (route === "/adm" || route.startsWith("/adm/")) {
    return <AdminShell route={route} />;
  }

  if (route === "/dashboard" || route.startsWith("/dashboard/")) {
    return <UserShell route={route} />;
  }

  return <Landing />;
}
