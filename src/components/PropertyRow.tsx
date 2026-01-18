import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ExternalLink,
  Trash2,
  Bed,
  Bath,
  Ruler,
  ChevronDown,
  ChevronUp,
  Calendar,
  ThumbsUp,
  ThumbsDown,
  HelpCircle,
  Save,
  Home,
  Sparkles,
  Car,
} from "lucide-react";
import type { ZillowListing } from "@/types/listing";
import { getScoreColor, getScoreBgColor, getRatingEmoji } from "@/lib/scoring";
import { cn } from "@/lib/utils";

interface PropertyRowProps {
  listing: ZillowListing;
  onRemove: () => void;
  onRatingChange: (rating: "yes" | "maybe" | "no" | null) => void;
  onNotesChange: (notes: string) => void;
}

function FeatureRating({
  label,
  value,
  maxValue = 10,
}: {
  label: string;
  value: number;
  maxValue?: number;
}) {
  const percentage = (value / maxValue) * 100;
  const getColor = () => {
    if (percentage >= 80) return "bg-green-500";
    if (percentage >= 60) return "bg-yellow-500";
    if (percentage >= 40) return "bg-orange-500";
    return "bg-red-500";
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">
          {getRatingEmoji(value)} {value}/{maxValue}
        </span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", getColor())}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export function PropertyRow({
  listing,
  onRemove,
  onRatingChange,
  onNotesChange,
}: PropertyRowProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notes, setNotes] = useState(listing.userNotes || "");

  const handleSaveNotes = () => {
    onNotesChange(notes);
  };

  return (
    <div
      className={cn(
        "border-b border-border transition-all",
        listing.userRating === "yes" && "bg-green-500/5",
        listing.userRating === "no" && "opacity-60"
      )}
    >
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        {/* Main Row - Click to expand */}
        <CollapsibleTrigger asChild>
          <div className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors">
            {/* Score badge */}
            {listing.totalScore !== undefined && (
              <div
                className={cn(
                  "flex-shrink-0 w-12 h-12 rounded-lg border-2 flex flex-col items-center justify-center",
                  getScoreBgColor(listing.totalScore)
                )}
              >
                <span
                  className={cn(
                    "text-xl font-bold",
                    getScoreColor(listing.totalScore)
                  )}
                >
                  {listing.totalScore}
                </span>
              </div>
            )}

            {/* Address */}
            <div className="min-w-0 flex-1 max-w-[300px]">
              <h3 className="font-semibold text-sm truncate" title={listing.address}>
                {listing.address}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge
                  variant={
                    listing.status === "For Sale"
                      ? "default"
                      : listing.status === "Pending"
                      ? "secondary"
                      : "outline"
                  }
                  className="text-[10px] h-5"
                >
                  {listing.status}
                </Badge>
                {listing.daysOnZillow !== "N/A" && (
                  <span className="text-xs text-muted-foreground">
                    {listing.daysOnZillow}
                  </span>
                )}
              </div>
            </div>

            {/* Price */}
            <div className="text-right flex-shrink-0 w-28">
              <div className="text-lg font-bold text-primary">
                {listing.price}
              </div>
              {listing.pricePerSqft !== "N/A" && (
                <div className="text-xs text-muted-foreground">
                  {listing.pricePerSqft}/sqft
                </div>
              )}
            </div>

            {/* Quick stats */}
            <div className="hidden md:flex items-center gap-3 text-sm flex-shrink-0">
              <span className="flex items-center gap-1 w-14">
                <Bed className="h-4 w-4 text-muted-foreground" />
                {listing.beds} bd
              </span>
              <span className="flex items-center gap-1 w-14">
                <Bath className="h-4 w-4 text-muted-foreground" />
                {listing.baths} ba
              </span>
              <span className="flex items-center gap-1 w-20">
                <Ruler className="h-4 w-4 text-muted-foreground" />
                {listing.sqft}
              </span>
              {listing.yearBuilt !== "N/A" && (
                <span className="hidden lg:flex items-center gap-1 w-16">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {listing.yearBuilt}
                </span>
              )}
              <span className="hidden lg:flex items-center gap-1 w-24 text-xs">
                <Home className="h-4 w-4 text-muted-foreground" />
                {listing.propertyType}
              </span>
              {listing.commuteTime && (
                <span className="flex items-center gap-1 text-primary font-medium w-28">
                  <Car className="h-4 w-4" />
                  {listing.commuteTime} min
                </span>
              )}
            </div>

            {/* User Rating Pills */}
            <div className="hidden sm:flex items-center gap-1 flex-shrink-0">
              <Button
                variant={listing.userRating === "yes" ? "default" : "ghost"}
                size="icon"
                className={cn(
                  "h-7 w-7",
                  listing.userRating === "yes" &&
                    "bg-green-500 hover:bg-green-600 text-white"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  onRatingChange(listing.userRating === "yes" ? null : "yes");
                }}
              >
                <ThumbsUp className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant={listing.userRating === "maybe" ? "default" : "ghost"}
                size="icon"
                className={cn(
                  "h-7 w-7",
                  listing.userRating === "maybe" &&
                    "bg-yellow-500 hover:bg-yellow-600 text-white"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  onRatingChange(listing.userRating === "maybe" ? null : "maybe");
                }}
              >
                <HelpCircle className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant={listing.userRating === "no" ? "default" : "ghost"}
                size="icon"
                className={cn(
                  "h-7 w-7",
                  listing.userRating === "no" &&
                    "bg-red-500 hover:bg-red-600 text-white"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  onRatingChange(listing.userRating === "no" ? null : "no");
                }}
              >
                <ThumbsDown className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(listing.url, "_blank");
                }}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              {isOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </div>
        </CollapsibleTrigger>

        {/* Expanded Details */}
        <CollapsibleContent>
          <div className="p-4 bg-muted/30 space-y-4 border-t border-border/50">
            {/* Mobile stats (shown on small screens) */}
            <div className="flex flex-wrap items-center gap-3 text-sm md:hidden">
              <span className="flex items-center gap-1">
                <Bed className="h-4 w-4 text-muted-foreground" />
                {listing.beds} bd
              </span>
              <span className="flex items-center gap-1">
                <Bath className="h-4 w-4 text-muted-foreground" />
                {listing.baths} ba
              </span>
              <span className="flex items-center gap-1">
                <Ruler className="h-4 w-4 text-muted-foreground" />
                {listing.sqft}
              </span>
              {listing.yearBuilt !== "N/A" && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {listing.yearBuilt}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Home className="h-4 w-4 text-muted-foreground" />
                {listing.propertyType}
              </span>
              {listing.commuteTime && (
                <span className="flex items-center gap-1 text-primary font-medium">
                  <Car className="h-4 w-4" />
                  {listing.commuteTime} min
                  {listing.commuteDistance && (
                    <span className="text-muted-foreground font-normal">({listing.commuteDistance})</span>
                  )}
                </span>
              )}
            </div>

            {/* Mobile ratings */}
            <div className="flex items-center gap-2 sm:hidden">
              <span className="text-xs text-muted-foreground mr-2">Your rating:</span>
              <Button
                variant={listing.userRating === "yes" ? "default" : "outline"}
                size="sm"
                className={cn(
                  "h-8",
                  listing.userRating === "yes" &&
                    "bg-green-500 hover:bg-green-600 text-white"
                )}
                onClick={() =>
                  onRatingChange(listing.userRating === "yes" ? null : "yes")
                }
              >
                <ThumbsUp className="h-3.5 w-3.5 mr-1" />
                Yes
              </Button>
              <Button
                variant={listing.userRating === "maybe" ? "default" : "outline"}
                size="sm"
                className={cn(
                  "h-8",
                  listing.userRating === "maybe" &&
                    "bg-yellow-500 hover:bg-yellow-600 text-white"
                )}
                onClick={() =>
                  onRatingChange(listing.userRating === "maybe" ? null : "maybe")
                }
              >
                <HelpCircle className="h-3.5 w-3.5 mr-1" />
                Maybe
              </Button>
              <Button
                variant={listing.userRating === "no" ? "default" : "outline"}
                size="sm"
                className={cn(
                  "h-8",
                  listing.userRating === "no" &&
                    "bg-red-500 hover:bg-red-600 text-white"
                )}
                onClick={() =>
                  onRatingChange(listing.userRating === "no" ? null : "no")
                }
              >
                <ThumbsDown className="h-3.5 w-3.5 mr-1" />
                No
              </Button>
            </div>

            {/* AI Features */}
            {listing.aiFeatures && (
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  AI Quality Analysis
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-10 gap-3">
                  <FeatureRating
                    label="Kitchen"
                    value={listing.aiFeatures.kitchenQuality}
                  />
                  <FeatureRating
                    label="Bathroom"
                    value={listing.aiFeatures.bathroomQuality}
                  />
                  <FeatureRating
                    label="Condition"
                    value={listing.aiFeatures.overallCondition}
                  />
                  <FeatureRating
                    label="Natural Light"
                    value={listing.aiFeatures.naturalLight}
                  />
                  <FeatureRating
                    label="Layout"
                    value={listing.aiFeatures.layoutFlow}
                  />
                  <FeatureRating
                    label="Curb Appeal"
                    value={listing.aiFeatures.curbAppeal}
                  />
                  <FeatureRating
                    label="Privacy"
                    value={listing.aiFeatures.privacyLevel}
                  />
                  <FeatureRating
                    label="Yard"
                    value={listing.aiFeatures.yardUsability}
                  />
                  <FeatureRating
                    label="Storage"
                    value={listing.aiFeatures.storageSpace}
                  />
                  <FeatureRating
                    label="Modern"
                    value={listing.aiFeatures.modernUpdates}
                  />
                </div>
                {listing.aiFeatures.summary && (
                  <p className="mt-3 text-sm text-muted-foreground bg-background/50 p-3 rounded-lg">
                    {listing.aiFeatures.summary}
                  </p>
                )}
              </div>
            )}

            {/* Description */}
            {listing.description !== "N/A" && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Description</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {listing.description}
                </p>
              </div>
            )}

            {/* Property details */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 text-sm">
              {listing.lotSize !== "N/A" && (
                <div>
                  <span className="text-muted-foreground">Lot Size:</span>{" "}
                  <span className="font-medium">{listing.lotSize}</span>
                </div>
              )}
              {listing.hoaFee !== "N/A" && (
                <div>
                  <span className="text-muted-foreground">HOA:</span>{" "}
                  <span className="font-medium">{listing.hoaFee}</span>
                </div>
              )}
              {listing.parkingSpaces !== "N/A" && (
                <div>
                  <span className="text-muted-foreground">Parking:</span>{" "}
                  <span className="font-medium">{listing.parkingSpaces} spaces</span>
                </div>
              )}
              {listing.heating !== "N/A" && (
                <div>
                  <span className="text-muted-foreground">Heating:</span>{" "}
                  <span className="font-medium">{listing.heating}</span>
                </div>
              )}
              {listing.cooling !== "N/A" && (
                <div>
                  <span className="text-muted-foreground">Cooling:</span>{" "}
                  <span className="font-medium">{listing.cooling}</span>
                </div>
              )}
              {listing.zestimate !== "N/A" && (
                <div>
                  <span className="text-muted-foreground">Zestimate:</span>{" "}
                  <span className="font-medium">{listing.zestimate}</span>
                </div>
              )}
              {listing.schoolRating !== "N/A" && (
                <div>
                  <span className="text-muted-foreground">Schools:</span>{" "}
                  <span className="font-medium">{listing.schoolRating}</span>
                </div>
              )}
              {listing.neighborhood !== "N/A" && (
                <div>
                  <span className="text-muted-foreground">Neighborhood:</span>{" "}
                  <span className="font-medium">{listing.neighborhood}</span>
                </div>
              )}
              {listing.commuteDistance && (
                <div>
                  <span className="text-muted-foreground">Distance to MUSC:</span>{" "}
                  <span className="font-medium">{listing.commuteDistance}</span>
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <h4 className="text-sm font-semibold mb-2">Your Notes</h4>
              <div className="flex gap-2">
                <Textarea
                  placeholder="Add notes about this property..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[80px] text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="flex-shrink-0"
                  onClick={handleSaveNotes}
                >
                  <Save className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
