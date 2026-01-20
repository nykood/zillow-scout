-- Create user_ratings table for private per-user ratings and notes
CREATE TABLE public.user_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  rating TEXT CHECK (rating IN ('yes', 'maybe', 'no')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, listing_id)
);

-- Enable RLS
ALTER TABLE public.user_ratings ENABLE ROW LEVEL SECURITY;

-- Users can only view their own ratings
CREATE POLICY "Users can view own ratings"
ON public.user_ratings
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert their own ratings
CREATE POLICY "Users can insert own ratings"
ON public.user_ratings
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own ratings
CREATE POLICY "Users can update own ratings"
ON public.user_ratings
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Users can delete their own ratings
CREATE POLICY "Users can delete own ratings"
ON public.user_ratings
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_user_ratings_updated_at
BEFORE UPDATE ON public.user_ratings
FOR EACH ROW
EXECUTE FUNCTION public.update_listings_updated_at();

-- Enable realtime for user_ratings
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_ratings;