import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { Search } from "lucide-react";

export default async function AgentsPage() {
  const agents = await prisma.agent.findMany({
    where: { active: true },
    orderBy: [
      { featured: "desc" },
      { deploymentCount: "desc" },
    ],
  });

    // Group by category
  const agentsByCategory: Record<string, typeof agents> = {};
  
  for (const agent of agents) {
    if (!agentsByCategory[agent.category]) {
      agentsByCategory[agent.category] = [];
    }
    agentsByCategory[agent.category].push(agent);
  }


 return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-100 mb-2">AI Agents</h1>
          <p className="text-zinc-400">
            Browse and deploy specialized AI agents for your projects
          </p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Search agents..."
              className="pl-10 bg-zinc-800 border-zinc-700 text-zinc-100 w-80"
            />
          </div>
          <Button className="bg-cyan-500 hover:bg-cyan-600">
            Request New Agent
          </Button>
        </div>
      </div>

      {/* Featured Agents */}
      <div>
        <h2 className="text-xl font-semibold text-zinc-100 mb-4">Featured Agents</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents
            .filter((agent) => agent.featured)
            .slice(0, 3)
            .map((agent) => (
              <Link key={agent.id} href={`/dashboard/agents/${agent.id}`}>
                <Card className="bg-zinc-900 border-cyan-500/20 hover:border-cyan-500/40 transition-all cursor-pointer h-full">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-zinc-100 mb-1">
                          {agent.name}
                        </h3>
                        <Badge variant="outline" className="text-xs">
                          {agent.category}
                        </Badge>
                      </div>
                      <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20">
                        Featured
                      </Badge>
                    </div>
                    <p className="text-sm text-zinc-400 mb-4 line-clamp-2">
                      {agent.description}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-zinc-500">
                      <span>{agent.deploymentCount} deployments</span>
                      <span>•</span>
                      <span>{agent.executionCount} executions</span>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
        </div>
      </div>

      {/* All Agents by Category */}
      {Object.entries(agentsByCategory).map(([category, categoryAgents]) => (
        <div key={category}>
          <h2 className="text-xl font-semibold text-zinc-100 mb-4 capitalize">
            {category} Agents
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoryAgents.map((agent) => (
              <Link key={agent.id} href={`/dashboard/agents/${agent.id}`}>
                <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer h-full">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-zinc-100 mb-1">
                          {agent.name}
                        </h3>
                        <Badge variant="outline" className="text-xs">
                          {agent.category}
                        </Badge>
                      </div>
                      {agent.featured && (
                        <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20">
                          Featured
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-zinc-400 mb-4 line-clamp-2">
                      {agent.description}
                    </p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {agent.capabilities.slice(0, 3).map((capability, i) => (
                        <span
                          key={i}
                          className="text-xs bg-zinc-800 text-zinc-300 px-2 py-1 rounded"
                        >
                          {capability}
                        </span>
                      ))}
                      {agent.capabilities.length > 3 && (
                        <span className="text-xs text-zinc-500">
                          +{agent.capabilities.length - 3} more
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-zinc-500">
                      <span>{agent.deploymentCount} deployments</span>
                      <span>•</span>
                      <span>{agent.executionCount} executions</span>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}