"use client";

import { useState } from "react";
import { formatPrice, formatLaunchType } from "@/lib/utils";
import type { SneakerDrop } from "@/lib/types";
import { Bell, Flame, Globe, Radio, RefreshCw, Zap } from "lucide-react";

const SAMPLE_DROPS: SneakerDrop[] = [
  {
    id: "drop-1",
    sku: "DM7866-140",
    styleCode: "DM7866-140",
    title: "Travis Scott x Air Jordan 1 Low OG",
    subtitle: "Reverse Mocha",
    colorway: "Sail / University Red / Ridgerock",
    imageUrl: "https://images.unsplash.com/photo-1552346154-21d32810aba3?w=800&auto=format&fit=crop&q=80",
    retailPrice: 5800,
    currency: "THB",
    estimatedResell: 38000,
    snkrsUrl: "https://www.nike.com/th/launch/t/travis-scott-aj1-low-reverse-mocha",
    region: "TH",
    launchType: "DAN",
    launchDate: new Date(Date.now() + 86400000 * 2).toISOString(),
    status: "UPCOMING",
    sizes: [
      { sizeUs: "7", inStock: true, stockLevel: "LOW" },
      { sizeUs: "8", inStock: true, stockLevel: "MEDIUM" },
      { sizeUs: "8.5", inStock: true, stockLevel: "HIGH" },
      { sizeUs: "9", inStock: true, stockLevel: "HIGH" },
      { sizeUs: "9.5", inStock: true, stockLevel: "HIGH" },
      { sizeUs: "10", inStock: true, stockLevel: "MEDIUM" },
      { sizeUs: "11", inStock: true, stockLevel: "LOW" },
    ],
  },
  {
    id: "drop-2",
    sku: "FQ3545-100",
    styleCode: "FQ3545-100",
    title: "Kobe 8 Protro",
    subtitle: "Halo / Triple White",
    colorway: "White / White / White",
    imageUrl: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&auto=format&fit=crop&q=80",
    retailPrice: 6500,
    currency: "THB",
    estimatedResell: 14500,
    snkrsUrl: "https://www.nike.com/th/launch/t/kobe-8-protro-halo",
    region: "TH",
    launchType: "LEO",
    launchDate: new Date(Date.now() + 86400000 * 4).toISOString(),
    status: "UPCOMING",
    sizes: [
      { sizeUs: "8", inStock: true, stockLevel: "HIGH" },
      { sizeUs: "9", inStock: true, stockLevel: "HIGH" },
      { sizeUs: "10", inStock: true, stockLevel: "HIGH" },
      { sizeUs: "11", inStock: true, stockLevel: "MEDIUM" },
    ],
  },
  {
    id: "drop-3",
    sku: "FD8777-001",
    styleCode: "FD8777-001",
    title: "Nike SB Dunk Low Pro",
    subtitle: "Tightbooth",
    colorway: "White / Black / Safety Orange",
    imageUrl: "https://images.unsplash.com/photo-1607522370275-f14206abe5d3?w=800&auto=format&fit=crop&q=80",
    retailPrice: 4700,
    currency: "THB",
    estimatedResell: 11000,
    snkrsUrl: "https://www.nike.com/th/launch/t/sb-dunk-low-tightbooth",
    region: "TH",
    launchType: "FCFS",
    launchDate: new Date(Date.now() - 3600000 * 2).toISOString(),
    status: "ACTIVE",
    sizes: [
      { sizeUs: "8.5", inStock: true, stockLevel: "LOW" },
      { sizeUs: "9", inStock: true, stockLevel: "LOW" },
      { sizeUs: "9.5", inStock: false, stockLevel: "OUT_OF_STOCK" },
      { sizeUs: "10", inStock: false, stockLevel: "OUT_OF_STOCK" },
    ],
  },
];

export default function HomePage() {
  const [region, setRegion] = useState<string>("TH");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [drops] = useState<SneakerDrop[]>(SAMPLE_DROPS);

  const filteredDrops = drops.filter((drop) => {
    if (region !== "ALL" && drop.region !== region) return false;
    if (statusFilter !== "ALL" && drop.status !== statusFilter) return false;
    return true;
  });

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-red-500 selection:text-white">
      {/* Header Bar */}
      <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 font-black text-xl">
              <Flame className="h-6 w-6 fill-red-500 text-red-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight">SNKRS Radar</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-400 border border-emerald-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live Monitor
                </span>
              </div>
              <p className="text-xs text-zinc-400">Automated Nike SNKRS Drop & Restock Engine</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Region Selector */}
            <div className="flex items-center rounded-lg border border-zinc-800 bg-zinc-900 p-1 text-xs">
              <button
                onClick={() => setRegion("TH")}
                className={`flex items-center gap-1 rounded px-2.5 py-1 font-medium transition ${
                  region === "TH" ? "bg-red-500 text-white shadow" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                🇹🇭 TH
              </button>
              <button
                onClick={() => setRegion("US")}
                className={`flex items-center gap-1 rounded px-2.5 py-1 font-medium transition ${
                  region === "US" ? "bg-red-500 text-white shadow" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                🇺🇸 US
              </button>
              <button
                onClick={() => setRegion("JP")}
                className={`flex items-center gap-1 rounded px-2.5 py-1 font-medium transition ${
                  region === "JP" ? "bg-red-500 text-white shadow" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                🇯🇵 JP
              </button>
            </div>

            <button
              onClick={() => alert("Webhook configured! Connect your Discord or Telegram in .env")}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 transition"
            >
              <Bell className="h-3.5 w-3.5" /> Webhooks
            </button>
          </div>
        </div>
      </header>

      {/* Hero Stats */}
      <section className="border-b border-zinc-900 bg-gradient-to-b from-zinc-900/40 to-transparent py-10 px-4 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Real-Time <span className="text-red-500">Nike SNKRS</span> Drop Radar
              </h1>
              <p className="mt-2 text-sm text-zinc-400 max-w-2xl">
                Tracking launch calendars, restock events, stock availability, and direct checkout queues across multiple Nike regions with automated Discord & Telegram webhooks.
              </p>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-3 w-full md:w-auto">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3.5 text-center min-w-[110px]">
                <div className="text-xl font-bold text-zinc-100">12</div>
                <div className="text-[11px] text-zinc-400">Upcoming Drops</div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3.5 text-center min-w-[110px]">
                <div className="text-xl font-bold text-emerald-400">15s</div>
                <div className="text-[11px] text-zinc-400">Poll Interval</div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3.5 text-center min-w-[110px]">
                <div className="text-xl font-bold text-purple-400">4 Regions</div>
                <div className="text-[11px] text-zinc-400">TH • US • JP • GB</div>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="mt-8 flex flex-wrap items-center gap-2">
            <button
              onClick={() => setStatusFilter("ALL")}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                statusFilter === "ALL" ? "bg-zinc-100 text-zinc-900" : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
              }`}
            >
              All Releases
            </button>
            <button
              onClick={() => setStatusFilter("UPCOMING")}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                statusFilter === "UPCOMING" ? "bg-zinc-100 text-zinc-900" : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
              }`}
            >
              Upcoming Launches
            </button>
            <button
              onClick={() => setStatusFilter("ACTIVE")}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                statusFilter === "ACTIVE" ? "bg-zinc-100 text-zinc-900" : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
              }`}
            >
              Live & Restocked
            </button>
          </div>
        </div>
      </section>

      {/* Drops Grid */}
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredDrops.map((drop) => {
            const launchTypeInfo = formatLaunchType(drop.launchType);
            const isLive = drop.status === "ACTIVE";

            return (
              <div
                key={drop.id}
                className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/50 hover:border-zinc-700 transition duration-200"
              >
                {/* Image Showcase */}
                <div className="relative aspect-4/3 w-full overflow-hidden bg-zinc-950">
                  <img
                    src={drop.imageUrl}
                    alt={drop.title}
                    className="h-full w-full object-cover object-center group-hover:scale-105 transition duration-300"
                  />
                  <div className="absolute top-3 left-3 flex gap-2">
                    <span className={`rounded-md border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider backdrop-blur-md ${launchTypeInfo.badgeClass}`}>
                      {launchTypeInfo.label}
                    </span>
                  </div>
                  <div className="absolute top-3 right-3">
                    <span className="rounded-md border border-zinc-700 bg-zinc-900/80 px-2 py-0.5 text-[11px] font-bold text-zinc-200 backdrop-blur-md">
                      {drop.region}
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span className="font-mono">{drop.styleCode}</span>
                    <span>{new Date(drop.launchDate).toLocaleDateString()}</span>
                  </div>

                  <h3 className="mt-2 text-lg font-bold text-zinc-100 line-clamp-1 group-hover:text-red-400 transition">
                    {drop.title}
                  </h3>
                  <p className="text-xs text-zinc-400 line-clamp-1">{drop.subtitle || drop.colorway}</p>

                  {/* Pricing and Resell Margin */}
                  <div className="mt-4 flex items-center justify-between rounded-xl bg-zinc-950/60 p-3 border border-zinc-800/60">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Retail Price</div>
                      <div className="text-sm font-bold text-zinc-200">{formatPrice(drop.retailPrice, drop.currency)}</div>
                    </div>
                    {drop.estimatedResell && (
                      <div className="text-right">
                        <div className="text-[10px] uppercase tracking-wider text-emerald-500 font-semibold">Est. Resale</div>
                        <div className="text-sm font-bold text-emerald-400">{formatPrice(drop.estimatedResell, drop.currency)}</div>
                      </div>
                    )}
                  </div>

                  {/* Size Stock Matrix */}
                  {drop.sizes && drop.sizes.length > 0 && (
                    <div className="mt-4">
                      <div className="text-[11px] font-semibold text-zinc-400 mb-1.5 flex items-center justify-between">
                        <span>Stock Levels</span>
                        <span className="text-[10px] text-zinc-500">US Sizes</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {drop.sizes.map((s) => (
                          <span
                            key={s.sizeUs}
                            className={`rounded px-1.5 py-0.5 text-[10px] font-mono font-semibold border ${
                              s.inStock
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : "bg-zinc-900 text-zinc-600 border-zinc-800 line-through"
                            }`}
                          >
                            {s.sizeUs}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Link */}
                  <div className="mt-auto pt-5">
                    <a
                      href={drop.snkrsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition shadow ${
                        isLive
                          ? "bg-red-500 text-white hover:bg-red-600 shadow-red-500/20"
                          : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                      }`}
                    >
                      <Zap className="h-3.5 w-3.5" />
                      {isLive ? "Enter Queue / Direct Checkout" : "View on SNKRS"}
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950 py-8 px-4 text-center text-xs text-zinc-500">
        <p>Nike SNKRS Drop Radar • Automated Multi-Region Scraper & Webhook Notification Engine</p>
        <p className="mt-1 text-[11px]">Independent open-source community tool. Not affiliated with Nike, Inc.</p>
      </footer>
    </main>
  );
}
