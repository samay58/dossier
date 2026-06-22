import { cn } from "@/lib/utils";

type BadgeProps = {
  children: React.ReactNode;
  tone?: "neutral" | "good" | "warn" | "danger" | "info";
  className?: string;
};

const toneClass = {
  neutral: "bg-muted text-muted-foreground",
  good: "bg-[#E2F0E8] text-[#24543B]",
  warn: "bg-[#F4E7D7] text-[#80512D]",
  danger: "bg-[#F0DDDA] text-[#8A312F]",
  info: "bg-[#DFE8EE] text-[#264B63]"
};

export function Badge({ children, tone = "neutral", className }: BadgeProps) {
  return (
    <span className={cn("inline-flex h-7 items-center gap-1 rounded-sm px-2 text-xs font-medium [&>svg]:size-3", toneClass[tone], className)}>
      {children}
    </span>
  );
}
