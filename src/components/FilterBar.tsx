import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown, Filter, X, DollarSign, Droplets, Bed, Ruler, Car, Navigation, GraduationCap, Calendar } from "lucide-react";

export type SortOption =
  | "score-desc"
  | "score-asc"
  | "price-asc"
  | "price-desc"
  | "sqft-desc"
  | "sqft-asc"
  | "date-desc"
  | "days-asc"
  | "days-desc"
  | "address-asc"
  | "address-desc"
  | "status-asc"
  | "status-desc"
  | "beds-asc"
  | "beds-desc"
  | "baths-asc"
  | "baths-desc"
  | "cut-desc"
  | "cut-asc"
  | "ppsqft-asc"
  | "ppsqft-desc"
  | "garage-asc"
  | "garage-desc"
  | "commute-asc"
  | "commute-desc"
  | "elem-asc"
  | "elem-desc"
  | "middle-asc"
  | "middle-desc"
  | "high-asc"
  | "high-desc"
  | "walk-asc"
  | "walk-desc"
  | "bike-asc"
  | "bike-desc"
  | "flood-asc"
  | "flood-desc"
  | "neighborhood-asc"
  | "neighborhood-desc";

export type FilterOption = "all" | "yes" | "maybe" | "no" | "unrated";

export type StatusFilterOption = string;

export type FloodRiskFilterOption = "all" | "low" | "moderate" | "high" | "coastal-high" | "undetermined";

interface FilterBarProps {
  sortBy: SortOption;
  filterBy: FilterOption;
  statusFilter: StatusFilterOption;
  floodRiskFilter: FloodRiskFilterOption;
  minPrice: string;
  maxPrice: string;
  minYearBuilt: string;
  maxYearBuilt: string;
  minPricePerSqft: string;
  maxPricePerSqft: string;
  minBeds: string;
  maxBeds: string;
  minSqft: string;
  maxSqft: string;
  maxCommuteAM: string;
  maxCommutePM: string;
  maxDistance: string;
  minElemSchool: string;
  minMiddleSchool: string;
  minHighSchool: string;
  onSortChange: (sort: SortOption) => void;
  onFilterChange: (filter: FilterOption) => void;
  onStatusFilterChange: (status: StatusFilterOption) => void;
  onFloodRiskFilterChange: (floodRisk: FloodRiskFilterOption) => void;
  onMinPriceChange: (value: string) => void;
  onMaxPriceChange: (value: string) => void;
  onMinYearBuiltChange: (value: string) => void;
  onMaxYearBuiltChange: (value: string) => void;
  onMinPricePerSqftChange: (value: string) => void;
  onMaxPricePerSqftChange: (value: string) => void;
  onMinBedsChange: (value: string) => void;
  onMaxBedsChange: (value: string) => void;
  onMinSqftChange: (value: string) => void;
  onMaxSqftChange: (value: string) => void;
  onMaxCommuteAMChange: (value: string) => void;
  onMaxCommutePMChange: (value: string) => void;
  onMaxDistanceChange: (value: string) => void;
  onMinElemSchoolChange: (value: string) => void;
  onMinMiddleSchoolChange: (value: string) => void;
  onMinHighSchoolChange: (value: string) => void;
  counts: {
    total: number;
    yes: number;
    maybe: number;
    no: number;
    unrated: number;
  };
  statusCounts: {
    [key: string]: number;
  };
  floodRiskCounts: {
    [key: string]: number;
  };
}

export function FilterBar({
  sortBy,
  filterBy,
  statusFilter,
  floodRiskFilter,
  minPrice,
  maxPrice,
  minYearBuilt,
  maxYearBuilt,
  minPricePerSqft,
  maxPricePerSqft,
  minBeds,
  maxBeds,
  minSqft,
  maxSqft,
  maxCommuteAM,
  maxCommutePM,
  maxDistance,
  minElemSchool,
  minMiddleSchool,
  minHighSchool,
  onSortChange,
  onFilterChange,
  onStatusFilterChange,
  onFloodRiskFilterChange,
  onMinPriceChange,
  onMaxPriceChange,
  onMinYearBuiltChange,
  onMaxYearBuiltChange,
  onMinPricePerSqftChange,
  onMaxPricePerSqftChange,
  onMinBedsChange,
  onMaxBedsChange,
  onMinSqftChange,
  onMaxSqftChange,
  onMaxCommuteAMChange,
  onMaxCommutePMChange,
  onMaxDistanceChange,
  onMinElemSchoolChange,
  onMinMiddleSchoolChange,
  onMinHighSchoolChange,
  counts,
  statusCounts,
  floodRiskCounts,
}: FilterBarProps) {
  const hasActiveFilters = filterBy !== "all" || statusFilter !== "all" || floodRiskFilter !== "all" || 
    minPrice || maxPrice || minYearBuilt || maxYearBuilt ||
    minPricePerSqft || maxPricePerSqft || minBeds || maxBeds || minSqft || maxSqft || 
    maxCommuteAM || maxCommutePM || maxDistance || minElemSchool || minMiddleSchool || minHighSchool;

  const clearAllFilters = () => {
    onFilterChange("all");
    onStatusFilterChange("all");
    onFloodRiskFilterChange("all");
    onMinPriceChange("");
    onMaxPriceChange("");
    onMinYearBuiltChange("");
    onMaxYearBuiltChange("");
    onMinPricePerSqftChange("");
    onMaxPricePerSqftChange("");
    onMinBedsChange("");
    onMaxBedsChange("");
    onMinSqftChange("");
    onMaxSqftChange("");
    onMaxCommuteAMChange("");
    onMaxCommutePMChange("");
    onMaxDistanceChange("");
    onMinElemSchoolChange("");
    onMinMiddleSchoolChange("");
    onMinHighSchoolChange("");
  };

  return (
    <div className="space-y-2">
      {/* Row 1: Sort, Status, Flood, Rating */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Sort */}
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          <Select value={sortBy} onValueChange={(v) => onSortChange(v as SortOption)}>
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="score-desc">Score (High → Low)</SelectItem>
              <SelectItem value="score-asc">Score (Low → High)</SelectItem>
              <SelectItem value="price-asc">Price (Low → High)</SelectItem>
              <SelectItem value="price-desc">Price (High → Low)</SelectItem>
              <SelectItem value="sqft-desc">Size (Largest)</SelectItem>
              <SelectItem value="days-asc">Days on Market</SelectItem>
              <SelectItem value="date-desc">Newest First</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={(v) => onStatusFilterChange(v as StatusFilterOption)}>
            <SelectTrigger className="w-[180px] h-9">
              <SelectValue placeholder="Status..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status ({counts.total})</SelectItem>
              {Object.entries(statusCounts)
                .filter(([status]) => status && status !== "undefined")
                .sort((a, b) => b[1] - a[1])
                .map(([status, count]) => (
                  <SelectItem key={status} value={status}>
                    {status} ({count})
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        {/* Flood Risk Filter */}
        <div className="flex items-center gap-2">
          <Droplets className="h-4 w-4 text-muted-foreground" />
          <Select value={floodRiskFilter} onValueChange={(v) => onFloodRiskFilterChange(v as FloodRiskFilterOption)}>
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue placeholder="Flood Risk..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Flood Risk ({counts.total})</SelectItem>
              <SelectItem value="low">Low ({floodRiskCounts['low'] || 0})</SelectItem>
              <SelectItem value="moderate">Moderate ({floodRiskCounts['moderate'] || 0})</SelectItem>
              <SelectItem value="high">High ({floodRiskCounts['high'] || 0})</SelectItem>
              <SelectItem value="coastal-high">Coastal High ({floodRiskCounts['coastal-high'] || 0})</SelectItem>
              <SelectItem value="undetermined">Undetermined ({floodRiskCounts['undetermined'] || 0})</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Rating Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <div className="flex items-center gap-1">
            <Button
              variant={filterBy === "all" ? "default" : "outline"}
              size="sm"
              className="h-8"
              onClick={() => onFilterChange("all")}
            >
              All
              <Badge variant="secondary" className="ml-1.5 h-5 px-1.5">
                {counts.total}
              </Badge>
            </Button>
            <Button
              variant={filterBy === "yes" ? "default" : "outline"}
              size="sm"
              className="h-8"
              onClick={() => onFilterChange("yes")}
            >
              Yes
              <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 bg-green-500/20 text-green-600">
                {counts.yes}
              </Badge>
            </Button>
            <Button
              variant={filterBy === "maybe" ? "default" : "outline"}
              size="sm"
              className="h-8"
              onClick={() => onFilterChange("maybe")}
            >
              Maybe
              <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 bg-yellow-500/20 text-yellow-600">
                {counts.maybe}
              </Badge>
            </Button>
            <Button
              variant={filterBy === "no" ? "default" : "outline"}
              size="sm"
              className="h-8"
              onClick={() => onFilterChange("no")}
            >
              No
              <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 bg-red-500/20 text-red-600">
                {counts.no}
              </Badge>
            </Button>
            <Button
              variant={filterBy === "unrated" ? "default" : "outline"}
              size="sm"
              className="h-8"
              onClick={() => onFilterChange("unrated")}
            >
              Unrated
              <Badge variant="secondary" className="ml-1.5 h-5 px-1.5">
                {counts.unrated}
              </Badge>
            </Button>
          </div>
        </div>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1"
            onClick={clearAllFilters}
          >
            <X className="h-3 w-3" />
            Clear
          </Button>
        )}
      </div>

      {/* Row 2: Numeric range filters */}
      <div className="flex flex-wrap items-center gap-3 text-xs">
        {/* Price in M */}
        <div className="flex items-center gap-1">
          <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">M:</span>
          <Input
            type="number"
            step="0.1"
            placeholder="Min"
            value={minPrice}
            onChange={(e) => onMinPriceChange(e.target.value)}
            className="w-14 h-7 text-xs"
          />
          <span className="text-muted-foreground">-</span>
          <Input
            type="number"
            step="0.1"
            placeholder="Max"
            value={maxPrice}
            onChange={(e) => onMaxPriceChange(e.target.value)}
            className="w-14 h-7 text-xs"
          />
        </div>

        {/* Year Built */}
        <div className="flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <Input
            type="number"
            placeholder="Min"
            value={minYearBuilt}
            onChange={(e) => onMinYearBuiltChange(e.target.value)}
            className="w-16 h-7 text-xs"
          />
          <span className="text-muted-foreground">-</span>
          <Input
            type="number"
            placeholder="Max"
            value={maxYearBuilt}
            onChange={(e) => onMaxYearBuiltChange(e.target.value)}
            className="w-16 h-7 text-xs"
          />
        </div>

        {/* Beds */}
        <div className="flex items-center gap-1">
          <Bed className="h-3.5 w-3.5 text-muted-foreground" />
          <Input
            type="number"
            placeholder="Min"
            value={minBeds}
            onChange={(e) => onMinBedsChange(e.target.value)}
            className="w-14 h-7 text-xs"
          />
          <span className="text-muted-foreground">-</span>
          <Input
            type="number"
            placeholder="Max"
            value={maxBeds}
            onChange={(e) => onMaxBedsChange(e.target.value)}
            className="w-14 h-7 text-xs"
          />
        </div>

        {/* Sqft */}
        <div className="flex items-center gap-1">
          <Ruler className="h-3.5 w-3.5 text-muted-foreground" />
          <Input
            type="number"
            placeholder="Min"
            value={minSqft}
            onChange={(e) => onMinSqftChange(e.target.value)}
            className="w-16 h-7 text-xs"
          />
          <span className="text-muted-foreground">-</span>
          <Input
            type="number"
            placeholder="Max"
            value={maxSqft}
            onChange={(e) => onMaxSqftChange(e.target.value)}
            className="w-16 h-7 text-xs"
          />
        </div>

        {/* Price per sqft */}
        <div className="flex items-center gap-1">
          <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">/sqft:</span>
          <Input
            type="number"
            placeholder="Min"
            value={minPricePerSqft}
            onChange={(e) => onMinPricePerSqftChange(e.target.value)}
            className="w-16 h-7 text-xs"
          />
          <span className="text-muted-foreground">-</span>
          <Input
            type="number"
            placeholder="Max"
            value={maxPricePerSqft}
            onChange={(e) => onMaxPricePerSqftChange(e.target.value)}
            className="w-16 h-7 text-xs"
          />
        </div>

        {/* Commute AM */}
        <div className="flex items-center gap-1">
          <Car className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">AM≤</span>
          <Input
            type="number"
            placeholder="max"
            value={maxCommuteAM}
            onChange={(e) => onMaxCommuteAMChange(e.target.value)}
            className="w-14 h-7 text-xs"
          />
          <span className="text-muted-foreground">min</span>
        </div>

        {/* Commute PM */}
        <div className="flex items-center gap-1">
          <Car className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">PM≤</span>
          <Input
            type="number"
            placeholder="max"
            value={maxCommutePM}
            onChange={(e) => onMaxCommutePMChange(e.target.value)}
            className="w-14 h-7 text-xs"
          />
          <span className="text-muted-foreground">min</span>
        </div>

        {/* Distance */}
        <div className="flex items-center gap-1">
          <Navigation className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">≤</span>
          <Input
            type="number"
            placeholder="max"
            value={maxDistance}
            onChange={(e) => onMaxDistanceChange(e.target.value)}
            className="w-14 h-7 text-xs"
          />
          <span className="text-muted-foreground">mi</span>
        </div>

        {/* School ratings */}
        <div className="flex items-center gap-1">
          <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">E≥</span>
          <Input
            type="number"
            placeholder="min"
            value={minElemSchool}
            onChange={(e) => onMinElemSchoolChange(e.target.value)}
            className="w-12 h-7 text-xs"
          />
          <span className="text-muted-foreground">M≥</span>
          <Input
            type="number"
            placeholder="min"
            value={minMiddleSchool}
            onChange={(e) => onMinMiddleSchoolChange(e.target.value)}
            className="w-12 h-7 text-xs"
          />
          <span className="text-muted-foreground">H≥</span>
          <Input
            type="number"
            placeholder="min"
            value={minHighSchool}
            onChange={(e) => onMinHighSchoolChange(e.target.value)}
            className="w-12 h-7 text-xs"
          />
        </div>
      </div>
    </div>
  );
}
