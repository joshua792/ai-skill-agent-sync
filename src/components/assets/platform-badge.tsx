import { Badge } from "@/components/ui/badge";
import { PLATFORM_LABELS } from "@/lib/constants";

interface PlatformBadgeProps {
  platform: string;
  className?: string;
}

export function PlatformBadge({ platform, className }: PlatformBadgeProps) {
  return (
    <Badge variant="secondary" className={className}>
      {PLATFORM_LABELS[platform] ?? platform}
    </Badge>
  );
}
