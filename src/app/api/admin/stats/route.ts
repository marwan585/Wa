import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  }

  const [
    totalUsers,
    bannedUsers,
    totalBlasts,
    sentBlasts,
    failedBlasts,
    totalSessions,
    connectedSessions,
    pendingWithdrawals,
    availableTargets,
    usedTargets,
    pendingAmount,
    paidAmount,
    totalEarned,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { status: "BANNED" } }),
    db.blast.count(),
    db.blast.count({ where: { status: "SENT" } }),
    db.blast.count({ where: { status: "FAILED" } }),
    db.waSession.count(),
    db.waSession.count({ where: { status: "CONNECTED" } }),
    db.withdrawal.count({ where: { status: "PENDING" } }),
    db.targetNumber.count({ where: { status: "AVAILABLE" } }),
    db.targetNumber.count({ where: { status: "USED" } }),
    db.withdrawal.aggregate({
      where: { status: "PENDING" },
      _sum: { amount: true },
    }),
    db.withdrawal.aggregate({
      where: { status: "SUCCESS" },
      _sum: { amount: true },
    }),
    db.user.aggregate({ _sum: { totalEarned: true } }),
  ]);

  const recentUsers = await db.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      username: true,
      email: true,
      balance: true,
      status: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    totals: {
      users: totalUsers,
      bannedUsers,
      blasts: totalBlasts,
      sentBlasts,
      failedBlasts,
      sessions: totalSessions,
      connectedSessions,
      pendingWithdrawals,
      pendingWithdrawAmount: pendingAmount._sum.amount || 0,
      paidWithdrawAmount: paidAmount._sum.amount || 0,
      totalEarned: totalEarned._sum.totalEarned || 0,
      availableTargets,
      usedTargets,
    },
    recentUsers,
  });
}
