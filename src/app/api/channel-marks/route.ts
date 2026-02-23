import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

export const runtime = "nodejs";

type MarkMap = Record<string, { channelTitle?: string; note?: string; marked?: boolean; priority?: boolean; updatedAt: string }>;

function filePath() {
  return path.join(process.cwd(), "data", "channel-marks.json");
}

function readMarks(): MarkMap {
  const p = filePath();
  if (!fs.existsSync(p)) return {};
  try {
    return JSON.parse(fs.readFileSync(p, "utf8")) as MarkMap;
  } catch {
    return {};
  }
}

function writeMarks(marks: MarkMap) {
  const p = filePath();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(marks, null, 2), "utf8");
}

export async function GET() {
  const marks = readMarks();
  return NextResponse.json({ ok: true, marks });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const channelId = String(body.channelId || "").trim();
  if (!channelId) return NextResponse.json({ ok: false, error: "channelId required" }, { status: 400 });

  const marks = readMarks();
  const prev = marks[channelId] || { updatedAt: new Date().toISOString() };

  marks[channelId] = {
    channelTitle: String(body.channelTitle || prev.channelTitle || ""),
    note: String(body.note || prev.note || ""),
    marked: body.marked === undefined ? (prev.marked ?? true) : Boolean(body.marked),
    priority: body.priority === undefined ? (prev.priority ?? false) : Boolean(body.priority),
    updatedAt: new Date().toISOString(),
  };
  writeMarks(marks);
  return NextResponse.json({ ok: true, marks });
}

export async function DELETE(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const channelId = String(body.channelId || "").trim();
  if (!channelId) return NextResponse.json({ ok: false, error: "channelId required" }, { status: 400 });

  const marks = readMarks();
  delete marks[channelId];
  writeMarks(marks);
  return NextResponse.json({ ok: true, marks });
}
