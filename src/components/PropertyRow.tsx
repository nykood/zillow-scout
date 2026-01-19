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
  Car,
  Footprints,
  Bike,
  Droplets,
  GraduationCap,
  Warehouse,
  Navigation,
} from "lucide-react";
import type { ZillowListing } from "@/types/listing";
import { getScoreColor, getScoreBgColor } from "@/lib/scoring";
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
  
  // Extract FEMA zone code if present (e.g., "Zone X", "Zone AE", "Zone VE")
  const zoneMatch = zone.match(/Zone\s*([A-Z]+\d*)/i);
  const zoneCode = zoneMatch ? zoneMatch[1].toUpperCase() : null;
  
  // First, determine risk level based on extracted zone code (most reliable)
  if (zoneCode) {
    // Coastal high risk zones (V zones)
    if (zoneCode === 'V' || zoneCode === 'VE') {
      return { zoneCode, riskLevel: 'coastal-high', riskLabel: 'Coastal High' };
    }
    
    // High risk zones (A zones - Special Flood Hazard Areas)
    if (['A', 'AE', 'AH', 'AO', 'AR', 'A99'].includes(zoneCode)) {
      return { zoneCode, riskLevel: 'high', riskLabel: 'High' };
    }
    
    // Low risk zones (X, C, D zones)
    if (['X', 'C', 'D'].includes(zoneCode)) {
      // Check if it's shaded X (moderate risk)
      if (zoneUpper.includes('SHADED') && !zoneUpper.includes('UNSHADED')) {
        return { zoneCode: 'X-shaded', riskLevel: 'moderate', riskLabel: 'Moderate' };
      }
      return { zoneCode, riskLevel: 'low', riskLabel: 'Low' };
    }
    
    // B zones are moderate risk
    if (zoneCode === 'B') {
      return { zoneCode, riskLevel: 'moderate', riskLabel: 'Moderate' };
    }
  }
  
  // Fall back to text-based detection if no zone code found
  // Check for risk level keywords (Flood Factor uses these)
  if (zoneUpper.includes('MINIMAL') || zoneUpper.includes('LOW RISK')) {
    return { zoneCode: null, riskLevel: 'low', riskLabel: 'Low' };
  }
  
  if (zoneUpper.includes('MINOR') || zoneUpper.includes('MODERATE')) {
    return { zoneCode: null, riskLevel: 'moderate', riskLabel: 'Moderate' };
  }
  
  if (zoneUpper.includes('MAJOR') || zoneUpper.includes('SEVERE') || 
      zoneUpper.includes('EXTREME') || zoneUpper.includes('HIGH RISK')) {
    return { zoneCode: null, riskLevel: 'high', riskLabel: 'High' };
  }
  
  if (zoneUpper.includes('COASTAL')) {
    return { zoneCode: null, riskLevel: 'coastal-high', riskLabel: 'Coastal High' };
  }
  
  // Undetermined
  return { zoneCode: null, riskLevel: 'undetermined', riskLabel: 'Undetermined' };
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
          <div className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors min-w-[1900px]">
            {/* User Rating Pills - FIRST */}
            <div className="flex items-center gap-1 flex-shrink-0 w-[84px]">
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

            {/* Actions - SECOND */}
            <div className="flex items-center gap-1 flex-shrink-0 w-[120px]">
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
            {/* Score badge - smaller */}
            {listing.totalScore !== undefined && (
              <div
                className={cn(
                  "flex-shrink-0 w-9 h-9 rounded-lg border-2 flex flex-col items-center justify-center",
                  getScoreBgColor(listing.totalScore)
                )}
              >
                <span
                  className={cn(
                    "text-sm font-bold",
                    getScoreColor(listing.totalScore)
                  )}
                >
                  {listing.totalScore}
                </span>
              </div>
            )}

            {/* Address - wider */}
            <div className="w-[220px] flex-shrink-0">
              <h3 className="font-semibold text-sm truncate" title={listing.address}>
                {listing.address}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                {listing.neighborhood !== "N/A" && (
                  <span className="text-xs text-muted-foreground truncate" title={listing.neighborhood}>
                    {listing.neighborhood}
                  </span>
                )}
              </div>
            </div>

            {/* Status - taller badge, narrower */}
            <div className="w-[85px] flex-shrink-0">
              <Badge
                variant={
                  listing.status === "For Sale"
                    ? "default"
                    : listing.status === "Pending" || listing.status?.includes("Contingent")
                    ? "secondary"
                    : listing.status === "Sold"
                    ? "outline"
                    : "outline"
                }
                className="text-[10px] h-6 leading-tight"
              >
                {listing.status}
              </Badge>
            </div>

            {/* Days on Market */}
            <div className="w-[50px] flex-shrink-0 text-center">
              <span className="text-xs" title="Days on market">
                {listing.daysOnMarket !== undefined ? listing.daysOnMarket : (listing.daysOnZillow !== "N/A" ? listing.daysOnZillow.replace(' days', 'd') : 'N/A')}
              </span>
            </div>

            {/* Price */}
            <div className="text-right flex-shrink-0 w-24">
              <div className="text-base font-bold text-primary">
                {listing.price}
              </div>
            </div>

            {/* Price Cut - separate column */}
            <div className="w-[80px] flex-shrink-0 text-center">
              {listing.priceCutAmount ? (
                <div className="text-[10px] text-green-600">
                  <div>-${(listing.priceCutAmount / 1000).toFixed(0)}k</div>
                  {listing.priceCutPercent && (
                    <div className="text-muted-foreground">
                      {listing.priceCutPercent.toFixed(1)}%
                      {listing.priceCutDate && ` ${listing.priceCutDate}`}
                    </div>
                  )}
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              )}
            </div>

            {/* Price per Sqft */}
            <div className="w-[60px] flex-shrink-0 text-center">
              <span className="text-xs">
                {listing.pricePerSqft !== "N/A" ? listing.pricePerSqft : 'N/A'}
              </span>
            </div>

            {/* Quick stats - flattened for alignment */}
            <div className="flex items-center gap-1 w-14 text-sm flex-shrink-0">
              <Bed className="h-4 w-4 text-muted-foreground" />
              {listing.beds} bd
            </div>
            <div className="flex items-center gap-1 w-14 text-sm flex-shrink-0">
              <Bath className="h-4 w-4 text-muted-foreground" />
              {listing.baths} ba
            </div>
            <div className="flex items-center gap-1 w-20 text-sm flex-shrink-0">
              <Ruler className="h-4 w-4 text-muted-foreground" />
              {listing.sqft}
            </div>
            
            {/* Garage */}
            <div className="flex items-center gap-1 w-16 text-xs flex-shrink-0" title="Garage">
              <Warehouse className="h-4 w-4 text-muted-foreground" />
              {listing.hasGarage === true ? (
                <span>{listing.garageSpots || 1}</span>
              ) : listing.hasGarage === false ? (
                <span className="text-muted-foreground">No</span>
              ) : (
                <span className="text-muted-foreground">N/A</span>
              )}
            </div>
            
            {/* Commute with miles - now rush hour */}
            <div 
              className="flex items-center gap-1 w-28 text-xs flex-shrink-0"
              title="Rush hour commute to MUSC"
            >
              <Car className="h-4 w-4 text-muted-foreground" />
              {listing.commuteTime ? `${listing.commuteTime}m` : 'N/A'}
              {listing.commuteDistance && (
                <>
                  <Navigation className="h-3 w-3 text-muted-foreground ml-1" />
                  <span className="text-muted-foreground">{listing.commuteDistance.replace(' mi', '')}</span>
                </>
              )}
            </div>
            
            {/* Elementary School Rating */}
            <div className="flex items-center gap-1 w-10 text-xs flex-shrink-0" title="Elementary School Rating">
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
              {listing.elementarySchoolRating !== undefined ? listing.elementarySchoolRating : 'N/A'}
            </div>
            
            {/* Middle School Rating */}
            <div className="flex items-center gap-1 w-10 text-xs flex-shrink-0" title="Middle School Rating">
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
              {listing.middleSchoolRating !== undefined ? listing.middleSchoolRating : 'N/A'}
            </div>
            
            {/* High School Rating */}
            <div className="flex items-center gap-1 w-10 text-xs flex-shrink-0" title="High School Rating">
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
              {listing.highSchoolRating !== undefined ? listing.highSchoolRating : 'N/A'}
            </div>
            
            {/* Walk Score */}
            <div className="flex items-center gap-1 w-14 text-xs flex-shrink-0">
              <Footprints className="h-4 w-4 text-muted-foreground" />
              {listing.walkScore !== undefined ? listing.walkScore : 'N/A'}
            </div>
            
            {/* Bike Score */}
            <div className="flex items-center gap-1 w-14 text-xs flex-shrink-0">
              <Bike className="h-4 w-4 text-muted-foreground" />
              {listing.bikeScore !== undefined ? listing.bikeScore : 'N/A'}
            </div>
            
            {/* Flood Zone */}
            <div className="flex items-center w-24 flex-shrink-0">
              {listing.floodZone && listing.floodZone !== "N/A" ? (
                <FloodZoneBadge zone={listing.floodZone} />
              ) : (
                <span className="text-xs text-muted-foreground">N/A</span>
              )}
            </div>

          </div>
        </CollapsibleTrigger>

        {/* Expanded Details */}
        <CollapsibleContent>
          <div className="p-4 bg-muted/30 space-y-4 border-t border-border/50 min-w-[1900px]">
            {/* Property Image */}
            {listing.imageUrl && (
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <img 
                    src={listing.imageUrl} 
                    alt={listing.address}
                    className="w-48 h-32 object-cover rounded-lg border border-border"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
                {listing.description !== "N/A" && (
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold mb-2">Description</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {listing.description}
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {/* Description without image */}
            {!listing.imageUrl && listing.description !== "N/A" && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Description</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {listing.description}
                </p>
              </div>
            )}
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
                  {listing.commuteTime} min rush hour
                  {listing.commuteTimeNoTraffic && (
                    <span className="text-muted-foreground font-normal">({listing.commuteTimeNoTraffic} min no traffic)</span>
                  )}
                  {listing.commuteDistance && (
                    <span className="text-muted-foreground font-normal ml-1">• {listing.commuteDistance}</span>
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


            {/* Property details */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 text-sm">
              {/* Zestimate - always show prominently */}
              <div>
                <span className="text-muted-foreground">Zestimate:</span>{" "}
                <span className="font-medium">{listing.zestimate !== "N/A" ? listing.zestimate : "Not available"}</span>
              </div>
              {/* HOA - always show */}
              <div>
                <span className="text-muted-foreground">HOA:</span>{" "}
                <span className="font-medium">{listing.hoaFee !== "N/A" ? listing.hoaFee : "None"}</span>
              </div>
              {listing.lotSize !== "N/A" && (
                <div>
                  <span className="text-muted-foreground">Lot Size:</span>{" "}
                  <span className="font-medium">{listing.lotSize}</span>
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
              {listing.commuteTimeNoTraffic !== undefined && (
                <div>
                  <span className="text-muted-foreground">Non-rush hour commute:</span>{" "}
                  <span className="font-medium">{listing.commuteTimeNoTraffic} min</span>
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
