// Memory & Learning System
// Analyzes execution patterns and generates insights

import { prisma } from '@/lib/prisma';
import type { Execution, Learning, LearningType } from '@prisma/client';

export interface PatternAnalysis {
  type: LearningType;
  pattern: any;
  insight: string;
  confidence: number;
  sourceExecutionIds: string[];
}

export class LearningEngine {
  /**
   * Analyze recent executions and generate learnings
   */
  async analyzeAndLearn(userId: string): Promise<Learning[]> {
    const recentExecutions = await this.getRecentExecutions(userId);
    
    if (recentExecutions.length < 5) {
      return []; // Need minimum data to learn
    }

    const patterns: PatternAnalysis[] = [];

    // Detect different types of patterns
    patterns.push(...await this.detectSuccessPatterns(recentExecutions));
    patterns.push(...await this.detectFailurePatterns(recentExecutions));
    patterns.push(...await this.detectPerformanceTips(recentExecutions));
    patterns.push(...await this.detectRoutingPreferences(recentExecutions));
    patterns.push(...await this.detectPolicyTriggers(recentExecutions));

    // Save learnings to database
    const learnings: Learning[] = [];
    for (const pattern of patterns) {
      const learning = await prisma.learning.create({
        data: {
          userId,
          agentId: this.getMostCommonAgent(pattern.sourceExecutionIds, recentExecutions),
          type: pattern.type,
          pattern: pattern.pattern,
          insight: pattern.insight,
          confidence: pattern.confidence,
          sourceExecutionIds: pattern.sourceExecutionIds,
          applied: false,
          verified: false,
        },
      });
      learnings.push(learning);
    }

    return learnings;
  }

  /**
   * Detect success patterns
   */
  private async detectSuccessPatterns(
    executions: Execution[]
  ): Promise<PatternAnalysis[]> {
    const patterns: PatternAnalysis[] = [];
    
    // Find successful executions
    const successfulExecs = executions.filter(
      (e) => e.status === 'COMPLETED' && e.durationMs && e.durationMs < 5000
    );

    if (successfulExecs.length < 3) return patterns;

    // Group by agent
    const byAgent = this.groupBy(successfulExecs, 'agentId');
    
    for (const [agentId, execs] of Object.entries(byAgent)) {
      if (execs.length >= 3) {
        const avgDuration = this.average(execs.map((e) => e.durationMs || 0));
        const successRate = (execs.length / executions.length) * 100;

        patterns.push({
          type: 'SUCCESS_PATTERN',
          pattern: {
            agentId,
            avgDuration,
            successRate,
            sampleSize: execs.length,
          },
          insight: `Agent performs well with ${successRate.toFixed(0)}% success rate and avg ${Math.round(avgDuration)}ms execution time`,
          confidence: Math.min(execs.length / 10, 1), // Max confidence at 10+ executions
          sourceExecutionIds: execs.map((e) => e.id),
        });
      }
    }

    return patterns;
  }

  /**
   * Detect failure patterns
   */
  private async detectFailurePatterns(
    executions: Execution[]
  ): Promise<PatternAnalysis[]> {
    const patterns: PatternAnalysis[] = [];
    
    const failedExecs = executions.filter((e) => e.status === 'FAILED');

    if (failedExecs.length < 2) return patterns;

    // Look for common error patterns
    const errorGroups = this.groupBy(
      failedExecs.filter((e) => e.error),
      (e) => this.normalizeError(e.error || '')
    );

    for (const [errorType, execs] of Object.entries(errorGroups)) {
      if (execs.length >= 2) {
        const failureRate = (execs.length / executions.length) * 100;

        patterns.push({
          type: 'FAILURE_PATTERN',
          pattern: {
            errorType,
            failureRate,
            occurrences: execs.length,
            affectedAgents: [...new Set(execs.map((e) => e.agentId))],
          },
          insight: `Recurring failure: "${errorType}" (${execs.length} times, ${failureRate.toFixed(0)}% of executions)`,
          confidence: Math.min(execs.length / 5, 1),
          sourceExecutionIds: execs.map((e) => e.id),
        });
      }
    }

    return patterns;
  }

  /**
   * Detect performance tips
   */
  private async detectPerformanceTips(
    executions: Execution[]
  ): Promise<PatternAnalysis[]> {
    const patterns: PatternAnalysis[] = [];
    
    const completed = executions.filter(
      (e) => e.status === 'COMPLETED' && e.durationMs
    );

    if (completed.length < 5) return patterns;

    // Find slow executions
    const avgDuration = this.average(completed.map((e) => e.durationMs || 0));
    const slowExecs = completed.filter((e) => (e.durationMs || 0) > avgDuration * 2);

    if (slowExecs.length >= 2) {
      const slowAgents = this.groupBy(slowExecs, 'agentId');
      
      for (const [agentId, execs] of Object.entries(slowAgents)) {
        if (execs.length >= 2) {
          const avgSlow = this.average(execs.map((e) => e.durationMs || 0));

          patterns.push({
            type: 'PERFORMANCE_TIP',
            pattern: {
              agentId,
              avgDuration: avgSlow,
              occurrences: execs.length,
            },
            insight: `Agent is slower than average (${Math.round(avgSlow)}ms vs ${Math.round(avgDuration)}ms). Consider optimizing or using a different agent.`,
            confidence: Math.min(execs.length / 5, 1),
            sourceExecutionIds: execs.map((e) => e.id),
          });
        }
      }
    }

    return patterns;
  }

  /**
   * Detect routing preferences
   */
  private async detectRoutingPreferences(
    executions: Execution[]
  ): Promise<PatternAnalysis[]> {
    const patterns: PatternAnalysis[] = [];
    
    // Find which agents are used most successfully
    const successful = executions.filter((e) => e.status === 'COMPLETED');
    
    if (successful.length < 5) return patterns;

    const agentUsage = this.groupBy(successful, 'agentId');
    const sortedAgents = Object.entries(agentUsage)
      .sort(([, a], [, b]) => b.length - a.length)
      .slice(0, 3); // Top 3

    for (const [agentId, execs] of sortedAgents) {
      const usageRate = (execs.length / executions.length) * 100;
      
      if (usageRate > 20) {
        patterns.push({
          type: 'ROUTING_PREFERENCE',
          pattern: {
            agentId,
            usageRate,
            executions: execs.length,
          },
          insight: `Agent is your most-used agent (${usageRate.toFixed(0)}% of executions). Consider optimizing workflows around it.`,
          confidence: Math.min(execs.length / 10, 1),
          sourceExecutionIds: execs.map((e) => e.id),
        });
      }
    }

    return patterns;
  }

  /**
   * Detect policy trigger patterns
   */
  private async detectPolicyTriggers(
    executions: Execution[]
  ): Promise<PatternAnalysis[]> {
    const patterns: PatternAnalysis[] = [];
    
    const blocked = executions.filter((e) => e.status === 'BLOCKED');

    if (blocked.length < 2) return patterns;

    const byPolicy = this.groupBy(blocked, 'blockedBy');

    for (const [policyId, execs] of Object.entries(byPolicy)) {
      if (!policyId || policyId === 'null') continue;
      
      if (execs.length >= 2) {
        const blockRate = (execs.length / executions.length) * 100;

        patterns.push({
          type: 'POLICY_TRIGGER',
          pattern: {
            policyId,
            blockRate,
            occurrences: execs.length,
          },
          insight: `Policy frequently blocks actions (${execs.length} times, ${blockRate.toFixed(0)}% of executions). Consider adjusting policy rules.`,
          confidence: Math.min(execs.length / 5, 1),
          sourceExecutionIds: execs.map((e) => e.id),
        });
      }
    }

    return patterns;
  }

  /**
   * Get insights for display
   */
  async getInsights(userId: string, limit: number = 10): Promise<Learning[]> {
    return await prisma.learning.findMany({
      where: { userId },
      orderBy: [
        { confidence: 'desc' },
        { createdAt: 'desc' },
      ],
      take: limit,
    });
  }

  /**
   * Get agent performance metrics
   */
  async getAgentPerformance(userId: string) {
    const executions = await this.getRecentExecutions(userId, 30); // Last 30 days
    
    const byAgent = this.groupBy(executions, 'agentId');
    
    const performance = Object.entries(byAgent).map(([agentId, execs]) => {
      const completed = execs.filter((e) => e.status === 'COMPLETED');
      const failed = execs.filter((e) => e.status === 'FAILED');
      const blocked = execs.filter((e) => e.status === 'BLOCKED');
      
      const avgDuration = completed.length > 0
        ? this.average(completed.map((e) => e.durationMs || 0))
        : 0;
      
      const successRate = execs.length > 0
        ? (completed.length / execs.length) * 100
        : 0;

      return {
        agentId,
        totalExecutions: execs.length,
        completed: completed.length,
        failed: failed.length,
        blocked: blocked.length,
        successRate,
        avgDuration,
      };
    });

    return performance.sort((a, b) => b.totalExecutions - a.totalExecutions);
  }

  // Helper methods

  private async getRecentExecutions(
    userId: string,
    days: number = 7
  ): Promise<Execution[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    return await prisma.execution.findMany({
      where: {
        userId,
        startedAt: { gte: since },
      },
      orderBy: { startedAt: 'desc' },
      take: 100, // Limit to prevent excessive memory usage
    });
  }

  private groupBy<T>(array: T[], key: keyof T | ((item: T) => string)): Record<string, T[]> {
    return array.reduce((groups, item) => {
      const groupKey = typeof key === 'function' ? key(item) : String(item[key]);
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(item);
      return groups;
    }, {} as Record<string, T[]>);
  }

  private average(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
  }

  private normalizeError(error: string): string {
    // Extract error type from full error message
    return error.split(':')[0].trim().toLowerCase();
  }

  private getMostCommonAgent(
    executionIds: string[],
    allExecutions: Execution[]
  ): string | undefined {
    const relevantExecs = allExecutions.filter((e) => executionIds.includes(e.id));
    if (relevantExecs.length === 0) return undefined;
    
    const counts = relevantExecs.reduce((acc, e) => {
      acc[e.agentId] = (acc[e.agentId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(counts).sort(([, a], [, b]) => b - a)[0][0];
  }
}

export const learningEngine = new LearningEngine();
