import axios from "axios";
import type { SneakerDrop, SizeAvailability } from "../types";

export interface NikeThreadItem {
  id: string;
  productInfo: Array<{
    merchProduct: {
      id: string;
      styleColor: string;
      labelName: string;
      commercialStartDate: string;
      publishType: string;
      status: string;
      price: {
        msrp: number;
        currency: string;
      };
    };
    imageUrls: {
      productImageUrl: string;
    };
    skus: Array<{
      id: string;
      nikeSize: string;
      available: boolean;
    }>;
    availableSkus: Array<{
      id: string;
      available: boolean;
      level: string;
    }>;
  }>;
  publishedContent: {
    properties: {
      seo: {
        slug: string;
      };
      coverCard: {
        title: string;
        subtitle: string;
        description: string;
      };
      products: Array<{
        styleColor: string;
      }>;
    };
  };
}

export const REGION_CONFIGS: Record<string, { country: string; language: string; currency: string; baseUrl: string }> = {
  TH: {
    country: "TH",
    language: "th",
    currency: "THB",
    baseUrl: "https://www.nike.com/th/launch/t/",
  },
  US: {
    country: "US",
    language: "en",
    currency: "USD",
    baseUrl: "https://www.nike.com/launch/t/",
  },
  JP: {
    country: "JP",
    language: "ja",
    currency: "JPY",
    baseUrl: "https://www.nike.com/jp/launch/t/",
  },
  GB: {
    country: "GB",
    language: "en-GB",
    currency: "GBP",
    baseUrl: "https://www.nike.com/gb/launch/t/",
  },
};

export async function fetchNikeSnkrsFeed(region: string = "TH"): Promise<SneakerDrop[]> {
  const config = REGION_CONFIGS[region] || REGION_CONFIGS.TH;
  const endpoint = `https://api.nike.com/product_feed/threads/v2/?filter=marketplace(${config.country})&filter=language(${config.language})&filter=channelId(010794e5-35e8-432d-88b9-528574345229)&fields=active,id,lastFetchTime,productInfo,publishedContent.nodes,publishedContent.properties.coverCard,publishedContent.properties.products,publishedContent.properties.seo,publishedContent.properties.subtitle,publishedContent.properties.title`;

  try {
    const response = await axios.get(endpoint, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
        "Accept": "application/json",
        "Origin": "https://www.nike.com",
        "Referer": "https://www.nike.com/",
      },
      timeout: 10000,
    });

    const objects = response.data?.objects || [];
    const drops: SneakerDrop[] = [];

    for (const item of objects) {
      const product = item.productInfo?.[0];
      const content = item.publishedContent?.properties;
      if (!product || !content) continue;

      const merch = product.merchProduct;
      const slug = content.seo?.slug || merch.styleColor;
      const title = content.coverCard?.title || content.title || merch.labelName;
      const subtitle = content.coverCard?.subtitle || content.subtitle || "";
      const price = merch.price?.msrp || 0;
      const launchDate = merch.commercialStartDate || new Date().toISOString();

      let launchType: "FCFS" | "LEO" | "DAN" | "EXCLUSIVE_ACCESS" = "LEO";
      if (merch.publishType === "DAN" || merch.publishType === "DRAW") launchType = "DAN";
      else if (merch.publishType === "FLOW") launchType = "FCFS";

      const sizes: SizeAvailability[] = (product.skus || []).map((sku: { id: string; nikeSize: string; available: boolean }) => {
        const availableInfo = product.availableSkus?.find((a: { id: string }) => a.id === sku.id);
        const inStock = !!availableInfo?.available;
        const level = (availableInfo?.level as "HIGH" | "MEDIUM" | "LOW" | "OUT_OF_STOCK") || (inStock ? "HIGH" : "OUT_OF_STOCK");
        return {
          sizeUs: sku.nikeSize,
          inStock: inStock,
          stockLevel: level,
        };
      });

      drops.push({
        id: item.id,
        sku: merch.id || merch.styleColor,
        styleCode: merch.styleColor,
        title: title,
        subtitle: subtitle,
        description: content.coverCard?.description || "",
        colorway: merch.labelName,
        imageUrl: product.imageUrls?.productImageUrl || "https://images.unsplash.com/photo-1552346154-21d32810aba3?w=800&auto=format&fit=crop&q=80",
        retailPrice: price,
        currency: merch.price?.currency || config.currency,
        snkrsUrl: `${config.baseUrl}${slug}`,
        region: region,
        launchType: launchType,
        launchDate: launchDate,
        status: new Date(launchDate) > new Date() ? "UPCOMING" : sizes.some(s => s.inStock) ? "ACTIVE" : "SOLD_OUT",
        sizes: sizes,
      });
    }

    return drops;
  } catch (error) {
    console.error(`[NikeScraper] Error fetching feed for region ${region}:`, error);
    return [];
  }
}
