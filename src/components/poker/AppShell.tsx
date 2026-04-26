import { ReactNode } from "react";

export const AppShell = ({ children }: { children: ReactNode }) => (
  <div
    className="min-h-screen text-foreground"
    style={{ background: "var(--gradient-felt)" }}
  >
    <div className="mx-auto w-full max-w-md px-4 py-6">{children}</div>
  </div>
);

export const PageHeader = ({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) => (
  <header className="mb-6 flex items-start justify-between gap-3">
    <div>
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
    </div>
    {right}
  </header>
);