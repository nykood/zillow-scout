import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { QualitativeFieldKey } from "@/types/listing";

export interface QualitativeScores {
  qualKitchen: number;
  qualBathrooms: number;
  qualMasterSuite: number;
  qualOffice: number;
  qualOverallVibe: number;
  qualNeighborhoodFeel: number;
  qualOutdoorSpace: number;
}

const DEFAULT_QUAL_SCORES: QualitativeScores = {
  qualKitchen: 5,
  qualBathrooms: 5,
  qualMasterSuite: 5,
  qualOffice: 5,
  qualOverallVibe: 5,
  qualNeighborhoodFeel: 5,
  qualOutdoorSpace: 5,
};

// Map frontend field keys to DB column names
const QUAL_DB_MAP: Record<QualitativeFieldKey, string> = {
  qualKitchen: 'qual_kitchen',
  qualBathrooms: 'qual_bathrooms',
  qualMasterSuite: 'qual_master_suite',
  qualOffice: 'qual_office',
  qualOverallVibe: 'qual_overall_vibe',
  qualNeighborhoodFeel: 'qual_neighborhood_feel',
  qualOutdoorSpace: 'qual_outdoor_space',
};

interface UserRating {
  listing_id: string;
  rating: "yes" | "maybe" | "no" | null;
  notes: string | null;
  qualScores: QualitativeScores;
}

export function useUserRatings() {
  const { user } = useAuth();
  const [ratings, setRatings] = useState<Map<string, UserRating>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Fetch user ratings when user changes
  const fetchRatings = useCallback(async () => {
    if (!user) {
      setRatings(new Map());
      return;
    }

    setIsLoading(true);
    const { data, error } = await supabase
      .from("user_ratings")
      .select("listing_id, rating, notes, qual_kitchen, qual_bathrooms, qual_master_suite, qual_office, qual_overall_vibe, qual_neighborhood_feel, qual_outdoor_space")
      .eq("user_id", user.id);

    if (error) {
      console.error("Error fetching ratings:", error);
    } else {
      const ratingsMap = new Map<string, UserRating>();
      data?.forEach((r) => {
        ratingsMap.set(r.listing_id, {
          listing_id: r.listing_id,
          rating: r.rating as UserRating["rating"],
          notes: r.notes,
          qualScores: {
            qualKitchen: r.qual_kitchen ?? 5,
            qualBathrooms: r.qual_bathrooms ?? 5,
            qualMasterSuite: r.qual_master_suite ?? 5,
            qualOffice: r.qual_office ?? 5,
            qualOverallVibe: r.qual_overall_vibe ?? 5,
            qualNeighborhoodFeel: r.qual_neighborhood_feel ?? 5,
            qualOutdoorSpace: r.qual_outdoor_space ?? 5,
          },
        });
      });
      setRatings(ratingsMap);
    }
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchRatings();

    if (!user) return;

    // Subscribe to realtime changes for this user's ratings
    const channel = supabase
      .channel(`user-ratings-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_ratings",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const r = payload.new;
            setRatings((prev) => {
              const next = new Map(prev);
              next.set(r.listing_id, {
                listing_id: r.listing_id,
                rating: r.rating as UserRating["rating"],
                notes: r.notes,
                qualScores: {
                  qualKitchen: r.qual_kitchen ?? 5,
                  qualBathrooms: r.qual_bathrooms ?? 5,
                  qualMasterSuite: r.qual_master_suite ?? 5,
                  qualOffice: r.qual_office ?? 5,
                  qualOverallVibe: r.qual_overall_vibe ?? 5,
                  qualNeighborhoodFeel: r.qual_neighborhood_feel ?? 5,
                  qualOutdoorSpace: r.qual_outdoor_space ?? 5,
                },
              });
              return next;
            });
          } else if (payload.eventType === "DELETE") {
            const listingId = payload.old.listing_id;
            setRatings((prev) => {
              const next = new Map(prev);
              next.delete(listingId);
              return next;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRatings, user]);

  // Set rating for a listing
  const setRating = useCallback(
    async (listingId: string, rating: "yes" | "maybe" | "no" | null) => {
      if (!user) {
        toast({
          title: "Sign in required",
          description: "Please sign in to save your ratings.",
          variant: "destructive",
        });
        return false;
      }

      const existingRating = ratings.get(listingId);

      if (rating === null && existingRating) {
        // Delete the rating
        const { error } = await supabase
          .from("user_ratings")
          .delete()
          .eq("user_id", user.id)
          .eq("listing_id", listingId);

        if (error) {
          console.error("Error deleting rating:", error);
          return false;
        }
      } else if (existingRating) {
        // Update existing
        const { error } = await supabase
          .from("user_ratings")
          .update({ rating })
          .eq("user_id", user.id)
          .eq("listing_id", listingId);

        if (error) {
          console.error("Error updating rating:", error);
          return false;
        }
      } else if (rating !== null) {
        // Insert new
        const { error } = await supabase.from("user_ratings").insert({
          user_id: user.id,
          listing_id: listingId,
          rating,
        });

        if (error) {
          console.error("Error inserting rating:", error);
          return false;
        }
      }

      return true;
    },
    [user, ratings, toast]
  );

  // Set notes for a listing
  const setNotes = useCallback(
    async (listingId: string, notes: string) => {
      if (!user) {
        toast({
          title: "Sign in required",
          description: "Please sign in to save your notes.",
          variant: "destructive",
        });
        return false;
      }

      const existingRating = ratings.get(listingId);

      if (existingRating) {
        // Update existing
        const { error } = await supabase
          .from("user_ratings")
          .update({ notes })
          .eq("user_id", user.id)
          .eq("listing_id", listingId);

        if (error) {
          console.error("Error updating notes:", error);
          return false;
        }
      } else {
        // Insert new with notes only
        const { error } = await supabase.from("user_ratings").insert({
          user_id: user.id,
          listing_id: listingId,
          notes,
        });

        if (error) {
          console.error("Error inserting notes:", error);
          return false;
        }
      }

      toast({
        title: "Notes saved",
        description: "Your notes have been saved.",
      });
      return true;
    },
    [user, ratings, toast]
  );

  // Set a single qualitative score for a listing
  const setQualitativeScore = useCallback(
    async (listingId: string, field: QualitativeFieldKey, value: number) => {
      if (!user) {
        toast({
          title: "Sign in required",
          description: "Please sign in to save your ratings.",
          variant: "destructive",
        });
        return false;
      }

      const dbColumn = QUAL_DB_MAP[field];
      const existingRating = ratings.get(listingId);

      if (existingRating) {
        const { error } = await supabase
          .from("user_ratings")
          .update({ [dbColumn]: value } as any)
          .eq("user_id", user.id)
          .eq("listing_id", listingId);

        if (error) {
          console.error("Error updating qualitative score:", error);
          return false;
        }
      } else {
        const { error } = await supabase.from("user_ratings").insert({
          user_id: user.id,
          listing_id: listingId,
          [dbColumn]: value,
        } as any);

        if (error) {
          console.error("Error inserting qualitative score:", error);
          return false;
        }
      }

      // Optimistic update
      setRatings((prev) => {
        const next = new Map(prev);
        const existing = next.get(listingId);
        next.set(listingId, {
          listing_id: listingId,
          rating: existing?.rating ?? null,
          notes: existing?.notes ?? null,
          qualScores: {
            ...(existing?.qualScores ?? DEFAULT_QUAL_SCORES),
            [field]: value,
          },
        });
        return next;
      });

      return true;
    },
    [user, ratings, toast]
  );

  // Get rating for a listing
  const getRating = useCallback(
    (listingId: string) => ratings.get(listingId)?.rating ?? null,
    [ratings]
  );

  // Get notes for a listing
  const getNotes = useCallback(
    (listingId: string) => ratings.get(listingId)?.notes ?? "",
    [ratings]
  );

  // Get qualitative scores for a listing
  const getQualitativeScores = useCallback(
    (listingId: string): QualitativeScores =>
      ratings.get(listingId)?.qualScores ?? { ...DEFAULT_QUAL_SCORES },
    [ratings]
  );

  return {
    isLoading,
    getRating,
    getNotes,
    getQualitativeScores,
    setRating,
    setNotes,
    setQualitativeScore,
    isAuthenticated: !!user,
  };
}
