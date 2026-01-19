import { useState, useMemo, useCallback, useEffect } from "react";
import { UrlInput } from "@/components/UrlInput";
import { PropertyRow } from "@/components/PropertyRow";
import { WeightsPanel } from "@/components/WeightsPanel";
import { FilterBar, SortOption, FilterOption, StatusFilterOption, FloodRiskFilterOption } from "@/components/FilterBar";
import { scrapeZillowListing, checkListingPrice } from "@/lib/api";
import { calculateScore } from "@/lib/scoring";
import { useToast } from "@/hooks/use-toast";
import { Home, Sparkles, Bed, Bath, Ruler, Car, RefreshCw, Footprints, Bike, Droplets, GraduationCap, Warehouse, Clock, DollarSign, Navigation } from "lucide-react";
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
  const [refreshingPropertyId, setRefreshingPropertyId] = useState<string | null>(null);
  const [refreshProgress, setRefreshProgress] = useState<{ current: number; total: number } | null>(null);
  const [weights, setWeights] = useState<ScoringWeights>(() => {
    const saved = localStorage.getItem(WEIGHTS_STORAGE_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_WEIGHTS;
  });
  const [sortBy, setSortBy] = useState<SortOption>("score-desc");
  const [filterBy, setFilterBy] = useState<FilterOption>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilterOption>("all");
  const [floodRiskFilter, setFloodRiskFilter] = useState<FloodRiskFilterOption>("all");
  const [minPricePerSqft, setMinPricePerSqft] = useState("");
  const [maxPricePerSqft, setMaxPricePerSqft] = useState("");
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

  // Helper function to parse flood zone risk level
  const getFloodRiskLevel = (zone: string | undefined): string => {
    if (!zone || zone === 'N/A') return 'undetermined';
    const zoneUpper = zone.toUpperCase();
    
    const zoneMatch = zone.match(/Zone\s*([A-Z]+\d*)/i);
    const zoneCode = zoneMatch ? zoneMatch[1].toUpperCase() : null;
    
    if (zoneCode) {
      if (zoneCode === 'V' || zoneCode === 'VE') return 'coastal-high';
      if (['A', 'AE', 'AH', 'AO', 'AR', 'A99'].includes(zoneCode)) return 'high';
      if (['X', 'C', 'D'].includes(zoneCode)) {
        if (zoneUpper.includes('SHADED') && !zoneUpper.includes('UNSHADED')) return 'moderate';
        return 'low';
      }
      if (zoneCode === 'B') return 'moderate';
    }
    
    if (zoneUpper.includes('MINIMAL') || zoneUpper.includes('LOW RISK')) return 'low';
    if (zoneUpper.includes('MINOR') || zoneUpper.includes('MODERATE')) return 'moderate';
    if (zoneUpper.includes('MAJOR') || zoneUpper.includes('SEVERE') || zoneUpper.includes('EXTREME') || zoneUpper.includes('HIGH RISK')) return 'high';
    if (zoneUpper.includes('COASTAL')) return 'coastal-high';
    
    return 'undetermined';
  };

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

    // Apply flood risk filter
    if (floodRiskFilter !== "all") {
      filtered = filtered.filter((l) => getFloodRiskLevel(l.floodZone) === floodRiskFilter);
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
  }, [scoredListings, sortBy, filterBy, statusFilter, floodRiskFilter, minPricePerSqft, maxPricePerSqft]);

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

  // Flood risk counts
  const floodRiskCounts = useMemo(() => {
    const counts: { [key: string]: number } = {};
    listings.forEach((l) => {
      const riskLevel = getFloodRiskLevel(l.floodZone);
      counts[riskLevel] = (counts[riskLevel] || 0) + 1;
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

  const handleRefreshAll = async () => {
    if (listings.length === 0) return;
    setIsRefreshing(true);
    setRefreshProgress({ current: 0, total: listings.length });

    let updatedCount = 0;
    let failedCount = 0;
    for (let i = 0; i < listings.length; i++) {
      const listing = listings[i];
      setRefreshProgress({ current: i + 1, total: listings.length });
      try {
        const result = await scrapeZillowListing(listing.url);
        if (result.success && result.data) {
          const updatedListing = { ...result.data, id: listing.id, userRating: listing.userRating, userNotes: listing.userNotes };
          setListings((prev) => prev.map((l) => (l.id === listing.id ? updatedListing : l)));
          updatedCount++;
        } else {
          failedCount++;
        }
      } catch (error) {
        console.error(`Error refreshing ${listing.address}:`, error);
        failedCount++;
      }
      // Wait between requests to avoid rate limiting
      if (i < listings.length - 1) await new Promise((r) => setTimeout(r, 1500));
    }

    setIsRefreshing(false);
    setRefreshProgress(null);
    toast({ 
      title: "Refresh All complete", 
      description: failedCount > 0 
        ? `Updated ${updatedCount} listing(s). ${failedCount} failed.` 
        : `Successfully updated all ${updatedCount} listing(s).`
    });
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
                <p className="text-sm text-muted-foreground">Property analysis tool</p>
              </div>
            </div>
            <WeightsPanel weights={weights} onWeightsChange={setWeights} />
          </div>
        </div>
      </header>

      <main className="container py-8">
        <div className="space-y-6">
          {/* Single URL Input */}
          <section className="flex items-center gap-3">
            <div className="flex-1">
              <UrlInput onSubmit={handleScrape} isLoading={isLoading} />
            </div>
            {listings.length > 0 && (
              <div className="flex items-center gap-2">
                <Button onClick={handleRefresh} disabled={isRefreshing || isLoading} variant="outline" className="flex items-center gap-2">
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                  {isRefreshing && refreshProgress ? `${refreshProgress.current}/${refreshProgress.total}` : "Refresh Prices"}
                </Button>
                <Button onClick={handleRefreshAll} disabled={isRefreshing || isLoading} variant="secondary" className="flex items-center gap-2">
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                  {isRefreshing && refreshProgress ? `${refreshProgress.current}/${refreshProgress.total}` : "Refresh All"}
                </Button>
              </div>
            )}
          </section>

          {/* Filter Bar */}
          {listings.length > 0 && (
            <section>
              <FilterBar
                sortBy={sortBy}
                filterBy={filterBy}
                statusFilter={statusFilter}
                floodRiskFilter={floodRiskFilter}
                minPricePerSqft={minPricePerSqft}
                maxPricePerSqft={maxPricePerSqft}
                onSortChange={setSortBy}
                onFilterChange={setFilterBy}
                onStatusFilterChange={setStatusFilter}
                onFloodRiskFilterChange={setFloodRiskFilter}
                onMinPricePerSqftChange={setMinPricePerSqft}
                onMaxPricePerSqftChange={setMaxPricePerSqft}
                counts={counts}
                statusCounts={statusCounts}
                floodRiskCounts={floodRiskCounts}
              />
            </section>
          )}

          {/* Listings Table */}
          <section>
            {displayedListings.length > 0 ? (
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <div className="flex items-center gap-3 p-3 bg-muted/50 border-b text-xs font-medium text-muted-foreground min-w-[1900px]">
                    <div className="w-[84px] flex-shrink-0 text-center">Rating</div>
                    <div className="w-[120px] flex-shrink-0 text-center">Actions</div>
                    <div className="w-9 flex-shrink-0 text-center">Score</div>
                    <div className="w-[220px] flex-shrink-0">Address</div>
                    <div className="w-[85px] flex-shrink-0">Status</div>
                    <div className="w-[50px] flex-shrink-0 text-center flex items-center gap-1"><Clock className="h-3 w-3" /> Days</div>
                    <div className="w-24 text-right flex-shrink-0">Price</div>
                    <div className="w-[80px] flex-shrink-0 text-center">Cut</div>
                    <div className="w-[60px] flex-shrink-0 text-center flex items-center gap-1"><DollarSign className="h-3 w-3" />/sqft</div>
                    <div className="w-14 flex-shrink-0 flex items-center gap-1"><Bed className="h-3 w-3" /> Beds</div>
                    <div className="w-14 flex-shrink-0 flex items-center gap-1"><Bath className="h-3 w-3" /> Baths</div>
                    <div className="w-20 flex-shrink-0 flex items-center gap-1"><Ruler className="h-3 w-3" /> Sqft</div>
                    <div className="w-16 flex-shrink-0 flex items-center gap-1"><Warehouse className="h-3 w-3" /> Garage</div>
                    <div className="w-28 flex-shrink-0 flex items-center gap-1"><Car className="h-3 w-3" /><Navigation className="h-3 w-3" /> Commute</div>
                    <div className="w-10 flex-shrink-0 flex items-center gap-1" title="Elementary School"><GraduationCap className="h-3 w-3" /> E</div>
                    <div className="w-10 flex-shrink-0 flex items-center gap-1" title="Middle School"><GraduationCap className="h-3 w-3" /> M</div>
                    <div className="w-10 flex-shrink-0 flex items-center gap-1" title="High School"><GraduationCap className="h-3 w-3" /> H</div>
                    <div className="w-14 flex-shrink-0 flex items-center gap-1"><Footprints className="h-3 w-3" /> Walk</div>
                    <div className="w-14 flex-shrink-0 flex items-center gap-1"><Bike className="h-3 w-3" /> Bike</div>
                    <div className="w-24 flex-shrink-0 flex items-center gap-1"><Droplets className="h-3 w-3" /> Flood</div>
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
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">No listings match your current filters.</p>
              </Card>
            ) : (
              <Card className="p-12 text-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Home className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold mb-1">No listings yet</h2>
                    <p className="text-muted-foreground">Paste a Zillow listing URL above to get started!</p>
                  </div>
                </div>
              </Card>
            )}
          </section>
        </div>
      </main>

      <footer className="border-t border-border/50 py-6 mt-12">
        <div className="container text-center text-sm text-muted-foreground">
          <p>House Search — Property analysis tool</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
