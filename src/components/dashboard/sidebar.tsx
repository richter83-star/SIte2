"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Bot,
  Workflow,
  Shield,
  History,
  Brain,
  Folder,
  Settings,
  Crown,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Agents", href: "/dashboard/agents", icon: Bot },
  { name: "Orchestrator", href: "/dashboard/orchestrator", icon: Workflow },
  { name: "Policies", href: "/dashboard/policies", icon: Shield },
  { name: "Audit & Replay", href: "/dashboard/audit", icon: History },
  { name: "Learning", href: "/dashboard/learning", icon: Brain },
  { name: "Projects", href: "/dashboard/projects", icon: Folder },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col h-screen">
      {/* Logo */}
      <div className="p-6 border-b border-zinc-800">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-fuchsia-500 flex items-center justify-center">
            <span className="text-xl font-bold">⚡</span>
          </div>
          <span className="font-bold text-xl text-zinc-100">Dracanus</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-cyan-500/10 text-cyan-400"
                  : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
              )}
            >
              <Icon className="w-5 h-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-zinc-800">
        <div className="flex items-center gap-2 text-xs text-zinc-500 mb-2">
          <Crown className="w-4 h-4" />
          <span>Free Plan</span>
        </div>
        <Link href="/dashboard/settings">
          <button className="w-full text-xs bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white px-3 py-2 rounded-lg hover:opacity-90 transition font-medium">
            Upgrade to Pro
          </button>
        </Link>
      </div>
    </div>
  );
}
