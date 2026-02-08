import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { auditSystem } from "@/lib/audit/system";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { executionId } = body;

    if (!executionId) {
      return NextResponse.json(
        { error: "Execution ID is required" },
        { status: 400 }
      );
    }

    const result = await auditSystem.replayExecution(
      executionId,
      session.user.id
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Replay error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to replay execution" },
      { status: 500 }
    );
  }
}
