import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const featured = searchParams.get("featured");

    const agents = await prisma.agent.findMany({
      where: {
        active: true,
        ...(category && { category: category as any }),
        ...(featured === "true" && { featured: true }),
      },
      orderBy: [
        { featured: "desc" },
        { deploymentCount: "desc" },
      ],
    });

    return NextResponse.json(agents);
  } catch (error: any) {
    console.error("Agents fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch agents" },
      { status: 500 }
    );
  }
}
