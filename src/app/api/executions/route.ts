import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { auditSystem } from "@/lib/audit/system";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const status = searchParams.get("status");
    const agentId = searchParams.get("agentId");
    const projectId = searchParams.get("projectId");

    const filters: any = { limit };
    if (status) filters.status = status;
    if (agentId) filters.agentId = agentId;
    if (projectId) filters.projectId = projectId;

    const history = await auditSystem.getExecutionHistory(
      session.user.id,
      filters
    );

    return NextResponse.json(history);
  } catch (error: any) {
    console.error("Executions fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch executions" },
      { status: 500 }
    );
  }
}
