import { supabase } from "@/integrations/supabase/client";
import type { ZillowListing } from "@/types/listing";

interface ScrapeResponse {
  success: boolean;
  data?: ZillowListing;
  error?: string;
}

interface PriceCheckResponse {
  success: boolean;
  data?: {
    price: string;
    priceNum: number;
  };
  error?: string;
}

interface ScrapeListResponse {
  success: boolean;
  urls?: string[];
  error?: string;
}

export async function scrapeZillowListing(url: string): Promise<ScrapeResponse> {
  const { data, error } = await supabase.functions.invoke('scrape-zillow', {
    body: { url },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return data;
}

export async function checkListingPrice(url: string): Promise<PriceCheckResponse> {
  const { data, error } = await supabase.functions.invoke('check-price', {
    body: { url },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return data;
}

export async function scrapeZillowList(url: string): Promise<ScrapeListResponse> {
  const { data, error } = await supabase.functions.invoke('scrape-zillow-list', {
    body: { url },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return data;
}
