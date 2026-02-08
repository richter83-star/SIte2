"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Send, CheckCircle2, XCircle, AlertCircle, Clock } from "lucide-react";

export default function OrchestratorPage() {
  const [goal, setGoal] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/orchestrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Orchestration failed");
      }

      const data = await response.json();
      setResult(data);
      setGoal("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const examples = [
    "Research top 5 AI workflow tools and create a comparison document",
    "Draft 10 cold outreach emails for potential customers in the SaaS industry",
    "Analyze last month's user data and generate insights report",
    "Write 5 LinkedIn posts about AI automation with different angles",
    "Create a presentation outline about market trends in AI",
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-zinc-100 mb-2">AI Orchestrator</h1>
        <p className="text-zinc-400">
          Submit high-level goals and let AI agents handle the execution
        </p>
      </div>

      {/* Goal Submission */}
      <Card className="p-6 bg-zinc-900/50 border-zinc-800">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-zinc-200">
              What do you want to accomplish?
            </label>
            <Textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="Example: Research top 5 AI workflow tools and create a comparison document..."
              rows={4}
              className="resize-none bg-zinc-800 border-zinc-700 text-zinc-100 focus:border-cyan-500"
              required
            />
            <p className="text-xs text-zinc-500 mt-2">
              Be specific about what you want. The orchestrator will decompose
              your goal into tasks and route them to appropriate agents.
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription className="ml-2">{error}</AlertDescription>
            </Alert>
          )}

          <Button 
            type="submit" 
            disabled={loading || !goal.trim()} 
            className="w-full bg-cyan-500 hover:bg-cyan-600"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Orchestrating...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Submit Goal
              </>
            )}
          </Button>
        </form>
      </Card>

      {/* Result Display */}
      {result && (
        <Card className="p-6 bg-zinc-900/50 border-zinc-800">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-zinc-100">Orchestration Result</h2>
              <Badge
                variant={
                  result.status === "completed"
                    ? "default"
                    : result.status === "blocked"
                    ? "destructive"
                    : "secondary"
                }
                className={
                  result.status === "completed"
                    ? "bg-green-500"
                    : result.status === "blocked"
                    ? "bg-red-500"
                    : "bg-zinc-700"
                }
              >
                {result.status}
              </Badge>
            </div>

            <div className="p-4 bg-zinc-800/50 rounded-lg">
              <p className="text-sm text-zinc-400 mb-1">Goal ID</p>
              <p className="font-mono text-sm text-zinc-100">{result.goalId}</p>
            </div>

            <div>
              <h3 className="font-medium mb-2 text-zinc-100">Summary</h3>
              <p className="text-zinc-300">{result.summary}</p>
            </div>

            <div>
              <h3 className="font-medium mb-2 text-zinc-100">Jobs Executed</h3>
              <div className="space-y-2">
                {result.jobs.map((job: any, index: number) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 bg-zinc-800/50 rounded-lg"
                  >
                    <div className="mt-1">
                      {job.status === "COMPLETED" && (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      )}
                      {job.status === "FAILED" && (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                      {job.status === "BLOCKED" && (
                        <AlertCircle className="w-5 h-5 text-orange-500" />
                      )}
                      {job.status === "RUNNING" && (
                        <Clock className="w-5 h-5 text-yellow-500 animate-spin" />
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm text-zinc-100">
                          Agent: {job.agentId.substring(0, 8)}...
                        </span>
                        <Badge variant="outline" className="text-xs border-zinc-700 text-zinc-300">
                          {job.status}
                        </Badge>
                      </div>

                      {job.error && (
                        <p className="text-sm text-red-400 mt-1">{job.error}</p>
                      )}

                      {job.result && (
                        <details className="mt-2">
                          <summary className="text-xs text-zinc-400 cursor-pointer hover:text-zinc-100">
                            View Result
                          </summary>
                          <pre className="mt-2 text-xs bg-zinc-900 p-2 rounded overflow-auto text-zinc-300">
                            {typeof job.result === "string"
                              ? job.result
                              : JSON.stringify(job.result, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Examples */}
      <Card className="p-6 bg-zinc-900/50 border-zinc-800">
        <h2 className="font-semibold mb-3 text-zinc-100">Example Goals</h2>
        <div className="space-y-2">
          {examples.map((example, index) => (
            <button
              key={index}
              onClick={() => setGoal(example)}
              className="block w-full text-left p-3 text-sm bg-zinc-800/50 hover:bg-zinc-800 rounded-lg transition text-zinc-300 hover:text-zinc-100"
            >
              {example}
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}
