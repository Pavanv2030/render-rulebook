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
      account_submissions: {
        Row: {
          country_code: string
          created_at: string
          credited_at: string | null
          exported: boolean
          id: string
          notes: string | null
          phone_number: string
          price_inr: number
          price_usdt: number
          seller_telegram_id: string
          seller_username: string | null
          service: string
          session_string: string | null
          status: string
          tdata: Json | null
        }
        Insert: {
          country_code: string
          created_at?: string
          credited_at?: string | null
          exported?: boolean
          id?: string
          notes?: string | null
          phone_number: string
          price_inr?: number
          price_usdt?: number
          seller_telegram_id: string
          seller_username?: string | null
          service?: string
          session_string?: string | null
          status?: string
          tdata?: Json | null
        }
        Update: {
          country_code?: string
          created_at?: string
          credited_at?: string | null
          exported?: boolean
          id?: string
          notes?: string | null
          phone_number?: string
          price_inr?: number
          price_usdt?: number
          seller_telegram_id?: string
          seller_username?: string | null
          service?: string
          session_string?: string | null
          status?: string
          tdata?: Json | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
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
      country_pricing: {
        Row: {
          aged_price: number
          aged_price_usdt: number
          country_code: string
          country_name: string
          flag: string
          id: string
          regular_price: number
          regular_price_usdt: number
          updated_at: string
        }
        Insert: {
          aged_price?: number
          aged_price_usdt?: number
          country_code: string
          country_name: string
          flag?: string
          id?: string
          regular_price?: number
          regular_price_usdt?: number
          updated_at?: string
        }
        Update: {
          aged_price?: number
          aged_price_usdt?: number
          country_code?: string
          country_name?: string
          flag?: string
          id?: string
          regular_price?: number
          regular_price_usdt?: number
          updated_at?: string
        }
        Relationships: []
      }
      crypto_wallets: {
        Row: {
          coin_name: string
          coin_symbol: string
          created_at: string
          id: string
          is_active: boolean
          network: string
          updated_at: string
          wallet_address: string
        }
        Insert: {
          coin_name: string
          coin_symbol: string
          created_at?: string
          id?: string
          is_active?: boolean
          network?: string
          updated_at?: string
          wallet_address: string
        }
        Update: {
          coin_name?: string
          coin_symbol?: string
          created_at?: string
          id?: string
          is_active?: boolean
          network?: string
          updated_at?: string
          wallet_address?: string
        }
        Relationships: []
      }
      customer_wallets: {
        Row: {
          balance_inr: number
          balance_usdt: number
          id: string
          telegram_id: string
          total_earned: number
          total_earned_usdt: number
          total_withdrawn: number
          total_withdrawn_usdt: number
          updated_at: string
        }
        Insert: {
          balance_inr?: number
          balance_usdt?: number
          id?: string
          telegram_id: string
          total_earned?: number
          total_earned_usdt?: number
          total_withdrawn?: number
          total_withdrawn_usdt?: number
          updated_at?: string
        }
        Update: {
          balance_inr?: number
          balance_usdt?: number
          id?: string
          telegram_id?: string
          total_earned?: number
          total_earned_usdt?: number
          total_withdrawn?: number
          total_withdrawn_usdt?: number
          updated_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          country: string | null
          created_at: string
          customer_code: string
          first_name: string | null
          id: string
          is_blocked: boolean
          preferred_language: string
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
          customer_code?: string
          first_name?: string | null
          id?: string
          is_blocked?: boolean
          preferred_language?: string
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
          customer_code?: string
          first_name?: string | null
          id?: string
          is_blocked?: boolean
          preferred_language?: string
          referral_code?: string | null
          referred_by?: string | null
          telegram_id?: string
          total_orders?: number | null
          total_spent?: number | null
          username?: string | null
        }
        Relationships: []
      }
      login_requests: {
        Row: {
          created_at: string
          customer_chat_id: string
          id: string
          inventory_id: string | null
          order_id: string
          otp_code: string | null
          phone_number: string
          resolved_at: string | null
          status: string
          twofa_code: string | null
        }
        Insert: {
          created_at?: string
          customer_chat_id: string
          id?: string
          inventory_id?: string | null
          order_id: string
          otp_code?: string | null
          phone_number: string
          resolved_at?: string | null
          status?: string
          twofa_code?: string | null
        }
        Update: {
          created_at?: string
          customer_chat_id?: string
          id?: string
          inventory_id?: string | null
          order_id?: string
          otp_code?: string | null
          phone_number?: string
          resolved_at?: string | null
          status?: string
          twofa_code?: string | null
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
      razorpay_payments: {
        Row: {
          amount: number
          chat_id: string
          created_at: string
          currency: string
          paid_at: string | null
          purpose: string
          razorpay_order_id: string
          razorpay_payment_id: string | null
          reference_id: string | null
          status: string
          telegram_id: string
        }
        Insert: {
          amount: number
          chat_id: string
          created_at?: string
          currency?: string
          paid_at?: string | null
          purpose: string
          razorpay_order_id: string
          razorpay_payment_id?: string | null
          reference_id?: string | null
          status?: string
          telegram_id: string
        }
        Update: {
          amount?: number
          chat_id?: string
          created_at?: string
          currency?: string
          paid_at?: string | null
          purpose?: string
          razorpay_order_id?: string
          razorpay_payment_id?: string | null
          reference_id?: string | null
          status?: string
          telegram_id?: string
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
      sell_pricing: {
        Row: {
          country_code: string
          country_name: string
          created_at: string
          flag: string
          id: string
          is_active: boolean
          price_inr: number
          price_usdt: number
          service: string
          updated_at: string
        }
        Insert: {
          country_code: string
          country_name: string
          created_at?: string
          flag?: string
          id?: string
          is_active?: boolean
          price_inr?: number
          price_usdt?: number
          service?: string
          updated_at?: string
        }
        Update: {
          country_code?: string
          country_name?: string
          created_at?: string
          flag?: string
          id?: string
          is_active?: boolean
          price_inr?: number
          price_usdt?: number
          service?: string
          updated_at?: string
        }
        Relationships: []
      }
      sell_sessions: {
        Row: {
          chat_id: string
          country_code: string | null
          id: string
          mtproto_session: string | null
          phone_code_hash: string | null
          phone_number: string | null
          service: string | null
          state: string
          updated_at: string
          withdrawal_method: string | null
        }
        Insert: {
          chat_id: string
          country_code?: string | null
          id?: string
          mtproto_session?: string | null
          phone_code_hash?: string | null
          phone_number?: string | null
          service?: string | null
          state?: string
          updated_at?: string
          withdrawal_method?: string | null
        }
        Update: {
          chat_id?: string
          country_code?: string | null
          id?: string
          mtproto_session?: string | null
          phone_code_hash?: string | null
          phone_number?: string | null
          service?: string | null
          state?: string
          updated_at?: string
          withdrawal_method?: string | null
        }
        Relationships: []
      }
      sell_settings: {
        Row: {
          id: number
          min_topup_inr: number
          min_topup_usdt: number
          min_withdrawal_inr: number
          updated_at: string
        }
        Insert: {
          id?: number
          min_topup_inr?: number
          min_topup_usdt?: number
          min_withdrawal_inr?: number
          updated_at?: string
        }
        Update: {
          id?: number
          min_topup_inr?: number
          min_topup_usdt?: number
          min_withdrawal_inr?: number
          updated_at?: string
        }
        Relationships: []
      }
      stock_alerts: {
        Row: {
          account_type: string
          chat_id: string
          country: string
          created_at: string
          id: string
          notified: boolean
        }
        Insert: {
          account_type?: string
          chat_id: string
          country: string
          created_at?: string
          id?: string
          notified?: boolean
        }
        Update: {
          account_type?: string
          chat_id?: string
          country?: string
          created_at?: string
          id?: string
          notified?: boolean
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          sender: string
          session_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          sender?: string
          session_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          sender?: string
          session_id?: string
        }
        Relationships: []
      }
      upi_wallets: {
        Row: {
          created_at: string
          display_name: string
          id: string
          is_active: boolean
          qr_image_path: string | null
          updated_at: string
          upi_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string
          id?: string
          is_active?: boolean
          qr_image_path?: string | null
          updated_at?: string
          upi_id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          is_active?: boolean
          qr_image_path?: string | null
          updated_at?: string
          upi_id?: string
        }
        Relationships: []
      }
      wallet_topup_requests: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string
          currency: string
          id: string
          payment_method: string
          proof_image_path: string | null
          proof_text: string | null
          resolved_at: string | null
          source: string
          status: string
          telegram_id: string
          username: string | null
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string
          currency: string
          id?: string
          payment_method: string
          proof_image_path?: string | null
          proof_text?: string | null
          resolved_at?: string | null
          source?: string
          status?: string
          telegram_id: string
          username?: string | null
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          payment_method?: string
          proof_image_path?: string | null
          proof_text?: string | null
          resolved_at?: string | null
          source?: string
          status?: string
          telegram_id?: string
          username?: string | null
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          note: string | null
          reference_id: string | null
          telegram_id: string
          type: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency: string
          id?: string
          note?: string | null
          reference_id?: string | null
          telegram_id: string
          type: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          note?: string | null
          reference_id?: string | null
          telegram_id?: string
          type?: string
        }
        Relationships: []
      }
      withdrawal_requests: {
        Row: {
          admin_notes: string | null
          amount_inr: number
          created_at: string
          id: string
          method: string
          payout_address: string
          resolved_at: string | null
          status: string
          telegram_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount_inr: number
          created_at?: string
          id?: string
          method: string
          payout_address: string
          resolved_at?: string | null
          status?: string
          telegram_id: string
        }
        Update: {
          admin_notes?: string | null
          amount_inr?: number
          created_at?: string
          id?: string
          method?: string
          payout_address?: string
          resolved_at?: string | null
          status?: string
          telegram_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      adjust_wallet_balance: {
        Args: {
          _currency: string
          _delta: number
          _note?: string
          _reference_id?: string
          _telegram_id: string
          _type: string
        }
        Returns: Json
      }
      generate_customer_code: { Args: never; Returns: string }
      get_public_stock: {
        Args: never
        Returns: {
          account_type: string
          available: number
          country: string
        }[]
      }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
