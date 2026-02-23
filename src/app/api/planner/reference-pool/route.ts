import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const STORAGE_KEY = "planner_reference_pool";

export async function GET() {
  // 返回当前参考池
  return NextResponse.json({
    ok: true,
    message: "使用 localStorage 存储，客户端读取",
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { videoIds } = body;

    if (!Array.isArray(videoIds) || videoIds.length === 0) {
      return NextResponse.json({
        ok: false,
        error: "videoIds 必须是非空数组",
      }, { status: 400 });
    }

    // 验证 videoId 格式
    const validIds = videoIds.filter(id => 
      typeof id === 'string' && id.length === 11
    );

    if (validIds.length === 0) {
      return NextResponse.json({
        ok: false,
        error: "没有有效的 videoId",
      }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      added: validIds.length,
      message: `已添加 ${validIds.length} 个视频到参考池`,
    });
  } catch (error) {
    console.error('添加到参考池失败:', error);
    return NextResponse.json({
      ok: false,
      error: '添加失败',
    }, { status: 500 });
  }
}
