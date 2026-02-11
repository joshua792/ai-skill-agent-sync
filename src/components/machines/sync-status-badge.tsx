import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Check, AlertTriangle, Minus } from "lucide-react";

const STATUS_CONFIG = {
  up_to_date: {
    label: "Up to date",
    className: "bg-green-500/15 text-green-400 border-green-500/25",
    icon: Check,
  },
  outdated: {
    label: "Outdated",
    className: "bg-yellow-500/15 text-yellow-400 border-yellow-500/25",
    icon: AlertTriangle,
  },
  not_synced: {
    label: "Not synced",
    className: "bg-muted text-muted-foreground",
    icon: Minus,
  },
} as const;

interface SyncStatusBadgeProps {
  status: "up_to_date" | "outdated" | "not_synced";
  className?: string;
}

export function SyncStatusBadge({ status, className }: SyncStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      <Icon className="size-3 mr-1" />
      {config.label}
    </Badge>
  );
}
