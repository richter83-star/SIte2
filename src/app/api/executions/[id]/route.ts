import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { auditSystem } from "@/lib/audit/system";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    
    // First check if execution belongs to user
    const execution = await prisma.execution.findUnique({
      where: { id },
    });

    if (!execution || execution.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Execution not found" },
        { status: 404 }
      );
    }

    // Then get full trace
    const trace = await auditSystem.getExecutionTrace(id);

    return NextResponse.json(trace);
  } catch (error: any) {
    console.error("Execution trace fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch execution trace" },
      { status: 500 }
    );
  }
}
