import { Badge } from "@/components/ui/badge";
import { ASSET_TYPE_LABELS, ASSET_TYPE_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Zap, Terminal, Bot } from "lucide-react";

const ASSET_TYPE_ICONS: Record<string, React.ElementType> = {
  SKILL: Zap,
  COMMAND: Terminal,
  AGENT: Bot,
};

interface AssetTypeBadgeProps {
  type: string;
  className?: string;
}

export function AssetTypeBadge({ type, className }: AssetTypeBadgeProps) {
  const Icon = ASSET_TYPE_ICONS[type] ?? Zap;
  return (
    <Badge variant="outline" className={cn(ASSET_TYPE_COLORS[type], className)}>
      <Icon className="size-3 mr-1" />
      {ASSET_TYPE_LABELS[type] ?? type}
    </Badge>
  );
}
