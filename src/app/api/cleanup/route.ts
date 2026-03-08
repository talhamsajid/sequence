import { NextResponse } from "next/server";

const DB_URL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;
const STALE_MS = 30 * 60 * 1000; // 30 minutes

export async function GET(request: Request) {
  // Verify cron secret (Vercel sets this header for cron jobs)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!DB_URL) {
    return NextResponse.json({ error: "Database URL not configured" }, { status: 500 });
  }

  const cutoff = Date.now() - STALE_MS;

  // Query games with lastActivity <= cutoff
  const queryUrl = `${DB_URL}/games.json?orderBy="lastActivity"&endAt=${cutoff}`;
  const res = await fetch(queryUrl);

  if (!res.ok) {
    return NextResponse.json({ error: "Failed to query games" }, { status: 500 });
  }

  const data = await res.json();
  if (!data || typeof data !== "object") {
    return NextResponse.json({ deleted: 0 });
  }

  const staleRoomIds = Object.keys(data);
  if (staleRoomIds.length === 0) {
    return NextResponse.json({ deleted: 0 });
  }

  // Delete each stale room + associated voice/chat data
  const deletions = staleRoomIds.flatMap((roomId) => [
    fetch(`${DB_URL}/games/${roomId}.json`, { method: "DELETE" }),
    fetch(`${DB_URL}/voice/${roomId}.json`, { method: "DELETE" }),
    fetch(`${DB_URL}/chat/${roomId}.json`, { method: "DELETE" }),
  ]);

  await Promise.allSettled(deletions);

  return NextResponse.json({ deleted: staleRoomIds.length, roomIds: staleRoomIds });
}
