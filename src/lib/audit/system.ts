// Audit & Replay System
// Track execution history, replay jobs, analyze performance

import { prisma } from '@/lib/prisma';
import type { Execution } from '@prisma/client';
import { AIAgentExecutor } from '../agents/executor';

export interface ExecutionTrace {
  id: string;
  agentId: string;
  input: any;
  output: any;
  status: string;
  startedAt: Date;
  completedAt?: Date;
  durationMs?: number;
  error?: string;
  policiesChecked: string[];
  blockedBy?: string;
  metadata?: any;
}

export interface PerformanceMetrics {
  totalExecutions: number;
  successRate: number;
  avgDurationMs: number;
  totalCost: number;
  blockedCount: number;
  failedCount: number;
  byAgent: Record<string, {
    count: number;
    successRate: number;
    avgDuration: number;
  }>;
  byDay: Array<{
    date: string;
    count: number;
    successRate: number;
  }>;
}

export interface ReplayResult {
  originalExecution: Execution;
  replayExecution: Execution;
  comparison: {
    statusMatch: boolean;
    outputMatch: boolean;
    durationDiff: number;
    differences: string[];
  };
}

export class AuditSystem {
  /**
   * Get execution history with filters
   */
  async getExecutionHistory(
    userId: string,
    filters?: {
      agentId?: string;
      status?: string;
      projectId?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    }
  ): Promise<ExecutionTrace[]> {
    const executions = await prisma.execution.findMany({
      where: {
        userId,
        ...(filters?.agentId && { agentId: filters.agentId }),
        ...(filters?.status && { status: filters.status as any }),
        ...(filters?.projectId && { projectId: filters.projectId }),
        ...(filters?.startDate && {
          startedAt: { gte: filters.startDate },
        }),
        ...(filters?.endDate && {
          startedAt: { lte: filters.endDate },
        }),
      },
      orderBy: { startedAt: 'desc' },
      take: filters?.limit || 100,
    });

    return executions.map(this.toExecutionTrace);
  }

  /**
   * Get detailed trace for a specific execution
   */
  async getExecutionTrace(executionId: string): Promise<ExecutionTrace | null> {
    const execution = await prisma.execution.findUnique({
      where: { id: executionId },
      include: {
        agent: true,
        user: true,
      },
    });

    if (!execution) return null;

    return this.toExecutionTrace(execution);
  }

  /**
   * Get performance metrics for a time period
   */
  async getPerformanceMetrics(
    userId: string,
    days: number = 7
  ): Promise<PerformanceMetrics> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const executions = await prisma.execution.findMany({
      where: {
        userId,
        startedAt: { gte: since },
      },
      include: {
        agent: true,
      },
    });

    // Calculate overall metrics
    const totalExecutions = executions.length;
    const completed = executions.filter((e) => e.status === 'COMPLETED');
    const failed = executions.filter((e) => e.status === 'FAILED');
    const blocked = executions.filter((e) => e.status === 'BLOCKED');

    const successRate = totalExecutions > 0 ? (completed.length / totalExecutions) * 100 : 0;
    
    const avgDurationMs = completed.length > 0
      ? completed.reduce((sum, e) => sum + (e.durationMs || 0), 0) / completed.length
      : 0;

    const totalCost = executions.reduce((sum, e) => sum + (e.cost || 0), 0) / 100; // Convert to dollars

    // Calculate by-agent metrics
    const byAgent: Record<string, any> = {};
    const agentGroups = this.groupBy(executions, 'agentId');

    for (const [agentId, execs] of Object.entries(agentGroups)) {
      const agentCompleted = execs.filter((e) => e.status === 'COMPLETED');
      const agentSuccessRate = execs.length > 0
        ? (agentCompleted.length / execs.length) * 100
        : 0;
      const agentAvgDuration = agentCompleted.length > 0
        ? agentCompleted.reduce((sum, e) => sum + (e.durationMs || 0), 0) / agentCompleted.length
        : 0;

      byAgent[agentId] = {
        count: execs.length,
        successRate: agentSuccessRate,
        avgDuration: agentAvgDuration,
      };
    }

    // Calculate by-day metrics
    const byDay = this.calculateDailyMetrics(executions, days);

    return {
      totalExecutions,
      successRate,
      avgDurationMs,
      totalCost,
      blockedCount: blocked.length,
      failedCount: failed.length,
      byAgent,
      byDay,
    };
  }

  /**
   * Replay a previous execution
   */
  async replayExecution(
    executionId: string,
    userId: string
  ): Promise<ReplayResult> {
    // Get original execution
    const original = await prisma.execution.findUnique({
      where: { id: executionId, userId },
      include: { agent: true },
    });

    if (!original) {
      throw new Error('Execution not found');
    }

    // Create new execution with same input
    const executor = new AIAgentExecutor();
    const startTime = Date.now();

    const agentConfig = {
      id: original.agent.id,
      name: original.agent.name,
      category: original.agent.category,
      systemPrompt: original.agent.systemPrompt,
      modelPreference: original.agent.modelPreference as any,
      capabilities: original.agent.capabilities,
    };

    const result = await executor.execute(agentConfig, original.input as any);
    const durationMs = Date.now() - startTime;

    // Create replay execution record
    const replay = await prisma.execution.create({
      data: {
        userId,
        agentId: original.agentId,
        deploymentId: original.deploymentId,
        goalId: original.goalId,
        projectId: original.projectId,
        input: original.input as any,
        output: result.result as any,
        status: result.success ? 'COMPLETED' : 'FAILED',
        error: result.error,
        policiesChecked: original.policiesChecked,
        startedAt: new Date(startTime),
        completedAt: new Date(),
        durationMs,
        tokensUsed: result.metadata.tokensUsed,
        cost: result.metadata.cost ? Math.round(result.metadata.cost * 100) : null,
        metadata: {
          replayOf: executionId,
          originalDuration: original.durationMs,
          ...result.metadata,
        },
      },
    });

    // Compare results
    const comparison = this.compareExecutions(original, replay);

    return {
      originalExecution: original,
      replayExecution: replay,
      comparison,
    };
  }

  /**
   * Export execution history
   */
  async exportExecutionHistory(
    userId: string,
    format: 'json' | 'csv' = 'json',
    filters?: any
  ): Promise<string> {
    const executions = await this.getExecutionHistory(userId, filters);

    if (format === 'json') {
      return JSON.stringify(executions, null, 2);
    }

    // CSV format
    const headers = [
      'ID',
      'Agent',
      'Status',
      'Started At',
      'Duration (ms)',
      'Cost ($)',
      'Error',
    ];

    const rows = executions.map((e) => [
      e.id,
      e.agentId,
      e.status,
      e.startedAt.toISOString(),
      e.durationMs?.toString() || '',
      e.metadata?.cost?.toString() || '',
      e.error || '',
    ]);

    return [headers, ...rows].map((row) => row.join(',')).join('\n');
  }

  // Helper methods

  private toExecutionTrace(execution: any): ExecutionTrace {
    return {
      id: execution.id,
      agentId: execution.agentId,
      input: execution.input,
      output: execution.output,
      status: execution.status,
      startedAt: execution.startedAt,
      completedAt: execution.completedAt,
      durationMs: execution.durationMs,
      error: execution.error,
      policiesChecked: execution.policiesChecked,
      blockedBy: execution.blockedBy,
      metadata: execution.metadata,
    };
  }

  private groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
    return array.reduce((groups, item) => {
      const groupKey = String(item[key]);
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(item);
      return groups;
    }, {} as Record<string, T[]>);
  }

  private calculateDailyMetrics(executions: Execution[], days: number) {
    const dailyData: Record<string, Execution[]> = {};
    
    // Initialize all days
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      dailyData[dateKey] = [];
    }

    // Group executions by day
    for (const exec of executions) {
      const dateKey = exec.startedAt.toISOString().split('T')[0];
      if (dailyData[dateKey]) {
        dailyData[dateKey].push(exec);
      }
    }

    // Calculate metrics for each day
    return Object.entries(dailyData)
      .map(([date, execs]) => {
        const completed = execs.filter((e) => e.status === 'COMPLETED');
        const successRate = execs.length > 0
          ? (completed.length / execs.length) * 100
          : 0;

        return {
          date,
          count: execs.length,
          successRate,
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private compareExecutions(original: Execution, replay: Execution) {
    const differences: string[] = [];

    // Compare status
    const statusMatch = original.status === replay.status;
    if (!statusMatch) {
      differences.push(
        `Status changed: ${original.status} → ${replay.status}`
      );
    }

    // Compare output (simplified)
    const outputMatch = JSON.stringify(original.output) === JSON.stringify(replay.output);
    if (!outputMatch) {
      differences.push('Output differs from original execution');
    }

    // Compare duration
    const durationDiff = (replay.durationMs || 0) - (original.durationMs || 0);
    if (Math.abs(durationDiff) > 1000) {
      differences.push(
        `Duration ${durationDiff > 0 ? 'increased' : 'decreased'} by ${Math.abs(durationDiff)}ms`
      );
    }

    // Compare errors
    if (original.error !== replay.error) {
      differences.push(`Error changed: "${original.error}" → "${replay.error}"`);
    }

    return {
      statusMatch,
      outputMatch,
      durationDiff,
      differences,
    };
  }
}

export const auditSystem = new AuditSystem();
