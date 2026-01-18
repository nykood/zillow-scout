import { supabase } from "@/integrations/supabase/client";
import type { ZillowListing } from "@/types/listing";

interface ScrapeResponse {
  success: boolean;
  data?: ZillowListing;
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
