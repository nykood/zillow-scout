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
  RefreshCw,
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
  Footprints,
  Bike,
  Droplets,
  MapPin,
  GraduationCap,
} from "lucide-react";
import type { ZillowListing } from "@/types/listing";
import { getScoreColor, getScoreBgColor, getRatingEmoji } from "@/lib/scoring";
import { cn } from "@/lib/utils";

interface PropertyRowProps {
  listing: ZillowListing;
  onRemove: () => void;
  onRatingChange: (rating: "yes" | "maybe" | "no" | null) => void;
  onNotesChange: (notes: string) => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

type FloodRiskLevel = 'low' | 'moderate' | 'high' | 'coastal-high' | 'undetermined';

function parseFloodZone(zone: string): { zoneCode: string | null; riskLevel: FloodRiskLevel; riskLabel: string } {
  const zoneUpper = zone.toUpperCase();
  
  // Extract FEMA zone code if present
  const zoneMatch = zone.match(/Zone\s*([A-Z]+\d*)/i);
  const zoneCode = zoneMatch ? zoneMatch[1].toUpperCase() : null;
  
  // Coastal high risk zones (V zones)
  if (zoneUpper.includes('VE') || zoneUpper.match(/\bV\b/) || zoneUpper.includes('COASTAL')) {
    return { zoneCode: zoneCode || 'V', riskLevel: 'coastal-high', riskLabel: 'Coastal High' };
  }
  
  // High risk zones (A zones - Special Flood Hazard Areas)
  if (zoneUpper.includes('AE') || zoneUpper.includes('AH') || zoneUpper.includes('AO') || 
      zoneUpper.includes('AR') || zoneUpper.match(/\bA\b/) ||
      zoneUpper.includes('HIGH') || zoneUpper.includes('SFHA') ||
      zoneUpper.includes('MAJOR') || zoneUpper.includes('SEVERE') || zoneUpper.includes('EXTREME')) {
    return { zoneCode: zoneCode || 'A', riskLevel: 'high', riskLabel: 'High' };
  }
  
  // Moderate risk zones (Shaded X, B zones)
  if (zoneUpper.includes('SHADED') || zoneUpper.includes('MODERATE') || 
      zoneUpper.match(/\bB\b/) || zoneUpper.includes('0.2%') || zoneUpper.includes('MINOR')) {
    return { zoneCode: zoneCode || 'X-shaded', riskLevel: 'moderate', riskLabel: 'Moderate' };
  }
  
  // Low/Minimal risk zones (Unshaded X, C zones)
  if (zoneUpper.includes('X') || zoneUpper.includes('C') || 
      zoneUpper.includes('MINIMAL') || zoneUpper.includes('LOW') || zoneUpper.includes('UNSHADED')) {
    return { zoneCode: zoneCode || 'X', riskLevel: 'low', riskLabel: 'Low' };
  }
  
  // Undetermined
  return { zoneCode: zoneCode, riskLevel: 'undetermined', riskLabel: 'Undetermined' };
}

function FloodZoneBadge({ zone }: { zone: string }) {
  const { zoneCode, riskLevel, riskLabel } = parseFloodZone(zone);
  
  const colorClasses: Record<FloodRiskLevel, string> = {
    'low': 'bg-green-100 text-green-800 border-green-200',
    'moderate': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'high': 'bg-red-100 text-red-800 border-red-200',
    'coastal-high': 'bg-red-200 text-red-900 border-red-300',
    'undetermined': 'bg-gray-100 text-gray-600 border-gray-200',
  };
  
  const dotColors: Record<FloodRiskLevel, string> = {
    'low': 'bg-green-500',
    'moderate': 'bg-yellow-500',
    'high': 'bg-red-500',
    'coastal-high': 'bg-red-600',
    'undetermined': 'bg-gray-400',
  };
  
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border",
      colorClasses[riskLevel]
    )}>
      <span className={cn("w-1.5 h-1.5 rounded-full", dotColors[riskLevel])} />
      {zoneCode && <span className="font-semibold">{zoneCode}</span>}
      <span className="text-[10px] opacity-80">({riskLabel})</span>
    </span>
  );
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
  onRefresh,
  isRefreshing = false,
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
          <div className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors min-w-[1400px]">
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
            <div className="w-[200px] flex-shrink-0">
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

            {/* Quick stats - always visible with horizontal scroll */}
            <div className="flex items-center gap-3 text-sm flex-shrink-0">
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
              
              {/* Commute */}
              <span 
                className="flex items-center gap-1 w-28 text-xs"
                title="Commute time to MUSC"
              >
                <Car className="h-4 w-4 text-muted-foreground" />
                {listing.commuteTime ? `${listing.commuteTime} min` : 'N/A'}
              </span>
              
              {/* Neighborhood */}
              <span className="flex items-center gap-1 w-24 text-xs truncate" title={listing.neighborhood}>
                <MapPin className="h-4 w-4 text-muted-foreground" />
                {listing.neighborhood !== "N/A" ? listing.neighborhood : 'N/A'}
              </span>
              
              {/* Elementary School Rating */}
              <span className="flex items-center gap-1 w-10 text-xs" title="Elementary School Rating">
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
                {listing.elementarySchoolRating !== undefined ? listing.elementarySchoolRating : 'N/A'}
              </span>
              
              {/* Middle School Rating */}
              <span className="flex items-center gap-1 w-10 text-xs" title="Middle School Rating">
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
                {listing.middleSchoolRating !== undefined ? listing.middleSchoolRating : 'N/A'}
              </span>
              
              {/* High School Rating */}
              <span className="flex items-center gap-1 w-10 text-xs" title="High School Rating">
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
                {listing.highSchoolRating !== undefined ? listing.highSchoolRating : 'N/A'}
              </span>
              
              {/* Walk Score */}
              <span className="flex items-center gap-1 w-14 text-xs">
                <Footprints className="h-4 w-4 text-muted-foreground" />
                {listing.walkScore !== undefined ? listing.walkScore : 'N/A'}
              </span>
              
              {/* Bike Score */}
              <span className="flex items-center gap-1 w-14 text-xs">
                <Bike className="h-4 w-4 text-muted-foreground" />
                {listing.bikeScore !== undefined ? listing.bikeScore : 'N/A'}
              </span>
              
              {/* Flood Zone */}
              <div className="flex items-center w-24">
                {listing.floodZone && listing.floodZone !== "N/A" ? (
                  <FloodZoneBadge zone={listing.floodZone} />
                ) : (
                  <span className="text-xs text-muted-foreground">N/A</span>
                )}
              </div>
            </div>

            {/* User Rating Pills */}
            <div className="flex items-center gap-1 flex-shrink-0">
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
                disabled={isRefreshing}
                onClick={(e) => {
                  e.stopPropagation();
                  onRefresh();
                }}
                title="Refresh property data"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
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
                  {listing.commuteTime} min to MUSC
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
              {listing.walkScore !== undefined && (
                <div>
                  <span className="text-muted-foreground">Walk Score:</span>{" "}
                  <span className="font-medium">{listing.walkScore}/100</span>
                </div>
              )}
              {listing.bikeScore !== undefined && (
                <div>
                  <span className="text-muted-foreground">Bike Score:</span>{" "}
                  <span className="font-medium">{listing.bikeScore}/100</span>
                </div>
              )}
              {listing.floodZone && listing.floodZone !== "N/A" && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Flood Zone:</span>{" "}
                  <FloodZoneBadge zone={listing.floodZone} />
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
