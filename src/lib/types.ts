export type LaunchType = "FCFS" | "LEO" | "DAN" | "EXCLUSIVE_ACCESS";
export type DropStatus = "UPCOMING" | "ACTIVE" | "SOLD_OUT" | "RESTOCKED";
export type RegionCode = "TH" | "US" | "JP" | "GB" | "EU";

export interface SneakerDrop {
  id: string;
  sku: string;
  styleCode: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  colorway?: string | null;
  imageUrl: string;
  galleryUrls?: string[] | null;
  retailPrice: number;
  currency: string;
  estimatedResell?: number | null;
  snkrsUrl: string;
  region: RegionCode | string;
  launchType: LaunchType | string;
  launchDate: string | Date;
  status: DropStatus | string;
  sizes?: SizeAvailability[];
}

export interface SizeAvailability {
  sizeUs: string;
  sizeEu?: string | null;
  sizeUk?: string | null;
  inStock: boolean;
  stockLevel: "HIGH" | "MEDIUM" | "LOW" | "OUT_OF_STOCK";
}

export interface WebhookPayload {
  sneaker: SneakerDrop;
  event: "NEW_DROP_LOADED" | "RESTOCK_DETECTED" | "DROP_LIVE_NOW";
  restockedSizes?: string[];
}
