import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Brain, TrendingUp, AlertTriangle, Zap, Target, Shield } from "lucide-react";

export default async function LearningPage() {
  const session = await getServerSession();

  const learnings = await prisma.learning.findMany({
    where: { userId: session!.user.id },
    orderBy: [{ confidence: "desc" }, { createdAt: "desc" }],
    take: 20,
  });

  // Group by type
  const byType = learnings.reduce((acc, learning) => {
    if (!acc[learning.type]) acc[learning.type] = [];
    acc[learning.type].push(learning);
    return acc;
  }, {} as Record<string, typeof learnings>);

  const typeIcons = {
    SUCCESS_PATTERN: TrendingUp,
    FAILURE_PATTERN: AlertTriangle,
    PERFORMANCE_TIP: Zap,
    ROUTING_PREFERENCE: Target,
    POLICY_TRIGGER: Shield,
  };

  const typeColors = {
    SUCCESS_PATTERN: "text-green-500",
    FAILURE_PATTERN: "text-red-500",
    PERFORMANCE_TIP: "text-yellow-500",
    ROUTING_PREFERENCE: "text-blue-500",
    POLICY_TRIGGER: "text-orange-500",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Learning & Insights</h1>
          <p className="text-zinc-400">
            AI-generated insights from your automation patterns
          </p>
        </div>
        <Button variant="outline">
          <Brain className="w-4 h-4 mr-2" />
          Analyze Now
        </Button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-zinc-900/50 border-zinc-800">
          <p className="text-sm text-zinc-400">Total Insights</p>
          <p className="text-3xl font-bold mt-1">{learnings.length}</p>
        </Card>
        <Card className="p-6 bg-zinc-900/50 border-zinc-800">
          <p className="text-sm text-zinc-400">High Confidence</p>
          <p className="text-3xl font-bold mt-1">
            {learnings.filter((l) => l.confidence > 0.7).length}
          </p>
        </Card>
        <Card className="p-6 bg-zinc-900/50 border-zinc-800">
          <p className="text-sm text-zinc-400">Applied Patterns</p>
          <p className="text-3xl font-bold mt-1">
            {learnings.filter((l) => l.applied).length}
          </p>
        </Card>
      </div>

      {/* Insights by Type */}
      {learnings.length === 0 ? (
        <Card className="p-12 bg-zinc-900/50 border-zinc-800 text-center">
          <Brain className="w-12 h-12 mx-auto mb-4 text-zinc-600" />
          <p className="text-zinc-400 mb-4">
            No insights yet. Run more agent executions to generate learnings.
          </p>
          <p className="text-sm text-zinc-500">
            The learning engine needs at least 5 executions to detect patterns.
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(byType).map(([type, insights]) => {
            const Icon = typeIcons[type as keyof typeof typeIcons] || Brain;
            const colorClass = typeColors[type as keyof typeof typeColors];

            return (
              <div key={type}>
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Icon className={`w-5 h-5 ${colorClass}`} />
                  {type.replace(/_/g, " ")}
                  <Badge variant="secondary">{insights.length}</Badge>
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {insights.map((insight) => (
                    <Card
                      key={insight.id}
                      className="p-4 bg-zinc-900/50 border-zinc-800"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <Badge variant="outline" className="text-xs">
                          {(insight.confidence * 100).toFixed(0)}% confidence
                        </Badge>
                        {insight.applied && (
                          <Badge variant="default" className="text-xs">
                            Applied
                          </Badge>
                        )}
                      </div>

                      <p className="text-sm mb-3">{insight.insight}</p>

                      <div className="text-xs text-zinc-500">
                        <p>
                          Based on {insight.sourceExecutionIds.length} executions
                        </p>
                        <p>{new Date(insight.createdAt).toLocaleDateString()}</p>
                      </div>

                      {!insight.applied && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-3"
                        >
                          Apply This Pattern
                        </Button>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
