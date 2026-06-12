import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatPercent(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

export function daysAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return "Never";
  const days = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24)
  );
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

export const CHANNEL_ICONS: Record<string, string> = {
  whatsapp: "💬",
  sms: "📱",
  email: "📧",
  rcs: "🔷",
};

export const STATUS_COLORS: Record<string, string> = {
  draft: "bg-base-300 text-base-content/85 border border-base-content/10",
  scheduled: "bg-info/15 text-info border border-info/25",
  running: "bg-warning/15 text-warning border border-warning/25",
  completed: "bg-success/15 text-success border border-success/25",
  failed: "bg-error/15 text-error border border-error/25",
  pending: "bg-base-300 text-base-content/70 border border-base-content/10",
  sent: "bg-info/15 text-info border border-info/25",
  delivered: "bg-success/15 text-success border border-success/25",
  opened: "bg-primary/15 text-primary border border-primary/25",
  clicked: "bg-secondary/15 text-secondary border border-secondary/25",
};
