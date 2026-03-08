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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      account_inventory: {
        Row: {
          account_type: string
          allocated_at: string | null
          country: string
          created_at: string
          file_name: string
          file_path: string
          id: string
          order_id: string | null
          status: string
        }
        Insert: {
          account_type?: string
          allocated_at?: string | null
          country?: string
          created_at?: string
          file_name: string
          file_path: string
          id?: string
          order_id?: string | null
          status?: string
        }
        Update: {
          account_type?: string
          allocated_at?: string | null
          country?: string
          created_at?: string
          file_name?: string
          file_path?: string
          id?: string
          order_id?: string | null
          status?: string
        }
        Relationships: []
      }
      conversation_states: {
        Row: {
          chat_id: string
          id: string
          pending_order_id: string | null
          selected_country: string | null
          selected_quantity: number | null
          selected_type: string | null
          state: string
          updated_at: string
        }
        Insert: {
          chat_id: string
          id?: string
          pending_order_id?: string | null
          selected_country?: string | null
          selected_quantity?: number | null
          selected_type?: string | null
          state?: string
          updated_at?: string
        }
        Update: {
          chat_id?: string
          id?: string
          pending_order_id?: string | null
          selected_country?: string | null
          selected_quantity?: number | null
          selected_type?: string | null
          state?: string
          updated_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          country: string | null
          created_at: string
          first_name: string | null
          id: string
          referral_code: string | null
          referred_by: string | null
          telegram_id: string
          total_orders: number | null
          total_spent: number | null
          username: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          first_name?: string | null
          id?: string
          referral_code?: string | null
          referred_by?: string | null
          telegram_id: string
          total_orders?: number | null
          total_spent?: number | null
          username?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string
          first_name?: string | null
          id?: string
          referral_code?: string | null
          referred_by?: string | null
          telegram_id?: string
          total_orders?: number | null
          total_spent?: number | null
          username?: string | null
        }
        Relationships: []
      }
      orders: {
        Row: {
          account_type: string
          amount: number
          country: string
          created_at: string
          currency: string
          customer_id: string
          delivered_at: string | null
          delivery_file_path: string | null
          id: string
          order_id: string
          payment_method: string | null
          quantity: number
          referral_code: string | null
          status: string
          transaction_id: string | null
          username: string | null
        }
        Insert: {
          account_type?: string
          amount: number
          country: string
          created_at?: string
          currency: string
          customer_id: string
          delivered_at?: string | null
          delivery_file_path?: string | null
          id?: string
          order_id: string
          payment_method?: string | null
          quantity: number
          referral_code?: string | null
          status?: string
          transaction_id?: string | null
          username?: string | null
        }
        Update: {
          account_type?: string
          amount?: number
          country?: string
          created_at?: string
          currency?: string
          customer_id?: string
          delivered_at?: string | null
          delivery_file_path?: string | null
          id?: string
          order_id?: string
          payment_method?: string | null
          quantity?: number
          referral_code?: string | null
          status?: string
          transaction_id?: string | null
          username?: string | null
        }
        Relationships: []
      }
      referrals: {
        Row: {
          commission: number | null
          created_at: string
          id: string
          order_id: string | null
          referred_telegram_id: string
          referrer_telegram_id: string
        }
        Insert: {
          commission?: number | null
          created_at?: string
          id?: string
          order_id?: string | null
          referred_telegram_id: string
          referrer_telegram_id: string
        }
        Update: {
          commission?: number | null
          created_at?: string
          id?: string
          order_id?: string | null
          referred_telegram_id?: string
          referrer_telegram_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["order_id"]
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
