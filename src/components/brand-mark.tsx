import { CalendarDays } from "lucide-react";

import { cn } from "@/lib/utils";

export function BrandMark({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
        <CalendarDays className="size-5" />
      </span>
      {compact ? null : (
        <span className="font-heading text-lg font-semibold tracking-tight">
          Agenda Legal
        </span>
      )}
    </div>
  );
}
