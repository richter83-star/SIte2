// AI Orchestrator
// Decomposes high-level goals into agent jobs and routes them

import { prisma } from '@/lib/prisma';
import { AIAgentExecutor } from '../agents/executor';
import { policyEnforcer } from '../policies/enforcer';
import type { Agent } from '@prisma/client';

export interface OrchestrationRequest {
  userId: string;
  goal: string;
  projectId?: string;
  context?: Record<string, any>;
  environment?: 'sandbox' | 'production';
}

export interface DecomposedJob {
  agentId: string;
  task: string;
  dependencies?: string[]; // IDs of jobs that must complete first
  priority: number;
}

export interface OrchestrationResult {
  goalId: string;
  status: 'completed' | 'partial' | 'failed' | 'blocked';
  jobs: Array<{
    agentId: string;
    executionId: string;
    status: string;
    result?: any;
    error?: string;
  }>;
  summary: string;
}

export class Orchestrator {
  private executor: AIAgentExecutor;

  constructor() {
    this.executor = new AIAgentExecutor();
  }

  /**
   * Main orchestration method
   * 1. Decompose goal into jobs
   * 2. Route jobs to appropriate agents
   * 3. Execute jobs with policy checks
   * 4. Return results
   */
  async orchestrate(request: OrchestrationRequest): Promise<OrchestrationResult> {
    // Create goal record
    const goal = await prisma.goal.create({
      data: {
        userId: request.userId,
        projectId: request.projectId,
        description: request.goal,
        status: 'DECOMPOSING',
        priority: 5,
      },
    });

    try {
      // Step 1: Decompose goal into jobs
      const jobs = await this.decomposeGoal(request.goal, request.context);

      await prisma.goal.update({
        where: { id: goal.id },
        data: {
          decomposedJobs: jobs as any,
          status: 'EXECUTING',
        },
      });

      // Step 2: Route jobs to agents
      const routedJobs = await this.routeJobs(jobs);

      // Step 3: Execute jobs
      const results = await this.executeJobs(routedJobs, request, goal.id);

      // Step 4: Determine overall status
      const status = this.determineStatus(results);

      await prisma.goal.update({
        where: { id: goal.id },
        data: {
          status: status === 'completed' ? 'COMPLETED' : status === 'blocked' ? 'BLOCKED' : 'FAILED',
          completedAt: new Date(),
        },
      });

      return {
        goalId: goal.id,
        status,
        jobs: results,
        summary: this.generateSummary(results),
      };
    } catch (error: any) {
      await prisma.goal.update({
        where: { id: goal.id },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
        },
      });

      throw error;
    }
  }

  /**
   * Decompose goal into specific agent jobs
   */
  private async decomposeGoal(
    goal: string,
    context?: Record<string, any>
  ): Promise<DecomposedJob[]> {
    // Use AI to decompose goal into tasks
    // This is a simplified version - in production, use a more sophisticated decomposition agent

    const decompositionPrompt = `
Break down this goal into specific, actionable tasks that can be handled by specialized AI agents.

Goal: ${goal}
${context ? `Context: ${JSON.stringify(context)}` : ''}

Available agent types:
- EMAIL: Send emails, draft email content, manage inbox
- CALENDAR: Schedule meetings, check availability, manage events
- RESEARCH: Web research, data gathering, competitor analysis
- DOCUMENT: Create/edit documents, generate reports, format content
- DATA: Analyze data, create visualizations, extract insights
- CODE: Review code, generate code, debug issues
- SUPPORT: Customer support, ticket handling, FAQ responses
- WORKFLOW: Automate workflows, integrate systems, trigger actions

Return a JSON array of tasks, each with:
- agentType: which agent category should handle this
- task: specific task description
- priority: 1-10 (10 = highest)
- dependencies: array of task indices that must complete first (if any)

Example format:
[
  {"agentType": "RESEARCH", "task": "Research competitor pricing", "priority": 10, "dependencies": []},
  {"agentType": "DOCUMENT", "task": "Create pricing comparison report", "priority": 8, "dependencies": [0]}
]
    `.trim();

    try {
      // Use Ollama for decomposition (free, local)
      const response = await fetch(`${process.env.OLLAMA_API_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3.2',
          prompt: decompositionPrompt,
          stream: false,
          format: 'json',
        }),
      });

      if (!response.ok) {
        throw new Error('Decomposition failed');
      }

      const data = await response.json();
      const tasks = JSON.parse(data.response);

      // Convert to DecomposedJob format with actual agent IDs
      const jobs: DecomposedJob[] = [];
      for (const task of tasks) {
        // Find agent of this type
        const agent = await this.findAgentByCategory(task.agentType);
        if (agent) {
          jobs.push({
            agentId: agent.id,
            task: task.task,
            dependencies: task.dependencies || [],
            priority: task.priority || 5,
          });
        }
      }

      return jobs;
    } catch (error) {
      // Fallback: Simple decomposition based on keywords
      return this.simpleDecomposition(goal);
    }
  }

  /**
   * Fallback decomposition using keywords
   */
  private async simpleDecomposition(goal: string): Promise<DecomposedJob[]> {
    const goalLower = goal.toLowerCase();
    const jobs: DecomposedJob[] = [];

    // Keyword-based routing
    if (goalLower.includes('email') || goalLower.includes('send')) {
      const agent = await this.findAgentByCategory('EMAIL');
      if (agent) {
        jobs.push({ agentId: agent.id, task: goal, dependencies: [], priority: 5 });
      }
    }

    if (goalLower.includes('research') || goalLower.includes('find')) {
      const agent = await this.findAgentByCategory('RESEARCH');
      if (agent) {
        jobs.push({ agentId: agent.id, task: goal, dependencies: [], priority: 5 });
      }
    }

    if (goalLower.includes('document') || goalLower.includes('write') || goalLower.includes('create')) {
      const agent = await this.findAgentByCategory('DOCUMENT');
      if (agent) {
        jobs.push({ agentId: agent.id, task: goal, dependencies: [], priority: 5 });
      }
    }

    // Default: Use the first available agent
    if (jobs.length === 0) {
      const agent = await prisma.agent.findFirst({ where: { active: true } });
      if (agent) {
        jobs.push({ agentId: agent.id, task: goal, dependencies: [], priority: 5 });
      }
    }

    return jobs;
  }

  /**
   * Route jobs to appropriate agents
   */
  private async routeJobs(jobs: DecomposedJob[]): Promise<Array<DecomposedJob & { agent: Agent }>> {
    const routedJobs = [];

    for (const job of jobs) {
      const agent = await prisma.agent.findUnique({ where: { id: job.agentId } });
      if (agent) {
        routedJobs.push({ ...job, agent });
      }
    }

    return routedJobs;
  }

  /**
   * Execute jobs with policy enforcement
   */
  private async executeJobs(
    jobs: Array<DecomposedJob & { agent: Agent }>,
    request: OrchestrationRequest,
    goalId: string
  ) {
    const results = [];

    // Sort by priority and dependencies
    const sortedJobs = this.sortJobsByDependencies(jobs);

    for (const job of sortedJobs) {
      try {
        // Check policies before execution
        const policyCheck = await policyEnforcer.enforce({
          userId: request.userId,
          agentId: job.agentId,
          action: { task: job.task, goal: request.goal },
          projectId: request.projectId,
          environment: request.environment || 'production',
        });

        if (!policyCheck.allowed) {
          // Job blocked by policy
          const execution = await prisma.execution.create({
            data: {
              userId: request.userId,
              agentId: job.agentId,
              goalId,
              projectId: request.projectId,
              input: { task: job.task },
              status: 'BLOCKED',
              blockedBy: policyCheck.blockedBy?.id,
              policiesChecked: policyCheck.blockedBy ? [policyCheck.blockedBy.id] : [],
              startedAt: new Date(),
              completedAt: new Date(),
            },
          });

          results.push({
            agentId: job.agentId,
            executionId: execution.id,
            status: 'BLOCKED',
            error: policyCheck.reason,
          });

          continue;
        }

        // Execute job
        const agentConfig = {
          id: (job as any).agent.id,
          name: (job as any).agent.name,
          category: (job as any).agent.category,
          systemPrompt: (job as any).agent.systemPrompt,
          modelPreference: (job as any).agent.modelPreference as any,
          capabilities: (job as any).agent.capabilities,
        };

        const result = await this.executor.execute(agentConfig, {
          goal: job.task,
          context: request.context,
        });

        // Save execution
        const execution = await prisma.execution.create({
          data: {
            userId: request.userId,
            agentId: job.agentId,
            goalId,
            projectId: request.projectId,
            input: { task: job.task },
            output: result.result,
            status: result.success ? 'COMPLETED' : 'FAILED',
            error: result.error,
            policiesChecked: policyCheck.blockedBy ? [policyCheck.blockedBy.id] : [],
            startedAt: new Date(Date.now() - result.metadata.durationMs),
            completedAt: new Date(),
            durationMs: result.metadata.durationMs,
            tokensUsed: result.metadata.tokensUsed,
            cost: result.metadata.cost ? Math.round(result.metadata.cost * 100) : null,
            metadata: result.metadata,
          },
        });

        results.push({
          agentId: job.agentId,
          executionId: execution.id,
          status: result.success ? 'COMPLETED' : 'FAILED',
          result: result.result,
          error: result.error,
        });
      } catch (error: any) {
        // Execution error
        const execution = await prisma.execution.create({
          data: {
            userId: request.userId,
            agentId: job.agentId,
            goalId,
            projectId: request.projectId,
            input: { task: job.task },
            status: 'FAILED',
            error: error.message,
            policiesChecked: [],
            startedAt: new Date(),
            completedAt: new Date(),
          },
        });

        results.push({
          agentId: job.agentId,
          executionId: execution.id,
          status: 'FAILED',
          error: error.message,
        });
      }
    }

    return results;
  }

  // Helper methods

  private async findAgentByCategory(category: string): Promise<Agent | null> {
    return await prisma.agent.findFirst({
      where: {
        category: category as any,
        active: true,
      },
      orderBy: {
        deploymentCount: 'desc', // Prefer popular agents
      },
    });
  }

  private sortJobsByDependencies(jobs: DecomposedJob[]): DecomposedJob[] {
    // Simple topological sort by priority
    return jobs.sort((a, b) => b.priority - a.priority);
  }

  private determineStatus(results: any[]): 'completed' | 'partial' | 'failed' | 'blocked' {
    const completed = results.filter((r) => r.status === 'COMPLETED').length;
    const blocked = results.filter((r) => r.status === 'BLOCKED').length;
    const failed = results.filter((r) => r.status === 'FAILED').length;

    if (completed === results.length) return 'completed';
    if (blocked > 0) return 'blocked';
    if (failed === results.length) return 'failed';
    return 'partial';
  }

  private generateSummary(results: any[]): string {
    const completed = results.filter((r) => r.status === 'COMPLETED').length;
    const blocked = results.filter((r) => r.status === 'BLOCKED').length;
    const failed = results.filter((r) => r.status === 'FAILED').length;

    return `${completed}/${results.length} jobs completed${blocked > 0 ? `, ${blocked} blocked` : ''}${failed > 0 ? `, ${failed} failed` : ''}`;
  }
}

export const orchestrator = new Orchestrator();
