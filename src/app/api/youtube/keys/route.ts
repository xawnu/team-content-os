import { NextResponse } from "next/server";

const YOUTUBE_API_KEYS = (process.env.YOUTUBE_API_KEYS || process.env.YOUTUBE_API_KEY || "")
  .split(",")
  .map((k) => k.trim())
  .filter(Boolean);

export async function GET() {
  const keys = YOUTUBE_API_KEYS.map((key, index) => ({
    id: `key-${index}`,
    keyPrefix: key.slice(0, 8) + '...',
    // 服务端不追踪配额，返回基础信息
    quotaLimit: 10000,
    status: 'active' as const,
  }));

  return NextResponse.json({
    ok: true,
    keys,
    totalKeys: keys.length,
  });
}
