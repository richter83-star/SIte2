import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, Bot, CheckCircle2, XCircle, Clock, Shield, ArrowRight } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await getServerSession();
  
  // Get recent executions
  const executions = await prisma.execution.findMany({
    where: { userId: session!.user.id },
    include: { agent: true },
    orderBy: { startedAt: "desc" },
    take: 10,
  });

  // Get stats
  const totalExecutions = await prisma.execution.count({
    where: { userId: session!.user.id },
  });

  const completedExecutions = await prisma.execution.count({
    where: { userId: session!.user.id, status: "COMPLETED" },
  });

  const deployments = await prisma.deployment.count({
    where: { userId: session!.user.id, status: "ACTIVE" },
  });

  const policies = await prisma.policy.count({
    where: { userId: session!.user.id, active: true },
  });

  const successRate =
    totalExecutions > 0
      ? ((completedExecutions / totalExecutions) * 100).toFixed(1)
      : "0";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-zinc-100 mb-2">Dashboard</h1>
        <p className="text-zinc-400">
          Overview of your AI agents and automation activity
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/dashboard/agents">
          <Card className="p-4 bg-zinc-900/50 border-zinc-800 hover:border-cyan-500/50 transition cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Deploy Agent</p>
                <p className="text-lg font-semibold text-zinc-100 mt-1">Browse 24 Agents</p>
              </div>
              <Bot className="w-8 h-8 text-cyan-500" />
            </div>
          </Card>
        </Link>

        <Link href="/dashboard/orchestrator">
          <Card className="p-4 bg-zinc-900/50 border-zinc-800 hover:border-fuchsia-500/50 transition cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Submit Goal</p>
                <p className="text-lg font-semibold text-zinc-100 mt-1">AI Orchestrator</p>
              </div>
              <ArrowRight className="w-8 h-8 text-fuchsia-500" />
            </div>
          </Card>
        </Link>

        <Link href="/dashboard/policies">
          <Card className="p-4 bg-zinc-900/50 border-zinc-800 hover:border-orange-500/50 transition cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Create Policy</p>
                <p className="text-lg font-semibold text-zinc-100 mt-1">Governance</p>
              </div>
              <Shield className="w-8 h-8 text-orange-500" />
            </div>
          </Card>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 bg-zinc-900/50 border-zinc-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-400">Total Executions</p>
              <p className="text-3xl font-bold text-zinc-100 mt-1">{totalExecutions}</p>
            </div>
            <Activity className="w-10 h-10 text-cyan-500" />
          </div>
        </Card>

        <Card className="p-6 bg-zinc-900/50 border-zinc-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-400">Success Rate</p>
              <p className="text-3xl font-bold text-green-500 mt-1">{successRate}%</p>
            </div>
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
        </Card>

        <Card className="p-6 bg-zinc-900/50 border-zinc-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-400">Active Agents</p>
              <p className="text-3xl font-bold text-zinc-100 mt-1">{deployments}</p>
            </div>
            <Bot className="w-10 h-10 text-fuchsia-500" />
          </div>
        </Card>

        <Card className="p-6 bg-zinc-900/50 border-zinc-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-400">Active Policies</p>
              <p className="text-3xl font-bold text-zinc-100 mt-1">{policies}</p>
            </div>
            <Shield className="w-10 h-10 text-orange-500" />
          </div>
        </Card>
      </div>

      {/* Activity Timeline */}
      <Card className="p-6 bg-zinc-900/50 border-zinc-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-zinc-100">Recent Activity</h2>
          <Link href="/dashboard/audit">
            <Button variant="ghost" size="sm" className="text-cyan-400 hover:text-cyan-300">
              View All
            </Button>
          </Link>
        </div>
        
        {executions.length === 0 ? (
          <div className="text-center py-12">
            <Bot className="w-12 h-12 mx-auto mb-4 text-zinc-600" />
            <p className="text-zinc-400 mb-4">No activity yet. Deploy an agent to get started!</p>
            <Link href="/dashboard/agents">
              <Button className="bg-cyan-500 hover:bg-cyan-600">Browse Agents</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {executions.map((execution) => (
              <div
                key={execution.id}
                className="flex items-start gap-4 p-4 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition"
              >
                <div className="mt-1">
                  {execution.status === "COMPLETED" && (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  )}
                  {execution.status === "FAILED" && (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                  {execution.status === "RUNNING" && (
                    <Clock className="w-5 h-5 text-yellow-500 animate-spin" />
                  )}
                  {execution.status === "BLOCKED" && (
                    <Shield className="w-5 h-5 text-orange-500" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-zinc-100">{execution.agent.name}</span>
                    <Badge
                      variant={
                        execution.status === "COMPLETED"
                          ? "default"
                          : execution.status === "FAILED"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {execution.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-zinc-400 truncate">
                    {typeof execution.input === "object" && execution.input
                      ? JSON.stringify(execution.input).substring(0, 100)
                      : "No input"}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    {new Date(execution.startedAt).toLocaleString()}
                    {execution.durationMs && ` • ${execution.durationMs}ms`}
                  </p>
                </div>

                {execution.cost && (
                  <div className="text-right">
                    <p className="text-sm font-medium text-zinc-100">
                      ${(execution.cost / 100).toFixed(4)}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
