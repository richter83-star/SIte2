import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { orchestrator } from "@/lib/orchestrator";

export async function POST(request: NextRequest) {
  const session = await getServerSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { goal, projectId, context, environment } = body;

    if (!goal) {
      return NextResponse.json(
        { error: "Goal is required" },
        { status: 400 }
      );
    }

    const result = await orchestrator.orchestrate({
      userId: session.user.id,
      goal,
      projectId,
      context,
      environment: environment || "production",
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Orchestration error:", error);
    return NextResponse.json(
      { error: error.message || "Orchestration failed" },
      { status: 500 }
    );
  }
}
