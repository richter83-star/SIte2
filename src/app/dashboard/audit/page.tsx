import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { History, RotateCcw, Download } from "lucide-react";
import Link from "next/link";

export default async function AuditPage() {
  const session = await getServerSession();

  const executions = await prisma.execution.findMany({
    where: { userId: session!.user.id },
    include: { agent: true },
    orderBy: { startedAt: "desc" },
    take: 50,
  });

  // Calculate metrics
  const totalExecutions = executions.length;
  const completed = executions.filter((e) => e.status === "COMPLETED").length;
  const failed = executions.filter((e) => e.status === "FAILED").length;
  const blocked = executions.filter((e) => e.status === "BLOCKED").length;
  const successRate =
    totalExecutions > 0 ? ((completed / totalExecutions) * 100).toFixed(1) : 0;

  const avgDuration =
    completed > 0
      ? Math.round(
          executions
            .filter((e) => e.durationMs)
            .reduce((sum, e) => sum + (e.durationMs || 0), 0) / completed
        )
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Audit & Replay</h1>
          <p className="text-zinc-400">
            View execution history and replay past jobs
          </p>
        </div>
        <Button variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export History
        </Button>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6 bg-zinc-900/50 border-zinc-800">
          <p className="text-sm text-zinc-400">Total Executions</p>
          <p className="text-3xl font-bold mt-1">{totalExecutions}</p>
        </Card>
        <Card className="p-6 bg-zinc-900/50 border-zinc-800">
          <p className="text-sm text-zinc-400">Success Rate</p>
          <p className="text-3xl font-bold mt-1 text-green-500">{successRate}%</p>
        </Card>
        <Card className="p-6 bg-zinc-900/50 border-zinc-800">
          <p className="text-sm text-zinc-400">Avg Duration</p>
          <p className="text-3xl font-bold mt-1">{avgDuration}ms</p>
        </Card>
        <Card className="p-6 bg-zinc-900/50 border-zinc-800">
          <p className="text-sm text-zinc-400">Blocked by Policy</p>
          <p className="text-3xl font-bold mt-1 text-orange-500">{blocked}</p>
        </Card>
      </div>

      {/* Execution History */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <History className="w-5 h-5" />
            Execution History
          </h2>
          
          {executions.length === 0 ? (
            <div className="text-center py-12 text-zinc-400">
              <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No executions yet. Submit a goal to get started!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {executions.map((execution) => (
                    <TableRow key={execution.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{execution.agent.name}</p>
                          <p className="text-xs text-zinc-500">
                            {execution.agent.category}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
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
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">
                          {new Date(execution.startedAt).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {new Date(execution.startedAt).toLocaleTimeString()}
                        </p>
                      </TableCell>
                      <TableCell>
                        {execution.durationMs
                          ? `${execution.durationMs}ms`
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {execution.cost
                          ? `$${(execution.cost / 100).toFixed(4)}`
                          : "Free"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/dashboard/audit/${execution.id}`}>
                          <Button variant="ghost" size="sm">
                            <RotateCcw className="w-4 h-4 mr-1" />
                            Replay
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
