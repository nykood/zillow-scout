import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { ZillowListing } from "@/types/listing";

// Map database row to ZillowListing
function mapDbToListing(row: any): ZillowListing {
  return {
    id: row.id,
    url: row.url,
    address: row.address || "",
    price: row.price || "",
    priceNum: Number(row.price_num) || 0,
    beds: row.beds?.toString() || "",
    baths: row.baths?.toString() || "",
    sqft: row.sqft?.toString() || "",
    sqftNum: row.sqft || 0,
    propertyType: row.property_type || "",
    yearBuilt: row.year_built?.toString() || "",
    yearBuiltNum: row.year_built,
    lotSize: row.lot_size || "",
    zestimate: row.zestimate || "",
    description: row.description || "",
    status: row.status || "",
    scrapedAt: row.created_at || new Date().toISOString(),
    pricePerSqft: row.price_num && row.sqft ? `$${Math.round(Number(row.price_num) / row.sqft)}` : "",
    pricePerSqftNum: row.price_num && row.sqft ? Math.round(Number(row.price_num) / row.sqft) : 0,
    daysOnZillow: row.days_on_market?.toString() || "",
    daysOnMarket: row.days_on_market,
    hoaFee: row.hoa || "",
    parkingSpaces: row.garage_spots?.toString() || "",
    heating: "",
    cooling: "",
    neighborhood: row.neighborhood || "",
    schoolRating: "",
    hasGarage: row.has_garage,
    garageSpots: row.garage_spots,
    elementarySchoolRating: row.elementary_school_rating,
    middleSchoolRating: row.middle_school_rating,
    highSchoolRating: row.high_school_rating,
    imageUrl: row.thumbnail,
    commuteTime: row.am_commute_pessimistic,
    commuteTimeNoTraffic: row.pm_commute_pessimistic,
    commuteDistance: row.distance_miles ? `${row.distance_miles} mi` : undefined,
    priceCutAmount: row.price_cut_amount ? parseFloat(row.price_cut_amount) : undefined,
    priceCutPercent: row.price_cut_percentage ? parseFloat(row.price_cut_percentage) : undefined,
    priceCutDate: row.price_cut_date,
    walkScore: row.walk_score,
    bikeScore: row.bike_score,
    floodZone: row.flood_zone,
    // User ratings are now handled separately in useUserRatings
    userRating: null,
    userNotes: "",
  };
}

// Map ZillowListing to database row for insert/update
function mapListingToDb(listing: ZillowListing) {
  return {
    url: listing.url,
    address: listing.address,
    price: listing.price,
    price_num: listing.priceNum,
    beds: listing.beds ? parseInt(listing.beds) : null,
    baths: listing.baths ? parseFloat(listing.baths) : null,
    sqft: listing.sqftNum || null,
    lot_size: listing.lotSize,
    year_built: listing.yearBuiltNum || (listing.yearBuilt?.match(/\d{4}/) ? parseInt(listing.yearBuilt.match(/\d{4}/)![0]) : null),
    property_type: listing.propertyType,
    status: listing.status,
    days_on_market: listing.daysOnMarket,
    neighborhood: listing.neighborhood,
    garage_spots: listing.garageSpots,
    has_garage: listing.hasGarage,
    price_cut_amount: listing.priceCutAmount?.toString(),
    price_cut_percentage: listing.priceCutPercent?.toString(),
    price_cut_date: listing.priceCutDate,
    hoa: listing.hoaFee,
    zestimate: listing.zestimate,
    am_commute_pessimistic: listing.commuteTime,
    pm_commute_pessimistic: listing.commuteTimeNoTraffic,
    distance_miles: listing.commuteDistance ? parseFloat(listing.commuteDistance.replace(' mi', '')) : null,
    elementary_school_rating: listing.elementarySchoolRating,
    middle_school_rating: listing.middleSchoolRating,
    high_school_rating: listing.highSchoolRating,
    avg_school_rating: listing.elementarySchoolRating && listing.middleSchoolRating && listing.highSchoolRating
      ? (listing.elementarySchoolRating + listing.middleSchoolRating + listing.highSchoolRating) / 3
      : null,
    flood_zone: listing.floodZone,
    walk_score: listing.walkScore,
    bike_score: listing.bikeScore,
    description: listing.description,
    thumbnail: listing.imageUrl,
    // Rating and notes are now in user_ratings table
  };
}

export function useListings() {
  const [listings, setListings] = useState<ZillowListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Fetch all listings from database
  const fetchListings = useCallback(async () => {
    const { data, error } = await supabase
      .from("listings")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching listings:", error);
      toast({
        title: "Error loading listings",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setListings(data?.map(mapDbToListing) || []);
  }, [toast]);

  // Initial fetch and realtime subscription
  useEffect(() => {
    setIsLoading(true);
    fetchListings().finally(() => setIsLoading(false));

    // Subscribe to realtime changes
    const channel = supabase
      .channel('listings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'listings',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newListing = mapDbToListing(payload.new);
            setListings((prev) => {
              // Avoid duplicates if we already added it locally
              if (prev.some((l) => l.id === newListing.id)) return prev;
              return [newListing, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedListing = mapDbToListing(payload.new);
            setListings((prev) =>
              prev.map((l) => (l.id === updatedListing.id ? updatedListing : l))
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old.id;
            setListings((prev) => prev.filter((l) => l.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchListings]);

  // Add a new listing
  const addListing = useCallback(async (listing: ZillowListing): Promise<boolean> => {
    const dbRow = mapListingToDb(listing);
    
    const { data, error } = await supabase
      .from("listings")
      .insert(dbRow)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        toast({
          title: "Already exists",
          description: "This listing has already been added.",
          variant: "destructive",
        });
      } else {
        console.error("Error adding listing:", error);
        toast({
          title: "Error adding listing",
          description: error.message,
          variant: "destructive",
        });
      }
      return false;
    }

    setListings((prev) => [mapDbToListing(data), ...prev]);
    return true;
  }, [toast]);

  // Update a listing (public data only - ratings/notes are in user_ratings)
  const updateListing = useCallback(async (id: string, updates: Partial<ZillowListing>) => {
    // Build the database update object for public listing data only
    const dbUpdates: Record<string, any> = {};
    
    if (updates.price !== undefined) dbUpdates.price = updates.price;
    if (updates.priceNum !== undefined) dbUpdates.price_num = updates.priceNum;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.daysOnMarket !== undefined) dbUpdates.days_on_market = updates.daysOnMarket;
    
    // For full updates (refresh), map all fields
    if (Object.keys(updates).length > 4) {
      const fullUpdates = mapListingToDb(updates as ZillowListing);
      Object.assign(dbUpdates, fullUpdates);
    }

    const { error } = await supabase
      .from("listings")
      .update(dbUpdates)
      .eq("id", id);

    if (error) {
      console.error("Error updating listing:", error);
      toast({
        title: "Error updating listing",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }

    setListings((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...updates } : l))
    );
    return true;
  }, [toast]);

  // Remove a listing
  const removeListing = useCallback(async (id: string) => {
    const { error } = await supabase
      .from("listings")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error removing listing:", error);
      toast({
        title: "Error removing listing",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }

    setListings((prev) => prev.filter((l) => l.id !== id));
    return true;
  }, [toast]);

  // Bulk add listings (for seed/import)
  const bulkAddListings = useCallback(async (newListings: ZillowListing[]): Promise<number> => {
    const existingUrls = new Set(listings.map((l) => l.url));
    const toAdd = newListings.filter((l) => !existingUrls.has(l.url));

    if (toAdd.length === 0) return 0;

    const dbRows = toAdd.map(mapListingToDb);
    
    const { data, error } = await supabase
      .from("listings")
      .insert(dbRows)
      .select();

    if (error) {
      console.error("Error bulk adding listings:", error);
      toast({
        title: "Error adding listings",
        description: error.message,
        variant: "destructive",
      });
      return 0;
    }

    const addedListings = data?.map(mapDbToListing) || [];
    setListings((prev) => [...addedListings, ...prev]);
    return addedListings.length;
  }, [listings, toast]);

  // Replace a listing fully (for refresh) - preserving is no longer needed for ratings
  const replaceListing = useCallback(async (id: string, newListing: ZillowListing) => {
    const existingListing = listings.find((l) => l.id === id);
    if (!existingListing) return false;

    const dbRow = mapListingToDb(newListing);

    const { error } = await supabase
      .from("listings")
      .update(dbRow)
      .eq("id", id);

    if (error) {
      console.error("Error replacing listing:", error);
      return false;
    }

    setListings((prev) =>
      prev.map((l) => (l.id === id ? { ...newListing, id } : l))
    );
    return true;
  }, [listings]);

  return {
    listings,
    isLoading,
    addListing,
    updateListing,
    removeListing,
    bulkAddListings,
    replaceListing,
    refetch: fetchListings,
  };
}
