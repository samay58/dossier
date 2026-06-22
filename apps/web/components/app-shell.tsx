import Link from "next/link";
import { Film, FileText, LayoutDashboard, Search, Settings } from "lucide-react";

const navItems = [
  { href: "/discover", label: "Discover", icon: Search },
  { href: "/candidates", label: "Candidates", icon: LayoutDashboard },
  { href: "/requests", label: "Requests", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-[#FFFEFA]">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
          <Link href="/discover" className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Film aria-hidden="true" />
            </span>
            <span className="font-serif text-xl font-semibold">Dossier</span>
          </Link>
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <item.icon aria-hidden="true" />
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-5 py-6">{children}</main>
    </div>
  );
}
