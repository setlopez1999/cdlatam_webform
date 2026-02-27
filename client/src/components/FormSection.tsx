import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

interface FormSectionProps {
  title: string;
  icon?: React.ElementType;
  children: React.ReactNode;
  className?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
  badge?: string;
  accent?: "indigo" | "violet" | "emerald" | "amber";
}

const accentMap = {
  indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
  violet: "bg-violet-50 text-violet-600 border-violet-100",
  emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
  amber: "bg-amber-50 text-amber-600 border-amber-100",
};

const iconAccentMap = {
  indigo: "bg-indigo-50 text-indigo-600",
  violet: "bg-violet-50 text-violet-600",
  emerald: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
};

export function FormSection({
  title,
  icon: Icon,
  children,
  className,
  collapsible = false,
  defaultOpen = true,
  badge,
  accent = "indigo",
}: FormSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={cn("bg-card border border-border rounded-xl overflow-hidden shadow-sm", className)}>
      <div
        className={cn(
          "flex items-center justify-between px-5 py-4 border-b border-border",
          collapsible && "cursor-pointer hover:bg-muted/30 transition-colors"
        )}
        onClick={collapsible ? () => setOpen(!open) : undefined}
      >
        <div className="flex items-center gap-3">
          {Icon && (
            <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", iconAccentMap[accent])}>
              <Icon className="w-3.5 h-3.5" />
            </div>
          )}
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {badge && (
            <span className={cn("text-xs font-mono px-2 py-0.5 rounded-full border font-medium", accentMap[accent])}>
              {badge}
            </span>
          )}
        </div>
        {collapsible && (
          <div className="text-muted-foreground">
            {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </div>
        )}
      </div>
      {(!collapsible || open) && (
        <div className="p-5">
          {children}
        </div>
      )}
    </div>
  );
}

interface FieldGroupProps {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}

export function FieldGroup({ label, required, error, hint, children, className }: FieldGroupProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label className="block text-xs font-medium text-foreground/80">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: string;
  actions?: React.ReactNode;
  icon?: React.ElementType;
}

export function PageHeader({ title, subtitle, badge, badgeColor = "bg-indigo-50 text-indigo-700 border-indigo-200", actions, icon: Icon }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <Icon className="w-5 h-5 text-primary" />
          </div>
        )}
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-foreground">{title}</h1>
            {badge && (
              <span className={cn("text-xs font-mono px-2 py-0.5 rounded-full border font-semibold", badgeColor)}>
                {badge}
              </span>
            )}
          </div>
          {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
