import { useState } from "react";
import { UrlInput } from "@/components/UrlInput";
import { ListingsTable } from "@/components/ListingsTable";
import { scrapeZillowListing } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Home } from "lucide-react";
import type { ZillowListing } from "@/types/listing";

const Index = () => {
  const [listings, setListings] = useState<ZillowListing[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleScrape = async (url: string) => {
    // Check if already scraped
    if (listings.some((l) => l.url === url)) {
      toast({
        title: "Already scraped",
        description: "This listing has already been added to the table.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await scrapeZillowListing(url);
      
      if (result.success && result.data) {
        setListings((prev) => [result.data!, ...prev]);
        toast({
          title: "Success!",
          description: `Scraped: ${result.data.address}`,
        });
      } else {
        toast({
          title: "Scraping failed",
          description: result.error || "Could not extract listing data",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = (index: number) => {
    setListings((prev) => prev.filter((_, i) => i !== index));
    toast({
      title: "Removed",
      description: "Listing removed from table.",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container py-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Home className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Zillow Scraper</h1>
              <p className="text-sm text-muted-foreground">Extract listing data from Zillow URLs</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        <div className="space-y-8">
          {/* Input Section */}
          <section className="py-6">
            <UrlInput onSubmit={handleScrape} isLoading={isLoading} />
          </section>

          {/* Results Section */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium">
                Scraped Listings
                {listings.length > 0 && (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    ({listings.length})
                  </span>
                )}
              </h2>
            </div>
            <ListingsTable listings={listings} onRemove={handleRemove} />
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-6 mt-auto">
        <div className="container text-center text-sm text-muted-foreground">
          Paste any Zillow listing URL to extract property details
        </div>
      </footer>
    </div>
  );
};

export default Index;
