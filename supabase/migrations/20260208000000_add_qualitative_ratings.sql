-- Add qualitative rating columns to user_ratings table
-- Each is an integer 1-10 with a default of 5
ALTER TABLE public.user_ratings
  ADD COLUMN qual_kitchen INTEGER DEFAULT 5 CHECK (qual_kitchen >= 1 AND qual_kitchen <= 10),
  ADD COLUMN qual_bathrooms INTEGER DEFAULT 5 CHECK (qual_bathrooms >= 1 AND qual_bathrooms <= 10),
  ADD COLUMN qual_master_suite INTEGER DEFAULT 5 CHECK (qual_master_suite >= 1 AND qual_master_suite <= 10),
  ADD COLUMN qual_office INTEGER DEFAULT 5 CHECK (qual_office >= 1 AND qual_office <= 10),
  ADD COLUMN qual_overall_vibe INTEGER DEFAULT 5 CHECK (qual_overall_vibe >= 1 AND qual_overall_vibe <= 10),
  ADD COLUMN qual_neighborhood_feel INTEGER DEFAULT 5 CHECK (qual_neighborhood_feel >= 1 AND qual_neighborhood_feel <= 10),
  ADD COLUMN qual_outdoor_space INTEGER DEFAULT 5 CHECK (qual_outdoor_space >= 1 AND qual_outdoor_space <= 10);
