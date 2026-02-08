import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { agentId, projectId, config, environment } = body;

    if (!agentId) {
      return NextResponse.json(
        { error: "Agent ID is required" },
        { status: 400 }
      );
    }

    // Check if agent exists
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Create deployment
    const deployment = await prisma.deployment.create({
      data: {
        userId: session.user.id,
        agentId,
        projectId,
        config: config || {},
        status: "ACTIVE",
      },
      include: {
        agent: true,
      },
    });

    // Increment deployment count on agent
    await prisma.agent.update({
      where: { id: agentId },
      data: { deploymentCount: { increment: 1 } },
    });

    return NextResponse.json(deployment, { status: 201 });
  } catch (error: any) {
    console.error("Deployment error:", error);
    return NextResponse.json(
      { error: "Failed to deploy agent" },
      { status: 500 }
    );
  }
}
