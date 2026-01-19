import { useState, useMemo, useCallback, useEffect } from "react";
import { UrlInput } from "@/components/UrlInput";
import { PropertyRow } from "@/components/PropertyRow";
import { WeightsPanel } from "@/components/WeightsPanel";
import { SortableHeader } from "@/components/SortableHeader";
import { FilterBar, SortOption, FilterOption, StatusFilterOption, FloodRiskFilterOption } from "@/components/FilterBar";
import { scrapeZillowListing, checkListingPrice } from "@/lib/api";
import { calculateScore } from "@/lib/scoring";
import { useToast } from "@/hooks/use-toast";
import { Home, Sparkles, Bed, Bath, Ruler, Car, RefreshCw, Footprints, Bike, Droplets, GraduationCap, Warehouse, Clock, DollarSign, Navigation, Download, Upload } from "lucide-react";
import type { ZillowListing, ScoringWeights } from "@/types/listing";
import { DEFAULT_WEIGHTS } from "@/types/listing";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import seedListings from "@/data/seedListings.json";

const STORAGE_KEY = "house-search-listings";
const WEIGHTS_STORAGE_KEY = "house-search-weights";

const Index = () => {
  const [listings, setListings] = useState<ZillowListing[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.length > 0) return parsed;
    }
    // Fall back to seed data if localStorage is empty
    return seedListings as ZillowListing[];
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

    // Helper to get flood risk numeric value for sorting
    const getFloodRiskValue = (zone: string | undefined): number => {
      const risk = getFloodRiskLevel(zone);
      const values: Record<string, number> = {
        'low': 1,
        'moderate': 2,
        'high': 3,
        'coastal-high': 4,
        'undetermined': 0,
      };
      return values[risk] || 0;
    };

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
        case "sqft-asc":
          return a.sqftNum - b.sqftNum;
        case "days-asc":
          return (a.daysOnMarket || 999) - (b.daysOnMarket || 999);
        case "days-desc":
          return (b.daysOnMarket || 0) - (a.daysOnMarket || 0);
        case "date-desc":
          return new Date(b.scrapedAt).getTime() - new Date(a.scrapedAt).getTime();
        case "address-asc":
          return a.address.localeCompare(b.address);
        case "address-desc":
          return b.address.localeCompare(a.address);
        case "status-asc":
          return (a.status || "").localeCompare(b.status || "");
        case "status-desc":
          return (b.status || "").localeCompare(a.status || "");
        case "beds-asc":
          return parseInt(a.beds) - parseInt(b.beds);
        case "beds-desc":
          return parseInt(b.beds) - parseInt(a.beds);
        case "baths-asc":
          return parseFloat(a.baths) - parseFloat(b.baths);
        case "baths-desc":
          return parseFloat(b.baths) - parseFloat(a.baths);
        case "cut-asc":
          return (a.priceCutAmount || 0) - (b.priceCutAmount || 0);
        case "cut-desc":
          return (b.priceCutAmount || 0) - (a.priceCutAmount || 0);
        case "ppsqft-asc":
          return (a.pricePerSqftNum || 0) - (b.pricePerSqftNum || 0);
        case "ppsqft-desc":
          return (b.pricePerSqftNum || 0) - (a.pricePerSqftNum || 0);
        case "garage-asc":
          return (a.garageSpots || 0) - (b.garageSpots || 0);
        case "garage-desc":
          return (b.garageSpots || 0) - (a.garageSpots || 0);
        case "commute-asc":
          return (a.commuteTime || 999) - (b.commuteTime || 999);
        case "commute-desc":
          return (b.commuteTime || 0) - (a.commuteTime || 0);
        case "elem-asc":
          return (a.elementarySchoolRating || 0) - (b.elementarySchoolRating || 0);
        case "elem-desc":
          return (b.elementarySchoolRating || 0) - (a.elementarySchoolRating || 0);
        case "middle-asc":
          return (a.middleSchoolRating || 0) - (b.middleSchoolRating || 0);
        case "middle-desc":
          return (b.middleSchoolRating || 0) - (a.middleSchoolRating || 0);
        case "high-asc":
          return (a.highSchoolRating || 0) - (b.highSchoolRating || 0);
        case "high-desc":
          return (b.highSchoolRating || 0) - (a.highSchoolRating || 0);
        case "walk-asc":
          return (a.walkScore || 0) - (b.walkScore || 0);
        case "walk-desc":
          return (b.walkScore || 0) - (a.walkScore || 0);
        case "bike-asc":
          return (a.bikeScore || 0) - (b.bikeScore || 0);
        case "bike-desc":
          return (b.bikeScore || 0) - (a.bikeScore || 0);
        case "flood-asc":
          return getFloodRiskValue(a.floodZone) - getFloodRiskValue(b.floodZone);
        case "flood-desc":
          return getFloodRiskValue(b.floodZone) - getFloodRiskValue(a.floodZone);
        case "neighborhood-asc":
          return (a.neighborhood || "").localeCompare(b.neighborhood || "");
        case "neighborhood-desc":
          return (b.neighborhood || "").localeCompare(a.neighborhood || "");
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

  // Export listings as JSON for seed file
  const handleExportListings = useCallback(() => {
    const dataStr = JSON.stringify(listings, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'seedListings.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({
      title: "Exported",
      description: `Downloaded ${listings.length} listings. Replace src/data/seedListings.json with this file.`,
    });
  }, [listings, toast]);

  // Import listings from JSON file
  const handleImportListings = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const imported = JSON.parse(content) as ZillowListing[];
        
        if (!Array.isArray(imported)) {
          throw new Error('Invalid format: expected an array');
        }

        // Merge imported listings with existing ones (avoid duplicates by URL)
        const existingUrls = new Set(listings.map(l => l.url));
        const newListings = imported.filter(l => !existingUrls.has(l.url));
        const duplicateCount = imported.length - newListings.length;

        if (newListings.length > 0) {
          setListings(prev => [...prev, ...newListings]);
          toast({
            title: "Imported",
            description: `Added ${newListings.length} new listings.${duplicateCount > 0 ? ` ${duplicateCount} duplicates skipped.` : ''}`,
          });
        } else {
          toast({
            title: "No new listings",
            description: "All listings in the file already exist.",
          });
        }
      } catch (error) {
        toast({
          title: "Import failed",
          description: "Invalid JSON file format.",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
    // Reset input so the same file can be imported again
    event.target.value = '';
  }, [listings, toast]);

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

      <main className="px-4 py-8 max-w-[98vw] mx-auto">
        <div className="space-y-6">
          {/* Single URL Input */}
          <section className="flex items-center gap-3">
            <div className="flex-1">
              <UrlInput onSubmit={handleScrape} isLoading={isLoading} />
            </div>
            {listings.length > 0 && (
              <div className="flex items-center gap-2">
                <Button onClick={handleExportListings} variant="outline" className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Export
                </Button>
                <label>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportListings}
                    className="hidden"
                  />
                  <Button variant="outline" className="flex items-center gap-2" asChild>
                    <span>
                      <Upload className="h-4 w-4" />
                      Import
                    </span>
                  </Button>
                </label>
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
                    <SortableHeader
                      label="Score"
                      sortKeyAsc="score-asc"
                      sortKeyDesc="score-desc"
                      currentSort={sortBy}
                      onSort={setSortBy}
                      className="w-9 justify-center"
                    />
                    <SortableHeader
                      label="Address"
                      sortKeyAsc="address-asc"
                      sortKeyDesc="address-desc"
                      currentSort={sortBy}
                      onSort={setSortBy}
                      className="w-[220px]"
                    />
                    <SortableHeader
                      label="Status"
                      sortKeyAsc="status-asc"
                      sortKeyDesc="status-desc"
                      currentSort={sortBy}
                      onSort={setSortBy}
                      className="w-[75px]"
                    />
                    <SortableHeader
                      label="Days"
                      sortKeyAsc="days-asc"
                      sortKeyDesc="days-desc"
                      currentSort={sortBy}
                      onSort={setSortBy}
                      className="w-[50px] justify-center"
                      icon={<Clock className="h-3 w-3" />}
                    />
                    <SortableHeader
                      label="Price"
                      sortKeyAsc="price-asc"
                      sortKeyDesc="price-desc"
                      currentSort={sortBy}
                      onSort={setSortBy}
                      className="w-24 justify-end"
                    />
                    <SortableHeader
                      label="Cut"
                      sortKeyAsc="cut-asc"
                      sortKeyDesc="cut-desc"
                      currentSort={sortBy}
                      onSort={setSortBy}
                      className="w-[65px] justify-center"
                    />
                    <SortableHeader
                      label="/sqft"
                      sortKeyAsc="ppsqft-asc"
                      sortKeyDesc="ppsqft-desc"
                      currentSort={sortBy}
                      onSort={setSortBy}
                      className="w-[60px] justify-center"
                      icon={<DollarSign className="h-3 w-3" />}
                    />
                    <SortableHeader
                      label="Beds"
                      sortKeyAsc="beds-asc"
                      sortKeyDesc="beds-desc"
                      currentSort={sortBy}
                      onSort={setSortBy}
                      className="w-14"
                      icon={<Bed className="h-3 w-3" />}
                    />
                    <SortableHeader
                      label="Baths"
                      sortKeyAsc="baths-asc"
                      sortKeyDesc="baths-desc"
                      currentSort={sortBy}
                      onSort={setSortBy}
                      className="w-14"
                      icon={<Bath className="h-3 w-3" />}
                    />
                    <SortableHeader
                      label="Sqft"
                      sortKeyAsc="sqft-asc"
                      sortKeyDesc="sqft-desc"
                      currentSort={sortBy}
                      onSort={setSortBy}
                      className="w-20"
                      icon={<Ruler className="h-3 w-3" />}
                    />
                    <SortableHeader
                      label="Garage"
                      sortKeyAsc="garage-asc"
                      sortKeyDesc="garage-desc"
                      currentSort={sortBy}
                      onSort={setSortBy}
                      className="w-16"
                      icon={<Warehouse className="h-3 w-3" />}
                    />
                    <div className="w-20 flex-shrink-0 flex items-center gap-1" title="Commute AM (6:30am)">
                      <Car className="h-3 w-3" />
                      <span>AM</span>
                    </div>
                    <div className="w-20 flex-shrink-0 flex items-center gap-1" title="Commute PM (5pm)">
                      <Car className="h-3 w-3" />
                      <span>PM</span>
                    </div>
                    <SortableHeader
                      label="Dist"
                      sortKeyAsc="commute-asc"
                      sortKeyDesc="commute-desc"
                      currentSort={sortBy}
                      onSort={setSortBy}
                      className="w-16"
                      icon={<Navigation className="h-3 w-3" />}
                      title="Distance to MUSC"
                    />
                    <SortableHeader
                      label="E"
                      sortKeyAsc="elem-asc"
                      sortKeyDesc="elem-desc"
                      currentSort={sortBy}
                      onSort={setSortBy}
                      className="w-10"
                      icon={<GraduationCap className="h-3 w-3" />}
                      title="Elementary School Rating"
                    />
                    <SortableHeader
                      label="M"
                      sortKeyAsc="middle-asc"
                      sortKeyDesc="middle-desc"
                      currentSort={sortBy}
                      onSort={setSortBy}
                      className="w-10"
                      icon={<GraduationCap className="h-3 w-3" />}
                      title="Middle School Rating"
                    />
                    <SortableHeader
                      label="H"
                      sortKeyAsc="high-asc"
                      sortKeyDesc="high-desc"
                      currentSort={sortBy}
                      onSort={setSortBy}
                      className="w-10"
                      icon={<GraduationCap className="h-3 w-3" />}
                      title="High School Rating"
                    />
                    <SortableHeader
                      label="Walk"
                      sortKeyAsc="walk-asc"
                      sortKeyDesc="walk-desc"
                      currentSort={sortBy}
                      onSort={setSortBy}
                      className="w-14"
                      icon={<Footprints className="h-3 w-3" />}
                    />
                    <SortableHeader
                      label="Bike"
                      sortKeyAsc="bike-asc"
                      sortKeyDesc="bike-desc"
                      currentSort={sortBy}
                      onSort={setSortBy}
                      className="w-14"
                      icon={<Bike className="h-3 w-3" />}
                    />
                    <SortableHeader
                      label="Flood"
                      sortKeyAsc="flood-asc"
                      sortKeyDesc="flood-desc"
                      currentSort={sortBy}
                      onSort={setSortBy}
                      className="w-24"
                      icon={<Droplets className="h-3 w-3" />}
                    />
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
