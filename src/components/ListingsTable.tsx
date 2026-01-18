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
import { ExternalLink, Trash2, Home, Bed, Bath, Ruler } from "lucide-react";
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
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="font-semibold">Address</TableHead>
              <TableHead className="font-semibold">Price</TableHead>
              <TableHead className="font-semibold">Details</TableHead>
              <TableHead className="font-semibold">Type</TableHead>
              <TableHead className="font-semibold">Year Built</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {listings.map((listing, index) => (
              <TableRow key={listing.url + index} className="group">
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
                  {listing.lotSize !== 'N/A' && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Lot: {listing.lotSize}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-sm">{listing.propertyType}</span>
                </TableCell>
                <TableCell>
                  <span className="text-sm">{listing.yearBuilt}</span>
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(listing.status)}>
                    {listing.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
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
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
