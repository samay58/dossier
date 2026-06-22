import { cn } from "@/lib/utils";

export function Panel({ className, children }: { className?: string; children: React.ReactNode }) {
  return <section className={cn("rounded-md border border-border bg-white p-5 shadow-soft", className)}>{children}</section>;
}

