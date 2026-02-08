import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Folder, Plus } from "lucide-react";
import Link from "next/link";

export default async function ProjectsPage() {
  const session = await getServerSession();

  const projects = await prisma.project.findMany({
    where: { userId: session!.user.id },
    include: {
      _count: {
        select: {
          deployments: true,
          policies: true,
          executions: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Projects</h1>
          <p className="text-zinc-400">
            Organize agents and policies into projects
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      </div>

      {projects.length === 0 ? (
        <Card className="p-12 bg-zinc-900/50 border-zinc-800 text-center">
          <Folder className="w-12 h-12 mx-auto mb-4 text-zinc-600" />
          <p className="text-zinc-400 mb-4">No projects yet</p>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Create Your First Project
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Card
              key={project.id}
              className="p-6 bg-zinc-900/50 border-zinc-800 hover:border-cyan-500/50 transition"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                    style={{ backgroundColor: project.color || "#3b82f6" }}
                  >
                    {project.icon || "📁"}
                  </div>
                  <div>
                    <h3 className="font-semibold">{project.name}</h3>
                    <Badge
                      variant={project.active ? "default" : "secondary"}
                      className="mt-1"
                    >
                      {project.active ? "Active" : "Archived"}
                    </Badge>
                  </div>
                </div>
              </div>

              {project.description && (
                <p className="text-sm text-zinc-400 mb-4">
                  {project.description}
                </p>
              )}

              <div className="grid grid-cols-3 gap-2 text-center text-sm">
                <div className="p-2 bg-zinc-800/50 rounded">
                  <p className="text-zinc-400 text-xs">Agents</p>
                  <p className="font-semibold">{project._count.deployments}</p>
                </div>
                <div className="p-2 bg-zinc-800/50 rounded">
                  <p className="text-zinc-400 text-xs">Policies</p>
                  <p className="font-semibold">{project._count.policies}</p>
                </div>
                <div className="p-2 bg-zinc-800/50 rounded">
                  <p className="text-zinc-400 text-xs">Runs</p>
                  <p className="font-semibold">{project._count.executions}</p>
                </div>
              </div>

              <Link href={`/dashboard/projects/${project.id}`}>
                <Button variant="outline" className="w-full mt-4">
                  View Project
                </Button>
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
