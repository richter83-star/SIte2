import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { User, CreditCard, Plug, Plus, Bell } from "lucide-react";

export default async function SettingsPage() {
  const session = await getServerSession();

  const user = await prisma.user.findUnique({
    where: { id: session!.user.id },
    include: {
      connections: true,
      _count: {
        select: {
          policies: true,
        },
      },
    },
  });

  const deployments = await prisma.deployment.count({
    where: { userId: session!.user.id },
  });

  const executions = await prisma.execution.count({
    where: { userId: session!.user.id },
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-zinc-400">
          Manage your account, subscription, and integrations
        </p>
      </div>

      {/* Profile Settings */}
      <Card className="p-6 bg-zinc-900/50 border-zinc-800">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-5 h-5" />
          <h2 className="text-xl font-semibold">Profile Information</h2>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              defaultValue={user?.name || ""}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              defaultValue={user?.email || ""}
              className="mt-1"
              disabled
            />
            <p className="text-xs text-zinc-500 mt-1">
              Email cannot be changed
            </p>
          </div>

          <Button>Save Changes</Button>
        </div>
      </Card>

      {/* Subscription */}
      <Card className="p-6 bg-zinc-900/50 border-zinc-800">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="w-5 h-5" />
          <h2 className="text-xl font-semibold">Subscription & Billing</h2>
        </div>

        <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg mb-4">
          <div>
            <p className="font-medium">{user?.subscriptionTier} Plan</p>
            <p className="text-sm text-zinc-400 mt-1">
              {user?.subscriptionTier === "FREE"
                ? "4 agent runs per month"
                : user?.subscriptionTier === "PRO"
                ? "3 bundles unlimited runs"
                : "All 8 bundles unlimited"}
            </p>
          </div>
          <Badge variant="default" className="text-lg px-4 py-2">
            $
            {user?.subscriptionTier === "FREE"
              ? "0"
              : user?.subscriptionTier === "PRO"
              ? "49"
              : "199"}
            /mo
          </Badge>
        </div>

        {user?.subscriptionTier === "FREE" && (
          <Button className="w-full">Upgrade to Pro</Button>
        )}
      </Card>

      {/* Usage Statistics */}
      <Card className="p-6 bg-zinc-900/50 border-zinc-800">
        <h2 className="text-xl font-semibold mb-4">Usage Statistics</h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-zinc-800/50 rounded-lg text-center">
            <p className="text-sm text-zinc-400">Deployments</p>
            <p className="text-2xl font-bold mt-1">{deployments}</p>
          </div>
          <div className="p-4 bg-zinc-800/50 rounded-lg text-center">
            <p className="text-sm text-zinc-400">Executions</p>
            <p className="text-2xl font-bold mt-1">{executions}</p>
          </div>
          <div className="p-4 bg-zinc-800/50 rounded-lg text-center">
            <p className="text-sm text-zinc-400">This Month</p>
            <p className="text-2xl font-bold mt-1">
              {user?.agentRunsThisMonth || 0}
            </p>
          </div>
          <div className="p-4 bg-zinc-800/50 rounded-lg text-center">
            <p className="text-sm text-zinc-400">Policies</p>
            <p className="text-2xl font-bold mt-1">
              {user?._count?.policies || 0}
            </p>
          </div>
        </div>
      </Card>

      {/* Service Connections */}
      <Card className="p-6 bg-zinc-900/50 border-zinc-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Plug className="w-5 h-5" />
            <h2 className="text-xl font-semibold">Service Connections</h2>
          </div>
          <Button variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Add Connection
          </Button>
        </div>

        {user?.connections.length === 0 ? (
          <div className="text-center py-8 text-zinc-400">
            <p>No connections yet</p>
            <p className="text-sm mt-1">
              Connect Twitter, Slack, or other services to unlock more agent
              capabilities
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {user?.connections.map((connection) => (
              <div
                key={connection.id}
                className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center">
                    {connection.service[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium capitalize">
                      {connection.service}
                    </p>
                    <p className="text-sm text-zinc-400">
                      {connection.accountName || "Connected"}
                    </p>
                  </div>
                </div>
                <Badge
                  variant={
                    connection.status === "ACTIVE" ? "default" : "secondary"
                  }
                >
                  {connection.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Notification Settings */}
      <Card className="p-6 bg-zinc-900/50 border-zinc-800">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-5 h-5" />
          <h2 className="text-xl font-semibold">Notification Settings</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Email Alerts</p>
              <p className="text-sm text-zinc-400">
                Get notified when policies block actions
              </p>
            </div>
            <input type="checkbox" className="w-4 h-4" />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Slack Alerts</p>
              <p className="text-sm text-zinc-400">
                Send blocked actions to Slack channel
              </p>
            </div>
            <input type="checkbox" className="w-4 h-4" />
          </div>
        </div>
      </Card>

      {/* Danger Zone */}
      <Card className="p-6 bg-zinc-900/50 border-red-900/30">
        <h2 className="text-xl font-semibold mb-2 text-red-500">Danger Zone</h2>
        <p className="text-sm text-zinc-400 mb-4">
          Irreversible actions. Please be careful.
        </p>
        <Button variant="destructive" className="w-full">
          Delete Account
        </Button>
      </Card>
    </div>
  );
}
