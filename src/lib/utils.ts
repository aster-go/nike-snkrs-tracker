import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(amount: number, currency: string = "THB"): string {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatLaunchType(type: string): { label: string; badgeClass: string; desc: string } {
  switch (type) {
    case "DAN":
      return {
        label: "DAN (Draw 10-15 Min)",
        badgeClass: "bg-red-500/10 text-red-500 border-red-500/20",
        desc: "Raffle draw open for 10-15 minutes.",
      };
    case "LEO":
      return {
        label: "LEO (Let Everyone Order)",
        badgeClass: "bg-amber-500/10 text-amber-500 border-amber-500/20",
        desc: "Mini-draw where first wave is randomized within 2-3 minutes.",
      };
    case "FCFS":
      return {
        label: "FCFS (First Come First Served)",
        badgeClass: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
        desc: "Instant checkout. Fastest queues secure sizes.",
      };
    case "EXCLUSIVE_ACCESS":
      return {
        label: "Exclusive Access (EA)",
        badgeClass: "bg-purple-500/10 text-purple-500 border-purple-500/20",
        desc: "Nike app member invite-only drops.",
      };
    default:
      return {
        label: type,
        badgeClass: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
        desc: "Standard release.",
      };
  }
}
