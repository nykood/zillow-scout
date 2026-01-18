import { useState, useMemo, useCallback, useEffect } from "react";
import { UrlInput } from "@/components/UrlInput";
import { PropertyRow } from "@/components/PropertyRow";
import { WeightsPanel } from "@/components/WeightsPanel";
import { FilterBar, SortOption, FilterOption } from "@/components/FilterBar";
import { scrapeZillowListing, checkListingPrice } from "@/lib/api";
import { calculateScore } from "@/lib/scoring";
import { useToast } from "@/hooks/use-toast";
import { Home, Sparkles, Bed, Bath, Ruler, Calendar, Car, RefreshCw, Footprints, Bike, Droplets, MapPin } from "lucide-react";
import type { ZillowListing, ScoringWeights } from "@/types/listing";
import { DEFAULT_WEIGHTS } from "@/types/listing";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "house-search-listings";
const WEIGHTS_STORAGE_KEY = "house-search-weights";

const Index = () => {
  const [listings, setListings] = useState<ZillowListing[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshProgress, setRefreshProgress] = useState<{ current: number; total: number } | null>(null);
  const [weights, setWeights] = useState<ScoringWeights>(() => {
    const saved = localStorage.getItem(WEIGHTS_STORAGE_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_WEIGHTS;
  });
  const [sortBy, setSortBy] = useState<SortOption>("score-desc");
  const [filterBy, setFilterBy] = useState<FilterOption>("all");
  const { toast } = useToast();

  // Persist listings to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(listings));
  }, [listings]);

  // Persist weights to localStorage
  useEffect(() => {
    localStorage.setItem(WEIGHTS_STORAGE_KEY, JSON.stringify(weights));
  }, [weights]);

  // Calculate scores whenever listings or weights change
  const scoredListings = useMemo(() => {
    return listings.map((listing) => ({
      ...listing,
      totalScore: calculateScore(listing, listings, weights),
    }));
  }, [listings, weights]);

  // Filter and sort listings
  const displayedListings = useMemo(() => {
    let filtered = scoredListings;

    // Apply filter
    switch (filterBy) {
      case "yes":
        filtered = filtered.filter((l) => l.userRating === "yes");
        break;
      case "maybe":
        filtered = filtered.filter((l) => l.userRating === "maybe");
        break;
      case "no":
        filtered = filtered.filter((l) => l.userRating === "no");
        break;
      case "unrated":
        filtered = filtered.filter((l) => !l.userRating);
        break;
    }

    // Apply sort
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case "score-desc":
          return (b.totalScore || 0) - (a.totalScore || 0);
        case "score-asc":
          return (a.totalScore || 0) - (b.totalScore || 0);
        case "price-asc":
          return a.priceNum - b.priceNum;
        case "price-desc":
          return b.priceNum - a.priceNum;
        case "sqft-desc":
          return b.sqftNum - a.sqftNum;
        case "date-desc":
          return new Date(b.scrapedAt).getTime() - new Date(a.scrapedAt).getTime();
        default:
          return 0;
      }
    });
  }, [scoredListings, sortBy, filterBy]);

  // Count statistics
  const counts = useMemo(
    () => ({
      total: listings.length,
      yes: listings.filter((l) => l.userRating === "yes").length,
      maybe: listings.filter((l) => l.userRating === "maybe").length,
      no: listings.filter((l) => l.userRating === "no").length,
      unrated: listings.filter((l) => !l.userRating).length,
    }),
    [listings]
  );

  const handleScrape = async (url: string) => {
    // Check if already scraped
    if (listings.some((l) => l.url === url)) {
      toast({
        title: "Already scraped",
        description: "This listing has already been added.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await scrapeZillowListing(url);

      if (result.success && result.data) {
        setListings((prev) => [result.data!, ...prev]);
        toast({
          title: "Success!",
          description: `Scraped: ${result.data.address}`,
        });
      } else {
        toast({
          title: "Scraping failed",
          description: result.error || "Could not extract listing data",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = useCallback((id: string) => {
    setListings((prev) => prev.filter((l) => l.id !== id));
    toast({
      title: "Removed",
      description: "Listing removed.",
    });
  }, [toast]);

  const handleRatingChange = useCallback(
    (id: string, rating: "yes" | "maybe" | "no" | null) => {
      setListings((prev) =>
        prev.map((l) => (l.id === id ? { ...l, userRating: rating } : l))
      );
    },
    []
  );

  const handleNotesChange = useCallback((id: string, notes: string) => {
    setListings((prev) =>
      prev.map((l) => (l.id === id ? { ...l, userNotes: notes } : l))
    );
    toast({
      title: "Notes saved",
      description: "Your notes have been saved.",
    });
  }, [toast]);

  const handleRefresh = async () => {
    if (listings.length === 0) return;
    
    setIsRefreshing(true);
    setRefreshProgress({ current: 0, total: listings.length });
    
    let updatedCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < listings.length; i++) {
      const listing = listings[i];
      setRefreshProgress({ current: i + 1, total: listings.length });
      
      try {
        // Check current price
        const priceResult = await checkListingPrice(listing.url);
        
        if (priceResult.success && priceResult.data) {
          const currentPriceNum = priceResult.data.priceNum;
          
          // Compare prices - if different, re-scrape the entire listing
          if (currentPriceNum !== listing.priceNum) {
            console.log(`Price changed for ${listing.address}: ${listing.price} -> ${priceResult.data.price}`);
            
            // Re-scrape the full listing
            const fullResult = await scrapeZillowListing(listing.url);
            
            if (fullResult.success && fullResult.data) {
              // Preserve user-specific data
              const updatedListing = {
                ...fullResult.data,
                id: listing.id, // Keep the same ID
                userRating: listing.userRating,
                userNotes: listing.userNotes,
              };
              
              setListings((prev) =>
                prev.map((l) => (l.id === listing.id ? updatedListing : l))
              );
              updatedCount++;
            }
          }
        }
      } catch (error) {
        console.error(`Error refreshing ${listing.address}:`, error);
        errorCount++;
      }
      
      // Small delay between requests to avoid rate limiting
      if (i < listings.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
    
    setIsRefreshing(false);
    setRefreshProgress(null);
    
    if (updatedCount > 0) {
      toast({
        title: "Refresh complete",
        description: `Updated ${updatedCount} listing${updatedCount > 1 ? 's' : ''} with new prices.`,
      });
    } else if (errorCount > 0) {
      toast({
        title: "Refresh complete",
        description: `No price changes detected. ${errorCount} error${errorCount > 1 ? 's' : ''} occurred.`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Refresh complete",
        description: "All prices are up to date.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Home className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold flex items-center gap-2">
                  House Search
                  <Sparkles className="h-4 w-4 text-primary" />
                </h1>
                <p className="text-sm text-muted-foreground">
                  AI-powered property analysis
                </p>
              </div>
            </div>
            <WeightsPanel weights={weights} onWeightsChange={setWeights} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        <div className="space-y-6">
          {/* Input Section */}
          <section className="flex items-center gap-3">
            <div className="flex-1">
              <UrlInput onSubmit={handleScrape} isLoading={isLoading} />
            </div>
            {listings.length > 0 && (
              <Button
                onClick={handleRefresh}
                disabled={isRefreshing || isLoading}
                variant="outline"
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing && refreshProgress
                  ? `Checking ${refreshProgress.current}/${refreshProgress.total}`
                  : 'Refresh Prices'}
              </Button>
            )}
          </section>

          {/* Filter Bar */}
          {listings.length > 0 && (
            <section>
              <FilterBar
                sortBy={sortBy}
                filterBy={filterBy}
                onSortChange={setSortBy}
                onFilterChange={setFilterBy}
                counts={counts}
              />
            </section>
          )}

          {/* Listings Table */}
          <section>
            {displayedListings.length > 0 ? (
              <Card className="overflow-hidden">
                {/* Table Header */}
                <div className="flex items-center gap-3 p-3 bg-muted/50 border-b text-xs font-medium text-muted-foreground">
                  <div className="w-12 flex-shrink-0 text-center">Score</div>
                  <div className="min-w-0 flex-1 max-w-[250px]">Address</div>
                  <div className="w-28 text-right flex-shrink-0">Price</div>
                  <div className="hidden md:flex items-center gap-3 flex-shrink-0">
                    <span className="w-14 flex items-center gap-1"><Bed className="h-3 w-3" /> Beds</span>
                    <span className="w-14 flex items-center gap-1"><Bath className="h-3 w-3" /> Baths</span>
                    <span className="w-20 flex items-center gap-1"><Ruler className="h-3 w-3" /> Sqft</span>
                    <span className="hidden lg:flex w-28 items-center gap-1"><Car className="h-3 w-3" /> Commute</span>
                    <span className="hidden xl:flex w-24 items-center gap-1"><MapPin className="h-3 w-3" /> Neighborhood</span>
                    <span className="hidden xl:flex w-14 items-center gap-1"><Footprints className="h-3 w-3" /> Walk</span>
                    <span className="hidden xl:flex w-14 items-center gap-1"><Bike className="h-3 w-3" /> Bike</span>
                    <span className="hidden xl:flex w-24 items-center gap-1"><Droplets className="h-3 w-3" /> Flood</span>
                  </div>
                  <div className="hidden sm:block w-[84px] flex-shrink-0 text-center">Rating</div>
                  <div className="w-[72px] flex-shrink-0 text-center">Actions</div>
                </div>

                {/* Table Rows */}
                <div>
                  {displayedListings.map((listing) => (
                    <PropertyRow
                      key={listing.id}
                      listing={listing}
                      onRemove={() => handleRemove(listing.id)}
                      onRatingChange={(rating) =>
                        handleRatingChange(listing.id, rating)
                      }
                      onNotesChange={(notes) =>
                        handleNotesChange(listing.id, notes)
                      }
                    />
                  ))}
                </div>
              </Card>
            ) : listings.length > 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <p className="text-lg">No listings match this filter</p>
                <p className="text-sm mt-1">Try a different filter or add more listings</p>
              </div>
            ) : (
              <div className="text-center py-16 text-muted-foreground">
                <Home className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p className="text-lg">No listings yet</p>
                <p className="text-sm mt-1">
                  Paste a Zillow URL above to get started
                </p>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-6 mt-auto">
        <div className="container text-center text-sm text-muted-foreground">
          AI analyzes listings for quality ratings • Customize scoring weights
          to match your preferences
        </div>
      </footer>
    </div>
  );
};

export default Index;
