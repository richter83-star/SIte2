import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { learningEngine } from "@/lib/learning/engine";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const insights = await learningEngine.getInsights(session.user.id);

    return NextResponse.json(insights);
  } catch (error: any) {
    console.error("Insights fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch insights" },
      { status: 500 }
    );
  }
}
