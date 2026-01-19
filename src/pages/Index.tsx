import { useState, useMemo, useCallback, useEffect } from "react";
import { UrlInput } from "@/components/UrlInput";
import { PropertyRow } from "@/components/PropertyRow";
import { WeightsPanel } from "@/components/WeightsPanel";
import { FilterBar, SortOption, FilterOption, StatusFilterOption } from "@/components/FilterBar";
import { scrapeZillowListing, checkListingPrice, scrapeZillowList } from "@/lib/api";
import { calculateScore } from "@/lib/scoring";
import { useToast } from "@/hooks/use-toast";
import { Home, Sparkles, Bed, Bath, Ruler, Car, RefreshCw, Footprints, Bike, Droplets, GraduationCap, Warehouse, Clock, DollarSign, List } from "lucide-react";
import type { ZillowListing, ScoringWeights } from "@/types/listing";
import { DEFAULT_WEIGHTS } from "@/types/listing";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const STORAGE_KEY = "house-search-listings";
const WEIGHTS_STORAGE_KEY = "house-search-weights";

const Index = () => {
  const [listings, setListings] = useState<ZillowListing[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isScrapingList, setIsScrapingList] = useState(false);
  const [listProgress, setListProgress] = useState<{ current: number; total: number } | null>(null);
  const [refreshingPropertyId, setRefreshingPropertyId] = useState<string | null>(null);
  const [refreshProgress, setRefreshProgress] = useState<{ current: number; total: number } | null>(null);
  const [weights, setWeights] = useState<ScoringWeights>(() => {
    const saved = localStorage.getItem(WEIGHTS_STORAGE_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_WEIGHTS;
  });
  const [sortBy, setSortBy] = useState<SortOption>("score-desc");
  const [filterBy, setFilterBy] = useState<FilterOption>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilterOption>("all");
  const [minPricePerSqft, setMinPricePerSqft] = useState("");
  const [maxPricePerSqft, setMaxPricePerSqft] = useState("");
  const [listUrl, setListUrl] = useState("");
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

    // Apply rating filter
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

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((l) => l.status === statusFilter);
    }

    // Apply price per sqft filter
    const minPPS = minPricePerSqft ? parseInt(minPricePerSqft) : null;
    const maxPPS = maxPricePerSqft ? parseInt(maxPricePerSqft) : null;
    if (minPPS !== null || maxPPS !== null) {
      filtered = filtered.filter((l) => {
        const pps = l.pricePerSqftNum || (l.priceNum && l.sqftNum ? Math.round(l.priceNum / l.sqftNum) : 0);
        if (minPPS !== null && pps < minPPS) return false;
        if (maxPPS !== null && pps > maxPPS) return false;
        return true;
      });
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
        case "days-asc":
          return (a.daysOnMarket || 999) - (b.daysOnMarket || 999);
        case "date-desc":
          return new Date(b.scrapedAt).getTime() - new Date(a.scrapedAt).getTime();
        default:
          return 0;
      }
    });
  }, [scoredListings, sortBy, filterBy, statusFilter, minPricePerSqft, maxPricePerSqft]);

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

  // Status counts - use actual status values from listings
  const statusCounts = useMemo(() => {
    const counts: { [key: string]: number } = {};
    listings.forEach((l) => {
      if (l.status) {
        counts[l.status] = (counts[l.status] || 0) + 1;
      }
    });
    return counts;
  }, [listings]);

  const handleScrape = async (url: string) => {
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

  const handleScrapeList = async () => {
    if (!listUrl.trim()) {
      toast({ title: "Error", description: "Please enter a Zillow list URL", variant: "destructive" });
      return;
    }

    setIsScrapingList(true);
    try {
      const result = await scrapeZillowList(listUrl);

      if (result.success && result.urls && result.urls.length > 0) {
        const existingUrls = new Set(listings.map((l) => l.url.split("?")[0]));
        const newUrls = result.urls.filter((url) => !existingUrls.has(url.split("?")[0]));

        if (newUrls.length === 0) {
          toast({ title: "No new listings", description: "All listings in this list are already added." });
          setIsScrapingList(false);
          return;
        }

        toast({ title: "Found listings", description: `Scraping ${newUrls.length} new listings...` });
        setListProgress({ current: 0, total: newUrls.length });

        for (let i = 0; i < newUrls.length; i++) {
          setListProgress({ current: i + 1, total: newUrls.length });
          try {
            const scrapeResult = await scrapeZillowListing(newUrls[i]);
            if (scrapeResult.success && scrapeResult.data) {
              setListings((prev) => [scrapeResult.data!, ...prev]);
            }
          } catch (e) {
            console.error("Error scraping:", newUrls[i], e);
          }
          if (i < newUrls.length - 1) {
            await new Promise((r) => setTimeout(r, 1000));
          }
        }

        toast({ title: "Done!", description: `Added ${newUrls.length} listings from the list.` });
      } else {
        toast({ title: "No listings found", description: result.error || "Could not find property URLs in this list", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to scrape list", variant: "destructive" });
    } finally {
      setIsScrapingList(false);
      setListProgress(null);
      setListUrl("");
    }
  };

  const handleRemove = useCallback((id: string) => {
    setListings((prev) => prev.filter((l) => l.id !== id));
    toast({ title: "Removed", description: "Listing removed." });
  }, [toast]);

  const handleRatingChange = useCallback((id: string, rating: "yes" | "maybe" | "no" | null) => {
    setListings((prev) => prev.map((l) => (l.id === id ? { ...l, userRating: rating } : l)));
  }, []);

  const handleNotesChange = useCallback((id: string, notes: string) => {
    setListings((prev) => prev.map((l) => (l.id === id ? { ...l, userNotes: notes } : l)));
    toast({ title: "Notes saved", description: "Your notes have been saved." });
  }, [toast]);

  const handleRefreshSingle = useCallback(async (id: string) => {
    const listing = listings.find((l) => l.id === id);
    if (!listing) return;

    setRefreshingPropertyId(id);
    try {
      const result = await scrapeZillowListing(listing.url);
      if (result.success && result.data) {
        const updatedListing = { ...result.data, id: listing.id, userRating: listing.userRating, userNotes: listing.userNotes };
        setListings((prev) => prev.map((l) => (l.id === id ? updatedListing : l)));
        toast({ title: "Property refreshed", description: `Updated: ${result.data.address}` });
      } else {
        toast({ title: "Refresh failed", description: result.error || "Could not refresh listing data", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setRefreshingPropertyId(null);
    }
  }, [listings, toast]);

  const handleRefresh = async () => {
    if (listings.length === 0) return;
    setIsRefreshing(true);
    setRefreshProgress({ current: 0, total: listings.length });

    let updatedCount = 0;
    for (let i = 0; i < listings.length; i++) {
      const listing = listings[i];
      setRefreshProgress({ current: i + 1, total: listings.length });
      try {
        const priceResult = await checkListingPrice(listing.url);
        if (priceResult.success && priceResult.data && priceResult.data.priceNum !== listing.priceNum) {
          const fullResult = await scrapeZillowListing(listing.url);
          if (fullResult.success && fullResult.data) {
            const updatedListing = { ...fullResult.data, id: listing.id, userRating: listing.userRating, userNotes: listing.userNotes };
            setListings((prev) => prev.map((l) => (l.id === listing.id ? updatedListing : l)));
            updatedCount++;
          }
        }
      } catch (error) {
        console.error(`Error refreshing ${listing.address}:`, error);
      }
      if (i < listings.length - 1) await new Promise((r) => setTimeout(r, 500));
    }

    setIsRefreshing(false);
    setRefreshProgress(null);
    toast({ title: "Refresh complete", description: updatedCount > 0 ? `Updated ${updatedCount} listing(s).` : "All prices are up to date." });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Home className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold flex items-center gap-2">House Search <Sparkles className="h-4 w-4 text-primary" /></h1>
                <p className="text-sm text-muted-foreground">AI-powered property analysis</p>
              </div>
            </div>
            <WeightsPanel weights={weights} onWeightsChange={setWeights} />
          </div>
        </div>
      </header>

      <main className="container py-8">
        <div className="space-y-6">
          {/* List URL Input */}
          <section className="flex items-center gap-3">
            <div className="flex-1 flex items-center gap-2">
              <List className="h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Paste Zillow saved list URL..."
                value={listUrl}
                onChange={(e) => setListUrl(e.target.value)}
                disabled={isScrapingList}
              />
            </div>
            <Button onClick={handleScrapeList} disabled={isScrapingList || !listUrl.trim()} variant="outline">
              {isScrapingList && listProgress ? `Scraping ${listProgress.current}/${listProgress.total}` : "Scrape List"}
            </Button>
          </section>

          {/* Single URL Input */}
          <section className="flex items-center gap-3">
            <div className="flex-1">
              <UrlInput onSubmit={handleScrape} isLoading={isLoading} />
            </div>
            {listings.length > 0 && (
              <Button onClick={handleRefresh} disabled={isRefreshing || isLoading} variant="outline" className="flex items-center gap-2">
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                {isRefreshing && refreshProgress ? `Checking ${refreshProgress.current}/${refreshProgress.total}` : "Refresh Prices"}
              </Button>
            )}
          </section>

          {/* Filter Bar */}
          {listings.length > 0 && (
            <section>
              <FilterBar
                sortBy={sortBy}
                filterBy={filterBy}
                statusFilter={statusFilter}
                minPricePerSqft={minPricePerSqft}
                maxPricePerSqft={maxPricePerSqft}
                onSortChange={setSortBy}
                onFilterChange={setFilterBy}
                onStatusFilterChange={setStatusFilter}
                onMinPricePerSqftChange={setMinPricePerSqft}
                onMaxPricePerSqftChange={setMaxPricePerSqft}
                counts={counts}
                statusCounts={statusCounts}
              />
            </section>
          )}

          {/* Listings Table */}
          <section>
            {displayedListings.length > 0 ? (
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <div className="flex items-center gap-3 p-3 bg-muted/50 border-b text-xs font-medium text-muted-foreground min-w-[1700px]">
                    <div className="w-12 flex-shrink-0 text-center">Score</div>
                    <div className="w-[180px] flex-shrink-0">Address</div>
                    <div className="w-[100px] flex-shrink-0">Status</div>
                    <div className="w-[50px] flex-shrink-0 text-center flex items-center gap-1"><Clock className="h-3 w-3" /> Days</div>
                    <div className="w-24 text-right flex-shrink-0">Price</div>
                    <div className="w-[60px] flex-shrink-0 text-center flex items-center gap-1"><DollarSign className="h-3 w-3" />/sqft</div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="w-14 flex items-center gap-1"><Bed className="h-3 w-3" /> Beds</span>
                      <span className="w-14 flex items-center gap-1"><Bath className="h-3 w-3" /> Baths</span>
                      <span className="w-20 flex items-center gap-1"><Ruler className="h-3 w-3" /> Sqft</span>
                      <span className="w-16 flex items-center gap-1"><Warehouse className="h-3 w-3" /> Gar</span>
                      <span className="w-20 flex items-center gap-1"><Car className="h-3 w-3" /> Comm</span>
                      <span className="w-10 flex items-center gap-1" title="Elementary School"><GraduationCap className="h-3 w-3" /> E</span>
                      <span className="w-10 flex items-center gap-1" title="Middle School"><GraduationCap className="h-3 w-3" /> M</span>
                      <span className="w-10 flex items-center gap-1" title="High School"><GraduationCap className="h-3 w-3" /> H</span>
                      <span className="w-14 flex items-center gap-1"><Footprints className="h-3 w-3" /> Walk</span>
                      <span className="w-14 flex items-center gap-1"><Bike className="h-3 w-3" /> Bike</span>
                      <span className="w-24 flex items-center gap-1"><Droplets className="h-3 w-3" /> Flood</span>
                    </div>
                    <div className="w-[84px] flex-shrink-0 text-center">Rating</div>
                    <div className="w-[100px] flex-shrink-0 text-center">Actions</div>
                  </div>
                  <div>
                    {displayedListings.map((listing) => (
                      <PropertyRow
                        key={listing.id}
                        listing={listing}
                        onRemove={() => handleRemove(listing.id)}
                        onRatingChange={(rating) => handleRatingChange(listing.id, rating)}
                        onNotesChange={(notes) => handleNotesChange(listing.id, notes)}
                        onRefresh={() => handleRefreshSingle(listing.id)}
                        isRefreshing={refreshingPropertyId === listing.id}
                      />
                    ))}
                  </div>
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
                <p className="text-sm mt-1">Paste a Zillow URL above to get started</p>
              </div>
            )}
          </section>
        </div>
      </main>

      <footer className="border-t border-border/50 py-6 mt-auto">
        <div className="container text-center text-sm text-muted-foreground">
          AI analyzes listings for quality ratings • Customize scoring weights to match your preferences
        </div>
      </footer>
    </div>
  );
};

export default Index;
