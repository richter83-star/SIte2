// Policy Enforcement Engine (Governor System)
// Checks if agent actions should be blocked, warned, or require approval

import { prisma } from '@/lib/prisma';
import type { Policy, PolicyType, PolicyAction, BlockedAction } from '@prisma/client';

export interface EnforcementContext {
  userId: string;
  agentId: string;
  action: any;
  projectId?: string;
  environment: 'sandbox' | 'production';
}

export interface EnforcementResult {
  allowed: boolean;
  action: PolicyAction;
  blockedBy?: Policy;
  reason?: string;
  requiresApproval?: boolean;
}

export class PolicyEnforcer {
  /**
   * Check if an action is allowed based on active policies
   */
  async enforce(context: EnforcementContext): Promise<EnforcementResult> {
    // Get applicable policies
    const policies = await this.getApplicablePolicies(
      context.userId,
      context.projectId
    );

    // Check each policy
    for (const policy of policies) {
      const violation = await this.checkPolicy(policy, context);
      
      if (violation) {
        // Log blocked action
        if (policy.action === 'BLOCK' || policy.action === 'REQUIRE_APPROVAL') {
          await this.logBlockedAction(policy, context, violation.reason);
        }

        // Update policy triggered count
        await prisma.policy.update({
          where: { id: policy.id },
          data: { triggeredCount: { increment: 1 } },
        });

        return {
          allowed: policy.action === 'WARN',
          action: policy.action,
          blockedBy: policy,
          reason: violation.reason,
          requiresApproval: policy.action === 'REQUIRE_APPROVAL',
        };
      }
    }

    // No violations - allow
    return {
      allowed: true,
      action: 'BLOCK', // dummy value
    };
  }

  /**
   * Get policies applicable to this context
   */
  private async getApplicablePolicies(
    userId: string,
    projectId?: string
  ): Promise<Policy[]> {
    const policies = await prisma.policy.findMany({
      where: {
        userId,
        active: true,
        AND: [
          {
            OR: [
              { projectId: null }, // Global policies
              { projectId }, // Project-specific policies
            ],
          },
          {
            OR: [
              { expiresAt: null }, // Never expires
              { expiresAt: { gte: new Date() } }, // Not yet expired
            ],
          },
        ],
      },
      orderBy: [
        { severity: 'desc' }, // Critical policies first
        { createdAt: 'asc' },
      ],
    });

    return policies;
  }

  /**
   * Check if action violates a specific policy
   */
  private async checkPolicy(
    policy: Policy,
    context: EnforcementContext
  ): Promise<{ reason: string } | null> {
    const conditions = policy.conditions as any;

    switch (policy.type) {
      case 'RATE_LIMIT':
        return await this.checkRateLimit(conditions, context);
      
      case 'CONTENT_FILTER':
        return this.checkContentFilter(conditions, context);
      
      case 'APPROVAL_REQUIRED':
        return this.checkApprovalRequired(conditions, context);
      
      case 'BUDGET_LIMIT':
        return await this.checkBudgetLimit(conditions, context);
      
      case 'TIME_WINDOW':
        return this.checkTimeWindow(conditions, context);
      
      case 'CUSTOM':
        return this.checkCustomPolicy(conditions, context);
      
      default:
        return null;
    }
  }

  /**
   * Check rate limit policy
   */
  private async checkRateLimit(
    conditions: any,
    context: EnforcementContext
  ): Promise<{ reason: string } | null> {
    const { limit, window } = conditions; // e.g., { limit: 100, window: 'hour' }
    
    const windowStart = this.getWindowStart(window);
    
    const count = await prisma.execution.count({
      where: {
        userId: context.userId,
        agentId: context.agentId,
        startedAt: { gte: windowStart },
      },
    });

    if (count >= limit) {
      return {
        reason: `Rate limit exceeded: ${count}/${limit} executions in the last ${window}`,
      };
    }

    return null;
  }

  /**
   * Check content filter policy
   */
  private checkContentFilter(
    conditions: any,
    context: EnforcementContext
  ): { reason: string } | null {
    const { blacklist, whitelist } = conditions;
    const actionStr = JSON.stringify(context.action).toLowerCase();

    // Check blacklist
    if (blacklist && Array.isArray(blacklist)) {
      for (const term of blacklist) {
        if (actionStr.includes(term.toLowerCase())) {
          return { reason: `Content contains blacklisted term: "${term}"` };
        }
      }
    }

    // Check whitelist (if defined, only whitelist terms allowed)
    if (whitelist && Array.isArray(whitelist) && whitelist.length > 0) {
      const hasWhitelistedTerm = whitelist.some((term: string) =>
        actionStr.includes(term.toLowerCase())
      );
      
      if (!hasWhitelistedTerm) {
        return { reason: 'Content does not contain any whitelisted terms' };
      }
    }

    return null;
  }

  /**
   * Check if action requires approval
   */
  private checkApprovalRequired(
    conditions: any,
    context: EnforcementContext
  ): { reason: string } | null {
    const { triggers } = conditions;
    
    // Check if any trigger condition is met
    if (triggers && Array.isArray(triggers)) {
      for (const trigger of triggers) {
        if (this.matchesTrigger(trigger, context)) {
          return { reason: `Approval required: ${trigger.description || 'Action matches approval criteria'}` };
        }
      }
    }

    return null;
  }

  /**
   * Check budget limit policy
   */
  private async checkBudgetLimit(
    conditions: any,
    context: EnforcementContext
  ): Promise<{ reason: string } | null> {
    const { limit, window } = conditions; // e.g., { limit: 10.00, window: 'month' } in dollars
    
    const windowStart = this.getWindowStart(window);
    
    const result = await prisma.execution.aggregate({
      where: {
        userId: context.userId,
        startedAt: { gte: windowStart },
        cost: { not: null },
      },
      _sum: {
        cost: true,
      },
    });

    const totalCost = (result._sum.cost || 0) / 100; // Convert cents to dollars
    
    if (totalCost >= limit) {
      return {
        reason: `Budget limit exceeded: $${totalCost.toFixed(2)}/$${limit.toFixed(2)} spent in the last ${window}`,
      };
    }

    return null;
  }

  /**
   * Check time window policy
   */
  private checkTimeWindow(
    conditions: any,
    context: EnforcementContext
  ): { reason: string } | null {
    const { allowedHours, timezone } = conditions; // e.g., { allowedHours: [9, 10, 11, ..., 17], timezone: 'America/New_York' }
    
    const now = new Date();
    const hour = now.getHours(); // TODO: Apply timezone
    
    if (allowedHours && Array.isArray(allowedHours)) {
      if (!allowedHours.includes(hour)) {
        return {
          reason: `Action not allowed at this time (hour ${hour}). Allowed hours: ${allowedHours.join(', ')}`,
        };
      }
    }

    return null;
  }

  /**
   * Check custom policy (user-defined logic)
   */
  private checkCustomPolicy(
    conditions: any,
    context: EnforcementContext
  ): { reason: string } | null {
    // Custom policies use JavaScript expressions or rules
    // For safety, we'd use a sandboxed evaluator in production
    const { expression } = conditions;
    
    try {
      // Simplified evaluation - in production use vm2 or similar
      const matches = this.evaluateExpression(expression, context);
      
      if (matches) {
        return { reason: 'Custom policy condition matched' };
      }
    } catch (error) {
      console.error('Custom policy evaluation error:', error);
    }

    return null;
  }

  /**
   * Log blocked action
   */
  private async logBlockedAction(
    policy: Policy,
    context: EnforcementContext,
    reason: string
  ): Promise<void> {
    await prisma.blockedAction.create({
      data: {
        userId: context.userId,
        policyId: policy.id,
        agentId: context.agentId,
        action: context.action,
        reason,
        environment: context.environment,
        status: 'PENDING',
      },
    });

    // Send notification if production
    if (context.environment === 'production') {
      await this.sendBlockedActionNotification(context.userId, policy.name, reason);
    }
  }

  /**
   * Send notification for blocked action
   */
  private async sendBlockedActionNotification(
    userId: string,
    policyName: string,
    reason: string
  ): Promise<void> {
    // Create in-app notification
    await prisma.notification.create({
      data: {
        userId,
        type: 'blocked_action',
        title: 'Action Blocked by Policy',
        message: `Policy "${policyName}" blocked an action: ${reason}`,
        link: '/dashboard/policies/blocked',
        read: false,
      },
    });

    // TODO: Send email/Slack alert if configured
  }

  // Helper methods
  
  private getWindowStart(window: string): Date {
    const now = new Date();
    switch (window) {
      case 'hour':
        return new Date(now.getTime() - 60 * 60 * 1000);
      case 'day':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
  }

  private matchesTrigger(trigger: any, context: EnforcementContext): boolean {
    // Simplified trigger matching
    // In production, use more sophisticated pattern matching
    const actionStr = JSON.stringify(context.action).toLowerCase();
    const pattern = (trigger.pattern || '').toLowerCase();
    
    return actionStr.includes(pattern);
  }

  private evaluateExpression(expression: string, context: EnforcementContext): boolean {
    // Simplified - in production use vm2 or similar for sandboxing
    // This is just a placeholder
    return false;
  }
}

export const policyEnforcer = new PolicyEnforcer();
