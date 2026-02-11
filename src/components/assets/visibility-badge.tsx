import { Badge } from "@/components/ui/badge";
import { VISIBILITY_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Lock, Users, Globe } from "lucide-react";

const VISIBILITY_ICONS: Record<string, React.ElementType> = {
  PRIVATE: Lock,
  SHARED: Users,
  PUBLIC: Globe,
};

interface VisibilityBadgeProps {
  visibility: string;
  className?: string;
}

export function VisibilityBadge({ visibility, className }: VisibilityBadgeProps) {
  const Icon = VISIBILITY_ICONS[visibility] ?? Globe;
  return (
    <Badge variant="outline" className={cn(className)}>
      <Icon className="size-3 mr-1" />
      {VISIBILITY_LABELS[visibility] ?? visibility}
    </Badge>
  );
}
