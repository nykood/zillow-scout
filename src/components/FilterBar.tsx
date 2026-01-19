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
import { ArrowUpDown, Filter, X, DollarSign, Droplets } from "lucide-react";

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
  minPricePerSqft: string;
  maxPricePerSqft: string;
  onSortChange: (sort: SortOption) => void;
  onFilterChange: (filter: FilterOption) => void;
  onStatusFilterChange: (status: StatusFilterOption) => void;
  onFloodRiskFilterChange: (floodRisk: FloodRiskFilterOption) => void;
  onMinPricePerSqftChange: (value: string) => void;
  onMaxPricePerSqftChange: (value: string) => void;
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
  minPricePerSqft,
  maxPricePerSqft,
  onSortChange,
  onFilterChange,
  onStatusFilterChange,
  onFloodRiskFilterChange,
  onMinPricePerSqftChange,
  onMaxPricePerSqftChange,
  counts,
  statusCounts,
  floodRiskCounts,
}: FilterBarProps) {
  const hasActiveFilters = filterBy !== "all" || statusFilter !== "all" || floodRiskFilter !== "all" || minPricePerSqft || maxPricePerSqft;

  const clearAllFilters = () => {
    onFilterChange("all");
    onStatusFilterChange("all");
    onFloodRiskFilterChange("all");
    onMinPricePerSqftChange("");
    onMaxPricePerSqftChange("");
  };

  return (
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
      <div className="flex items-center gap-1">
        <DollarSign className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">/sqft:</span>
        <Input
          type="number"
          placeholder="Min"
          value={minPricePerSqft}
          onChange={(e) => onMinPricePerSqftChange(e.target.value)}
          className="w-20 h-9"
        />
        <span className="text-muted-foreground">-</span>
        <Input
          type="number"
          placeholder="Max"
          value={maxPricePerSqft}
          onChange={(e) => onMaxPricePerSqftChange(e.target.value)}
          className="w-20 h-9"
        />
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
          Clear Filters
        </Button>
      )}
    </div>
  );
}
