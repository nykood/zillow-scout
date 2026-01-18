import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2 } from "lucide-react";

interface UrlInputProps {
  onSubmit: (url: string) => void;
  isLoading: boolean;
}

export function UrlInput({ onSubmit, isLoading }: UrlInputProps) {
  const [url, setUrl] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onSubmit(url.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
      <div className="flex gap-3">
        <Input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste a Zillow listing URL..."
          className="flex-1 h-12 text-base bg-card border-border/50 focus-visible:ring-primary/30"
          disabled={isLoading}
        />
        <Button 
          type="submit" 
          disabled={isLoading || !url.trim()}
          className="h-12 px-6 gap-2"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          {isLoading ? "Scraping..." : "Scrape"}
        </Button>
      </div>
      <p className="text-sm text-muted-foreground mt-2 text-center">
        Example: https://www.zillow.com/homedetails/123-Main-St/12345_zpid/
      </p>
    </form>
  );
}
