export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      listings: {
        Row: {
          address: string | null
          am_commute_pessimistic: number | null
          avg_school_rating: number | null
          baths: number | null
          beds: number | null
          bike_score: number | null
          created_at: string | null
          days_on_market: number | null
          description: string | null
          distance_miles: number | null
          elementary_school_rating: number | null
          flood_zone: string | null
          garage_spots: number | null
          has_garage: boolean | null
          high_school_rating: number | null
          hoa: string | null
          hoa_membership_price: number | null
          hoa_num: number | null
          id: string
          latitude: number | null
          longitude: number | null
          lot_size: string | null
          middle_school_rating: number | null
          neighborhood: string | null
          notes: string | null
          pm_commute_pessimistic: number | null
          price: string | null
          price_cut_amount: string | null
          price_cut_date: string | null
          price_cut_percentage: string | null
          price_num: number | null
          property_type: string | null
          rating: string | null
          sqft: number | null
          status: string | null
          thumbnail: string | null
          transit_score: number | null
          updated_at: string | null
          url: string
          walk_score: number | null
          year_built: number | null
          zestimate: string | null
          zestimate_num: number | null
        }
        Insert: {
          address?: string | null
          am_commute_pessimistic?: number | null
          avg_school_rating?: number | null
          baths?: number | null
          beds?: number | null
          bike_score?: number | null
          created_at?: string | null
          days_on_market?: number | null
          description?: string | null
          distance_miles?: number | null
          elementary_school_rating?: number | null
          flood_zone?: string | null
          garage_spots?: number | null
          has_garage?: boolean | null
          high_school_rating?: number | null
          hoa?: string | null
          hoa_membership_price?: number | null
          hoa_num?: number | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          lot_size?: string | null
          middle_school_rating?: number | null
          neighborhood?: string | null
          notes?: string | null
          pm_commute_pessimistic?: number | null
          price?: string | null
          price_cut_amount?: string | null
          price_cut_date?: string | null
          price_cut_percentage?: string | null
          price_num?: number | null
          property_type?: string | null
          rating?: string | null
          sqft?: number | null
          status?: string | null
          thumbnail?: string | null
          transit_score?: number | null
          updated_at?: string | null
          url: string
          walk_score?: number | null
          year_built?: number | null
          zestimate?: string | null
          zestimate_num?: number | null
        }
        Update: {
          address?: string | null
          am_commute_pessimistic?: number | null
          avg_school_rating?: number | null
          baths?: number | null
          beds?: number | null
          bike_score?: number | null
          created_at?: string | null
          days_on_market?: number | null
          description?: string | null
          distance_miles?: number | null
          elementary_school_rating?: number | null
          flood_zone?: string | null
          garage_spots?: number | null
          has_garage?: boolean | null
          high_school_rating?: number | null
          hoa?: string | null
          hoa_membership_price?: number | null
          hoa_num?: number | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          lot_size?: string | null
          middle_school_rating?: number | null
          neighborhood?: string | null
          notes?: string | null
          pm_commute_pessimistic?: number | null
          price?: string | null
          price_cut_amount?: string | null
          price_cut_date?: string | null
          price_cut_percentage?: string | null
          price_num?: number | null
          property_type?: string | null
          rating?: string | null
          sqft?: number | null
          status?: string | null
          thumbnail?: string | null
          transit_score?: number | null
          updated_at?: string | null
          url?: string
          walk_score?: number | null
          year_built?: number | null
          zestimate?: string | null
          zestimate_num?: number | null
        }
        Relationships: []
      }
      user_ratings: {
        Row: {
          created_at: string | null
          id: string
          listing_id: string
          notes: string | null
          rating: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          listing_id: string
          notes?: string | null
          rating?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          listing_id?: string
          notes?: string | null
          rating?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_ratings_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
