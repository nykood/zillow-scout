import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
} from "lucide-react";
import type { ZillowListing } from "@/types/listing";
import { getScoreColor, getScoreBgColor, getRatingEmoji } from "@/lib/scoring";
import { cn } from "@/lib/utils";

interface PropertyCardProps {
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

export function PropertyCard({
  listing,
  onRemove,
  onRatingChange,
  onNotesChange,
}: PropertyCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notes, setNotes] = useState(listing.userNotes || "");

  const handleSaveNotes = () => {
    onNotesChange(notes);
  };

  return (
    <Card
      className={cn(
        "overflow-hidden transition-all hover:shadow-lg",
        listing.userRating === "yes" && "ring-2 ring-green-500/50",
        listing.userRating === "no" && "opacity-60"
      )}
    >
      <CardContent className="p-0">
        {/* Header with score */}
        <div className="flex items-start gap-4 p-4">
          {/* Score badge */}
          {listing.totalScore !== undefined && (
            <div
              className={cn(
                "flex-shrink-0 w-16 h-16 rounded-lg border-2 flex flex-col items-center justify-center",
                getScoreBgColor(listing.totalScore)
              )}
            >
              <span
                className={cn(
                  "text-2xl font-bold",
                  getScoreColor(listing.totalScore)
                )}
              >
                {listing.totalScore}
              </span>
              <span className="text-[10px] text-muted-foreground uppercase">
                Score
              </span>
            </div>
          )}

          {/* Main info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-semibold text-lg truncate" title={listing.address}>
                  {listing.address}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge
                    variant={
                      listing.status === "For Sale"
                        ? "default"
                        : listing.status === "Pending"
                        ? "secondary"
                        : "outline"
                    }
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
              <div className="text-right flex-shrink-0">
                <div className="text-xl font-bold text-primary">
                  {listing.price}
                </div>
                {listing.pricePerSqft !== "N/A" && (
                  <div className="text-xs text-muted-foreground">
                    {listing.pricePerSqft}/sqft
                  </div>
                )}
              </div>
            </div>

            {/* Quick stats */}
            <div className="flex items-center gap-4 mt-3 text-sm">
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
                {listing.sqft} sqft
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
            </div>
          </div>
        </div>

        {/* User rating buttons */}
        <div className="px-4 pb-3 flex items-center gap-2">
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

          <div className="ml-auto flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => window.open(listing.url, "_blank")}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={onRemove}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Expandable details */}
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full rounded-none border-t h-10 justify-center gap-2"
            >
              {isOpen ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  Hide Details
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  Show Details
                </>
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="p-4 border-t bg-muted/30 space-y-4">
              {/* AI Features */}
              {listing.aiFeatures && (
                <div>
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    AI Quality Analysis
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
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
      </CardContent>
    </Card>
  );
}
