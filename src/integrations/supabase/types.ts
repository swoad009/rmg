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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          org_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          org_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          org_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      bom_items: {
        Row: {
          category: string
          consumption_per_pc: number
          created_at: string
          description: string | null
          id: string
          item_name: string
          org_id: string | null
          style_id: string
          supplier_name: string | null
          unit: string
          unit_price: number
          wastage_pct: number
        }
        Insert: {
          category?: string
          consumption_per_pc?: number
          created_at?: string
          description?: string | null
          id?: string
          item_name: string
          org_id?: string | null
          style_id: string
          supplier_name?: string | null
          unit?: string
          unit_price?: number
          wastage_pct?: number
        }
        Update: {
          category?: string
          consumption_per_pc?: number
          created_at?: string
          description?: string | null
          id?: string
          item_name?: string
          org_id?: string | null
          style_id?: string
          supplier_name?: string | null
          unit?: string
          unit_price?: number
          wastage_pct?: number
        }
        Relationships: [
          {
            foreignKeyName: "bom_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bom_items_style_id_fkey"
            columns: ["style_id"]
            isOneToOne: false
            referencedRelation: "styles"
            referencedColumns: ["id"]
          },
        ]
      }
      bundles: {
        Row: {
          bundle_no: string
          color: string
          created_at: string
          id: string
          lay_no: number | null
          order_id: string
          org_id: string | null
          qr_code: string
          quantity: number
          size: string
          status: string
        }
        Insert: {
          bundle_no: string
          color: string
          created_at?: string
          id?: string
          lay_no?: number | null
          order_id: string
          org_id?: string | null
          qr_code: string
          quantity: number
          size: string
          status?: string
        }
        Update: {
          bundle_no?: string
          color?: string
          created_at?: string
          id?: string
          lay_no?: number | null
          order_id?: string
          org_id?: string | null
          qr_code?: string
          quantity?: number
          size?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "bundles_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bundles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      buyers: {
        Row: {
          address: string | null
          brand: string | null
          code: string | null
          contact_email: string | null
          contact_person: string | null
          country: string
          created_at: string
          currency: string
          id: string
          name: string
          org_id: string | null
          payment_terms: string | null
          phone: string | null
          status: string
        }
        Insert: {
          address?: string | null
          brand?: string | null
          code?: string | null
          contact_email?: string | null
          contact_person?: string | null
          country: string
          created_at?: string
          currency?: string
          id?: string
          name: string
          org_id?: string | null
          payment_terms?: string | null
          phone?: string | null
          status?: string
        }
        Update: {
          address?: string | null
          brand?: string | null
          code?: string | null
          contact_email?: string | null
          contact_person?: string | null
          country?: string
          created_at?: string
          currency?: string
          id?: string
          name?: string
          org_id?: string | null
          payment_terms?: string | null
          phone?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "buyers_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      costings: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          cm_cost: number
          commercial_pct: number
          costing_no: string
          created_at: string
          currency: string
          fabric_cost: number
          fob_price: number | null
          id: string
          inquiry_id: string | null
          notes: string | null
          org_id: string | null
          other_cost: number
          profit_pct: number
          status: string
          style_id: string | null
          trims_cost: number
          version: number
          washing_cost: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          cm_cost?: number
          commercial_pct?: number
          costing_no: string
          created_at?: string
          currency?: string
          fabric_cost?: number
          fob_price?: number | null
          id?: string
          inquiry_id?: string | null
          notes?: string | null
          org_id?: string | null
          other_cost?: number
          profit_pct?: number
          status?: string
          style_id?: string | null
          trims_cost?: number
          version?: number
          washing_cost?: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          cm_cost?: number
          commercial_pct?: number
          costing_no?: string
          created_at?: string
          currency?: string
          fabric_cost?: number
          fob_price?: number | null
          id?: string
          inquiry_id?: string | null
          notes?: string | null
          org_id?: string | null
          other_cost?: number
          profit_pct?: number
          status?: string
          style_id?: string | null
          trims_cost?: number
          version?: number
          washing_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "costings_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "inquiries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "costings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "costings_style_id_fkey"
            columns: ["style_id"]
            isOneToOne: false
            referencedRelation: "styles"
            referencedColumns: ["id"]
          },
        ]
      }
      fabric_rolls: {
        Row: {
          color: string
          created_at: string
          fabric_type: string
          gsm: number | null
          id: string
          order_id: string | null
          org_id: string | null
          received_date: string
          roll_no: string
          status: string
          weight_kg: number
          width_inch: number | null
        }
        Insert: {
          color: string
          created_at?: string
          fabric_type: string
          gsm?: number | null
          id?: string
          order_id?: string | null
          org_id?: string | null
          received_date?: string
          roll_no: string
          status?: string
          weight_kg: number
          width_inch?: number | null
        }
        Update: {
          color?: string
          created_at?: string
          fabric_type?: string
          gsm?: number | null
          id?: string
          order_id?: string | null
          org_id?: string | null
          received_date?: string
          roll_no?: string
          status?: string
          weight_kg?: number
          width_inch?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fabric_rolls_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fabric_rolls_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      inquiries: {
        Row: {
          buyer_id: string
          created_at: string
          currency: string
          id: string
          inquiry_no: string
          merchandiser_id: string | null
          notes: string | null
          org_id: string | null
          product_type: string
          status: string
          style_ref: string | null
          target_price: number | null
          target_qty: number
          target_ship_date: string | null
        }
        Insert: {
          buyer_id: string
          created_at?: string
          currency?: string
          id?: string
          inquiry_no: string
          merchandiser_id?: string | null
          notes?: string | null
          org_id?: string | null
          product_type: string
          status?: string
          style_ref?: string | null
          target_price?: number | null
          target_qty?: number
          target_ship_date?: string | null
        }
        Update: {
          buyer_id?: string
          created_at?: string
          currency?: string
          id?: string
          inquiry_no?: string
          merchandiser_id?: string | null
          notes?: string | null
          org_id?: string | null
          product_type?: string
          status?: string
          style_ref?: string | null
          target_price?: number | null
          target_qty?: number
          target_ship_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inquiries_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inquiries_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      lc_documents: {
        Row: {
          amount: number
          created_at: string
          currency: string
          expiry_date: string
          id: string
          issue_date: string
          issuing_bank: string
          lc_number: string
          notes: string | null
          order_id: string
          org_id: string | null
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          expiry_date: string
          id?: string
          issue_date: string
          issuing_bank: string
          lc_number: string
          notes?: string | null
          order_id: string
          org_id?: string | null
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          expiry_date?: string
          id?: string
          issue_date?: string
          issuing_bank?: string
          lc_number?: string
          notes?: string | null
          order_id?: string
          org_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "lc_documents_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lc_documents_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          buyer_id: string
          created_at: string
          currency: string
          delivery_date: string
          description: string | null
          id: string
          order_date: string
          org_id: string | null
          po_number: string
          quantity: number
          status: string
          style: string
          unit_price: number
        }
        Insert: {
          buyer_id: string
          created_at?: string
          currency?: string
          delivery_date: string
          description?: string | null
          id?: string
          order_date?: string
          org_id?: string | null
          po_number: string
          quantity: number
          status?: string
          style: string
          unit_price: number
        }
        Update: {
          buyer_id?: string
          created_at?: string
          currency?: string
          delivery_date?: string
          description?: string | null
          id?: string
          order_date?: string
          org_id?: string | null
          po_number?: string
          quantity?: number
          status?: string
          style?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          org_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          country: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          country?: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          country?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      production_entries: {
        Row: {
          bundle_id: string | null
          created_at: string
          created_by: string | null
          entry_date: string
          id: string
          line_no: string
          operation: string
          operator_name: string | null
          order_id: string
          org_id: string | null
          quantity: number
        }
        Insert: {
          bundle_id?: string | null
          created_at?: string
          created_by?: string | null
          entry_date?: string
          id?: string
          line_no: string
          operation: string
          operator_name?: string | null
          order_id: string
          org_id?: string | null
          quantity: number
        }
        Update: {
          bundle_id?: string | null
          created_at?: string
          created_by?: string | null
          entry_date?: string
          id?: string
          line_no?: string
          operation?: string
          operator_name?: string | null
          order_id?: string
          org_id?: string | null
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "production_entries_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "bundles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_entries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_entries_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      samples: {
        Row: {
          buyer_comment: string | null
          courier_ref: string | null
          created_at: string
          id: string
          org_id: string | null
          remarks: string | null
          sent_date: string | null
          status: string
          sample_type: string
          style_id: string
        }
        Insert: {
          buyer_comment?: string | null
          courier_ref?: string | null
          created_at?: string
          id?: string
          org_id?: string | null
          remarks?: string | null
          sent_date?: string | null
          status?: string
          sample_type?: string
          style_id: string
        }
        Update: {
          buyer_comment?: string | null
          courier_ref?: string | null
          created_at?: string
          id?: string
          org_id?: string | null
          remarks?: string | null
          sent_date?: string | null
          status?: string
          sample_type?: string
          style_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "samples_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "samples_style_id_fkey"
            columns: ["style_id"]
            isOneToOne: false
            referencedRelation: "styles"
            referencedColumns: ["id"]
          },
        ]
      }
      qc_inspections: {
        Row: {
          bundle_id: string | null
          checked_qty: number
          created_at: string
          defect_qty: number | null
          defects: string[] | null
          id: string
          inspection_date: string
          inspector_name: string | null
          order_id: string
          org_id: string | null
          passed_qty: number
          remarks: string | null
          stage: string
        }
        Insert: {
          bundle_id?: string | null
          checked_qty: number
          created_at?: string
          defect_qty?: number | null
          defects?: string[] | null
          id?: string
          inspection_date?: string
          inspector_name?: string | null
          order_id: string
          org_id?: string | null
          passed_qty: number
          remarks?: string | null
          stage: string
        }
        Update: {
          bundle_id?: string | null
          checked_qty?: number
          created_at?: string
          defect_qty?: number | null
          defects?: string[] | null
          id?: string
          inspection_date?: string
          inspector_name?: string | null
          order_id?: string
          org_id?: string | null
          passed_qty?: number
          remarks?: string | null
          stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "qc_inspections_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "bundles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qc_inspections_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qc_inspections_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      styles: {
        Row: {
          buyer_id: string
          colors: string[]
          created_at: string
          description: string | null
          fabric_desc: string | null
          gsm: number | null
          id: string
          inquiry_id: string | null
          org_id: string | null
          product_type: string | null
          size_color_qty: Json
          sizes: string[]
          status: string
          style_no: string
        }
        Insert: {
          buyer_id: string
          colors?: string[]
          created_at?: string
          description?: string | null
          fabric_desc?: string | null
          gsm?: number | null
          id?: string
          inquiry_id?: string | null
          org_id?: string | null
          product_type?: string | null
          size_color_qty?: Json
          sizes?: string[]
          status?: string
          style_no: string
        }
        Update: {
          buyer_id?: string
          colors?: string[]
          created_at?: string
          description?: string | null
          fabric_desc?: string | null
          gsm?: number | null
          id?: string
          inquiry_id?: string | null
          org_id?: string | null
          product_type?: string | null
          size_color_qty?: Json
          sizes?: string[]
          status?: string
          style_no?: string
        }
        Relationships: [
          {
            foreignKeyName: "styles_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "styles_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "inquiries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "styles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_org_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_merch_writer: { Args: never; Returns: boolean }
      is_org_member: { Args: { _org: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "owner"
        | "admin"
        | "merchandiser"
        | "store_officer"
        | "production_supervisor"
        | "qc_officer"
        | "commercial_officer"
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
    Enums: {
      app_role: [
        "owner",
        "admin",
        "merchandiser",
        "store_officer",
        "production_supervisor",
        "qc_officer",
        "commercial_officer",
      ],
    },
  },
} as const
