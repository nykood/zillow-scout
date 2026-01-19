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
import { ArrowUpDown, Filter, X, DollarSign } from "lucide-react";

export type SortOption =
  | "score-desc"
  | "score-asc"
  | "price-asc"
  | "price-desc"
  | "sqft-desc"
  | "date-desc"
  | "days-asc";

export type FilterOption = "all" | "yes" | "maybe" | "no" | "unrated";

export type StatusFilterOption = "all" | "For Sale" | "Pending" | "Active Contingent" | "Sold" | "Off Market";

interface FilterBarProps {
  sortBy: SortOption;
  filterBy: FilterOption;
  statusFilter: StatusFilterOption;
  minPricePerSqft: string;
  maxPricePerSqft: string;
  onSortChange: (sort: SortOption) => void;
  onFilterChange: (filter: FilterOption) => void;
  onStatusFilterChange: (status: StatusFilterOption) => void;
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
}

export function FilterBar({
  sortBy,
  filterBy,
  statusFilter,
  minPricePerSqft,
  maxPricePerSqft,
  onSortChange,
  onFilterChange,
  onStatusFilterChange,
  onMinPricePerSqftChange,
  onMaxPricePerSqftChange,
  counts,
  statusCounts,
}: FilterBarProps) {
  const hasActiveFilters = filterBy !== "all" || statusFilter !== "all" || minPricePerSqft || maxPricePerSqft;

  const clearAllFilters = () => {
    onFilterChange("all");
    onStatusFilterChange("all");
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
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="Status..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status ({counts.total})</SelectItem>
            <SelectItem value="For Sale">For Sale ({statusCounts["For Sale"] || 0})</SelectItem>
            <SelectItem value="Pending">Pending ({statusCounts["Pending"] || 0})</SelectItem>
            <SelectItem value="Active Contingent">Contingent ({statusCounts["Active Contingent"] || 0})</SelectItem>
            <SelectItem value="Sold">Sold ({statusCounts["Sold"] || 0})</SelectItem>
            <SelectItem value="Off Market">Off Market ({statusCounts["Off Market"] || 0})</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Price per Sqft Filter */}
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
