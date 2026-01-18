import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { 
  ExternalLink, 
  Trash2, 
  Home, 
  Bed, 
  Bath, 
  Ruler, 
  ChevronDown, 
  ChevronUp,
  Calendar,
  DollarSign,
  Car,
  Thermometer,
  Snowflake,
  MapPin,
  GraduationCap,
  Receipt,
  Clock
} from "lucide-react";
import type { ZillowListing } from "@/types/listing";

interface ListingsTableProps {
  listings: ZillowListing[];
  onRemove: (index: number) => void;
}

function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status.toLowerCase()) {
    case 'for sale':
      return 'default';
    case 'pending':
      return 'secondary';
    case 'sold':
      return 'outline';
    default:
      return 'default';
  }
}

function ExpandedDetails({ listing }: { listing: ZillowListing }) {
  return (
    <div className="p-4 bg-muted/30 border-t border-border/50 space-y-4">
      {/* Description */}
      {listing.description !== 'N/A' && (
        <div>
          <h4 className="text-sm font-semibold mb-2 text-foreground">Description</h4>
          <p className="text-sm text-muted-foreground leading-relaxed">{listing.description}</p>
        </div>
      )}

      {/* Details Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <DetailItem icon={DollarSign} label="Price/sqft" value={listing.pricePerSqft} />
        <DetailItem icon={Clock} label="Days on Zillow" value={listing.daysOnZillow} />
        <DetailItem icon={Receipt} label="HOA Fee" value={listing.hoaFee} />
        <DetailItem icon={Car} label="Parking" value={listing.parkingSpaces !== 'N/A' ? `${listing.parkingSpaces} spaces` : 'N/A'} />
        <DetailItem icon={Thermometer} label="Heating" value={listing.heating} />
        <DetailItem icon={Snowflake} label="Cooling" value={listing.cooling} />
        <DetailItem icon={MapPin} label="Neighborhood" value={listing.neighborhood} />
        <DetailItem icon={GraduationCap} label="School District" value={listing.schoolDistrict} />
        <DetailItem icon={Receipt} label="Tax Assessment" value={listing.taxAssessment} />
        <DetailItem icon={DollarSign} label="Est. Monthly" value={listing.monthlyPaymentEstimate} />
        <DetailItem icon={Calendar} label="Year Built" value={listing.yearBuilt} />
        <DetailItem icon={Ruler} label="Lot Size" value={listing.lotSize} />
      </div>

      {/* Appliances */}
      {listing.appliances !== 'N/A' && (
        <div>
          <h4 className="text-sm font-semibold mb-2 text-foreground">Appliances</h4>
          <p className="text-sm text-muted-foreground">{listing.appliances}</p>
        </div>
      )}

      {/* Features */}
      {listing.features && listing.features.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2 text-foreground">Features</h4>
          <div className="flex flex-wrap gap-2">
            {listing.features.map((feature, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {feature}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DetailItem({ 
  icon: Icon, 
  label, 
  value 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string;
}) {
  if (value === 'N/A') return null;
  
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium truncate" title={value}>{value}</p>
      </div>
    </div>
  );
}

function ListingRow({ 
  listing, 
  index, 
  onRemove 
}: { 
  listing: ZillowListing; 
  index: number; 
  onRemove: (index: number) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <TableRow className="group">
        <TableCell className="max-w-xs">
          <div className="font-medium truncate" title={listing.address}>
            {listing.address}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {new Date(listing.scrapedAt).toLocaleDateString()}
          </div>
        </TableCell>
        <TableCell>
          <span className="font-semibold text-primary">
            {listing.price}
          </span>
          {listing.zestimate !== 'N/A' && (
            <div className="text-xs text-muted-foreground">
              Zest: {listing.zestimate}
            </div>
          )}
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-3 text-sm">
            <span className="flex items-center gap-1">
              <Bed className="h-3.5 w-3.5 text-muted-foreground" />
              {listing.beds}
            </span>
            <span className="flex items-center gap-1">
              <Bath className="h-3.5 w-3.5 text-muted-foreground" />
              {listing.baths}
            </span>
            <span className="flex items-center gap-1">
              <Ruler className="h-3.5 w-3.5 text-muted-foreground" />
              {listing.sqft} sqft
            </span>
          </div>
        </TableCell>
        <TableCell>
          <span className="text-sm">{listing.propertyType}</span>
        </TableCell>
        <TableCell>
          <Badge variant={getStatusVariant(listing.status)}>
            {listing.status}
          </Badge>
        </TableCell>
        <TableCell className="text-right">
          <div className="flex items-center justify-end gap-1">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
              >
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => window.open(listing.url, '_blank')}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => onRemove(index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
      <CollapsibleContent asChild>
        <tr>
          <td colSpan={6} className="p-0">
            <ExpandedDetails listing={listing} />
          </td>
        </tr>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function ListingsTable({ listings, onRemove }: ListingsTableProps) {
  if (listings.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Home className="h-12 w-12 mx-auto mb-4 opacity-30" />
        <p className="text-lg">No listings scraped yet</p>
        <p className="text-sm mt-1">Paste a Zillow URL above to get started</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border/50 bg-card overflow-hidden animate-fade-in">
      <ScrollArea className="w-full">
        <div className="min-w-[800px]">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="font-semibold">Address</TableHead>
                <TableHead className="font-semibold">Price</TableHead>
                <TableHead className="font-semibold">Details</TableHead>
                <TableHead className="font-semibold">Type</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {listings.map((listing, index) => (
                <ListingRow
                  key={listing.url + index}
                  listing={listing}
                  index={index}
                  onRemove={onRemove}
                />
              ))}
            </TableBody>
          </Table>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
