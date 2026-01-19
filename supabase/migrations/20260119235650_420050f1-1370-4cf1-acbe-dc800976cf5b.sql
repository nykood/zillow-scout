-- Create listings table for Zillow property data
CREATE TABLE public.listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL UNIQUE,
  address TEXT,
  price TEXT,
  price_num NUMERIC,
  beds SMALLINT,
  baths NUMERIC,
  sqft INTEGER,
  lot_size TEXT,
  year_built SMALLINT,
  property_type TEXT,
  status TEXT,
  days_on_market INTEGER,
  neighborhood TEXT,
  garage_spots SMALLINT,
  has_garage BOOLEAN,
  price_cut_amount TEXT,
  price_cut_percentage TEXT,
  price_cut_date TEXT,
  hoa TEXT,
  hoa_num NUMERIC,
  hoa_membership_price NUMERIC,
  zestimate TEXT,
  zestimate_num NUMERIC,
  am_commute_pessimistic INTEGER,
  pm_commute_pessimistic INTEGER,
  distance_miles NUMERIC,
  elementary_school_rating SMALLINT,
  middle_school_rating SMALLINT,
  high_school_rating SMALLINT,
  avg_school_rating NUMERIC,
  flood_zone TEXT,
  walk_score SMALLINT,
  bike_score SMALLINT,
  transit_score SMALLINT,
  description TEXT,
  thumbnail TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  rating TEXT CHECK (rating IN ('yes', 'maybe', 'no')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access (anyone can view all listings)
CREATE POLICY "Anyone can view listings"
ON public.listings
FOR SELECT
USING (true);

-- Create policy for public insert (anyone can add listings)
CREATE POLICY "Anyone can insert listings"
ON public.listings
FOR INSERT
WITH CHECK (true);

-- Create policy for public update (anyone can update listings)
CREATE POLICY "Anyone can update listings"
ON public.listings
FOR UPDATE
USING (true);

-- Create policy for public delete (anyone can delete listings)
CREATE POLICY "Anyone can delete listings"
ON public.listings
FOR DELETE
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_listings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_listings_updated_at
BEFORE UPDATE ON public.listings
FOR EACH ROW
EXECUTE FUNCTION public.update_listings_updated_at();

-- Create index on URL for faster lookups
CREATE INDEX idx_listings_url ON public.listings(url);