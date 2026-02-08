import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const policies = await prisma.policy.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(policies);
  } catch (error: any) {
    console.error("Policies fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch policies" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      description,
      type,
      conditions,
      action,
      severity,
      projectId,
      active,
    } = body;

    if (!name || !type || !action) {
      return NextResponse.json(
        { error: "Name, type, and action are required" },
        { status: 400 }
      );
    }

    const policy = await prisma.policy.create({
      data: {
        userId: session.user.id,
        projectId,
        name,
        description,
        type,
        conditions: conditions || {},
        action,
        severity: severity || "MEDIUM",
        active: active !== false,
      },
    });

    return NextResponse.json(policy, { status: 201 });
  } catch (error: any) {
    console.error("Policy creation error:", error);
    return NextResponse.json(
      { error: "Failed to create policy" },
      { status: 500 }
    );
  }
}
