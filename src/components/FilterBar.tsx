import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown, Filter, X } from "lucide-react";

export type SortOption =
  | "score-desc"
  | "score-asc"
  | "price-asc"
  | "price-desc"
  | "sqft-desc"
  | "date-desc";

export type FilterOption = "all" | "yes" | "maybe" | "no" | "unrated";

interface FilterBarProps {
  sortBy: SortOption;
  filterBy: FilterOption;
  onSortChange: (sort: SortOption) => void;
  onFilterChange: (filter: FilterOption) => void;
  counts: {
    total: number;
    yes: number;
    maybe: number;
    no: number;
    unrated: number;
  };
}

export function FilterBar({
  sortBy,
  filterBy,
  onSortChange,
  onFilterChange,
  counts,
}: FilterBarProps) {
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
            <SelectItem value="date-desc">Newest First</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Filter */}
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

      {filterBy !== "all" && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1"
          onClick={() => onFilterChange("all")}
        >
          <X className="h-3 w-3" />
          Clear Filter
        </Button>
      )}
    </div>
  );
}
