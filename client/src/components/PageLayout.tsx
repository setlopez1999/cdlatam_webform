import type { ReactNode } from "react";

interface PageLayoutProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  maxWidth?: "4xl" | "5xl" | "6xl" | "full";
}

export function PageLayout({
  title,
  subtitle,
  icon,
  actions,
  children,
  maxWidth = "5xl",
}: PageLayoutProps) {
  const maxWClass = maxWidth === "full" ? "" : `max-w-${maxWidth} mx-auto`;

  return (
    <div className={`p-6 ${maxWClass} space-y-6`}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            {icon}
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2" translate="no">{actions}</div>}
      </div>
      <div translate="no">{children}</div>
    </div>
  );
}
