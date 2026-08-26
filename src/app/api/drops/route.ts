import { NextResponse } from "next/server";
import { fetchNikeSnkrsFeed } from "@/lib/monitor/nike-scraper";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const region = searchParams.get("region") || "TH";

  try {
    const drops = await fetchNikeSnkrsFeed(region);
    return NextResponse.json({
      success: true,
      region,
      count: drops.length,
      drops,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
