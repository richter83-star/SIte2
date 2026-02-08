import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { learningEngine } from "@/lib/learning/engine";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await learningEngine.analyzeAndLearn(session.user.id);

    const insights = await learningEngine.getInsights(session.user.id);

    return NextResponse.json({
      message: "Analysis complete",
      insightsGenerated: insights.length,
      insights,
    });
  } catch (error: any) {
    console.error("Learning analysis error:", error);
    return NextResponse.json(
      { error: "Failed to analyze and learn" },
      { status: 500 }
    );
  }
}
