import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, Plus, AlertCircle } from "lucide-react";
import Link from "next/link";

export default async function PoliciesPage() {
  const session = await getServerSession();

  const policies = await prisma.policy.findMany({
    where: { userId: session!.user.id },
    orderBy: { createdAt: "desc" },
  });

  const blockedActions = await prisma.blockedAction.findMany({
    where: { userId: session!.user.id },
    include: { policy: true },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-100 mb-2">Policies & Governance</h1>
          <p className="text-zinc-400">
            Set rules and guardrails for your AI agents
          </p>
        </div>
        <Button className="bg-cyan-500 hover:bg-cyan-600">
          <Plus className="w-4 h-4 mr-2" />
          Create Policy
        </Button>
      </div>

      {/* Policy Types Info */}
      <Card className="p-6 bg-zinc-900/50 border-zinc-800">
        <h2 className="font-semibold mb-3 flex items-center gap-2 text-zinc-100">
          <Shield className="w-5 h-5" />
          Available Policy Types
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              type: "Rate Limit",
              description: "Limit agent executions per time window",
            },
            {
              type: "Content Filter",
              description: "Block/allow specific content patterns",
            },
            {
              type: "Approval Required",
              description: "Require manual approval for certain actions",
            },
            {
              type: "Budget Limit",
              description: "Cap spending on AI API calls",
            },
            {
              type: "Time Window",
              description: "Restrict execution to specific hours",
            },
            {
              type: "Custom",
              description: "Define custom policy rules",
            },
          ].map((item) => (
            <div
              key={item.type}
              className="p-3 bg-zinc-800/50 rounded-lg"
            >
              <p className="font-medium text-sm text-zinc-100">{item.type}</p>
              <p className="text-xs text-zinc-400 mt-1">{item.description}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Active Policies */}
      <div>
        <h2 className="text-xl font-semibold mb-4 text-zinc-100">Active Policies</h2>
        {policies.length === 0 ? (
          <Card className="p-12 bg-zinc-900/50 border-zinc-800 text-center">
            <Shield className="w-12 h-12 mx-auto mb-4 text-zinc-600" />
            <p className="text-zinc-400 mb-4">No policies configured yet</p>
            <Button className="bg-cyan-500 hover:bg-cyan-600">Create Your First Policy</Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {policies.map((policy) => (
              <Card
                key={policy.id}
                className="p-6 bg-zinc-900/50 border-zinc-800"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-zinc-100">{policy.name}</h3>
                    {policy.description && (
                      <p className="text-sm text-zinc-400 mt-1">
                        {policy.description}
                      </p>
                    )}
                  </div>
                  <Badge
                    variant={policy.active ? "default" : "secondary"}
                    className={policy.active ? "bg-green-500" : ""}
                  >
                    {policy.active ? "Active" : "Inactive"}
                  </Badge>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Type:</span>
                    <span className="font-medium text-zinc-100">{policy.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Action:</span>
                    <span className="font-medium text-zinc-100">{policy.action}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Severity:</span>
                    <Badge
                      variant={
                        policy.severity === "CRITICAL"
                          ? "destructive"
                          : "secondary"
                      }
                      className="text-xs"
                    >
                      {policy.severity}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Triggered:</span>
                    <span className="font-medium text-zinc-100">
                      {policy.triggeredCount} times
                    </span>
                  </div>
                </div>

                <Button variant="outline" className="w-full mt-4 border-zinc-700 text-zinc-200 hover:bg-zinc-800">
                  Edit Policy
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Blocked Actions Feed */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-zinc-100">Blocked Actions</h2>
          <Link href="/dashboard/policies/blocked">
            <Button variant="ghost" size="sm" className="text-cyan-400 hover:text-cyan-300">
              View All
            </Button>
          </Link>
        </div>

        {blockedActions.length === 0 ? (
          <Card className="p-6 bg-zinc-900/50 border-zinc-800 text-center">
            <p className="text-zinc-400">No blocked actions</p>
          </Card>
        ) : (
          <Card className="p-6 bg-zinc-900/50 border-zinc-800">
            <div className="space-y-3">
              {blockedActions.map((action) => (
                <div
                  key={action.id}
                  className="flex items-start gap-3 p-3 bg-zinc-800/50 rounded-lg"
                >
                  <AlertCircle className="w-5 h-5 text-orange-500 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm text-zinc-100">
                        Blocked by: {action.policy.name}
                      </span>
                      <Badge variant="secondary" className="text-xs bg-zinc-700 text-zinc-300">
                        {action.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-zinc-400">{action.reason}</p>
                    <p className="text-xs text-zinc-500 mt-1">
                      {new Date(action.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
