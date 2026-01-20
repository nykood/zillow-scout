import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface UserRating {
  listing_id: string;
  rating: "yes" | "maybe" | "no" | null;
  notes: string | null;
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
      .select("listing_id, rating, notes")
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

  return {
    isLoading,
    getRating,
    getNotes,
    setRating,
    setNotes,
    isAuthenticated: !!user,
  };
}
