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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          archived: boolean
          balance_mode: string
          class: string
          created_at: string
          household_id: string
          id: string
          include_in_net_worth: boolean
          institution: string | null
          name: string
          opening_balance: number
          opening_date: string
          sort_order: number
          statement_balance: number | null
          subtype: string
        }
        Insert: {
          archived?: boolean
          balance_mode?: string
          class: string
          created_at?: string
          household_id: string
          id?: string
          include_in_net_worth?: boolean
          institution?: string | null
          name: string
          opening_balance?: number
          opening_date?: string
          sort_order?: number
          statement_balance?: number | null
          subtype: string
        }
        Update: {
          archived?: boolean
          balance_mode?: string
          class?: string
          created_at?: string
          household_id?: string
          id?: string
          include_in_net_worth?: boolean
          institution?: string | null
          name?: string
          opening_balance?: number
          opening_date?: string
          sort_order?: number
          statement_balance?: number | null
          subtype?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      balance_snapshots: {
        Row: {
          breakdown: Json | null
          created_at: string
          household_id: string
          id: string
          net_worth: number
          snapshot_date: string
          total_assets: number
          total_liabilities: number
        }
        Insert: {
          breakdown?: Json | null
          created_at?: string
          household_id: string
          id?: string
          net_worth: number
          snapshot_date: string
          total_assets: number
          total_liabilities: number
        }
        Update: {
          breakdown?: Json | null
          created_at?: string
          household_id?: string
          id?: string
          net_worth?: number
          snapshot_date?: string
          total_assets?: number
          total_liabilities?: number
        }
        Relationships: [
          {
            foreignKeyName: "balance_snapshots_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          amount: number
          category_id: string
          created_at: string
          household_id: string
          id: string
          is_active: boolean
          period: string
          rollover: boolean
          start_date: string
        }
        Insert: {
          amount: number
          category_id: string
          created_at?: string
          household_id: string
          id?: string
          is_active?: boolean
          period: string
          rollover?: boolean
          start_date?: string
        }
        Update: {
          amount?: number
          category_id?: string
          created_at?: string
          household_id?: string
          id?: string
          is_active?: boolean
          period?: string
          rollover?: boolean
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          archived: boolean
          color: string | null
          created_at: string
          household_id: string
          icon: string | null
          id: string
          is_system: boolean
          kind: string
          name: string
          parent_id: string | null
        }
        Insert: {
          archived?: boolean
          color?: string | null
          created_at?: string
          household_id: string
          icon?: string | null
          id?: string
          is_system?: boolean
          kind: string
          name: string
          parent_id?: string | null
        }
        Update: {
          archived?: boolean
          color?: string | null
          created_at?: string
          household_id?: string
          icon?: string | null
          id?: string
          is_system?: boolean
          kind?: string
          name?: string
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      // NOTE: goals, goal_contributions and the goal_progress function below
      // were hand-added for migrations 0018/0019. Replace this whole file with a
      // real `supabase gen types typescript` once those are applied to the
      // finance project (ref dzxcrkoseqpjhwmthgyk).
      goal_contributions: {
        Row: {
          amount: number
          contrib_date: string
          created_at: string
          created_by: string | null
          goal_id: string
          household_id: string
          id: string
          note: string | null
        }
        Insert: {
          amount: number
          contrib_date?: string
          created_at?: string
          created_by?: string | null
          goal_id: string
          household_id: string
          id?: string
          note?: string | null
        }
        Update: {
          amount?: number
          contrib_date?: string
          created_at?: string
          created_by?: string | null
          goal_id?: string
          household_id?: string
          id?: string
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "goal_contributions_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_contributions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          color: string | null
          created_at: string
          household_id: string
          id: string
          is_active: boolean
          linked_account_id: string | null
          name: string
          sort_order: number
          target_amount: number
          target_date: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          household_id: string
          id?: string
          is_active?: boolean
          linked_account_id?: string | null
          name: string
          sort_order?: number
          target_amount: number
          target_date?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string
          household_id?: string
          id?: string
          is_active?: boolean
          linked_account_id?: string | null
          name?: string
          sort_order?: number
          target_amount?: number
          target_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "goals_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_linked_account_id_fkey"
            columns: ["linked_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      household_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          household_id: string
          id: string
          invited_by: string | null
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          household_id: string
          id?: string
          invited_by?: string | null
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          household_id?: string
          id?: string
          invited_by?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_invites_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      household_members: {
        Row: {
          created_at: string
          display_name: string | null
          household_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          household_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          household_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          base_currency: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          base_currency?: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          base_currency?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      import_batches: {
        Row: {
          account_id: string | null
          created_at: string
          created_by: string | null
          filename: string | null
          household_id: string
          id: string
          row_count: number
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          created_by?: string | null
          filename?: string | null
          household_id: string
          id?: string
          row_count?: number
        }
        Update: {
          account_id?: string | null
          created_at?: string
          created_by?: string | null
          filename?: string | null
          household_id?: string
          id?: string
          row_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "import_batches_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      import_mappings: {
        Row: {
          account_id: string
          household_id: string
          mapping: Json
          updated_at: string
        }
        Insert: {
          account_id: string
          household_id: string
          mapping: Json
          updated_at?: string
        }
        Update: {
          account_id?: string
          household_id?: string
          mapping?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_mappings_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      payslips: {
        Row: {
          created_at: string
          created_by: string | null
          deductions: number
          deposit_account_id: string | null
          employer: string | null
          gross: number
          household_id: string
          id: string
          income_transaction_id: string | null
          member_label: string | null
          net: number
          pay_date: string
          super: number
          super_account_id: string | null
          super_transaction_id: string | null
          tax: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deductions?: number
          deposit_account_id?: string | null
          employer?: string | null
          gross: number
          household_id: string
          id?: string
          income_transaction_id?: string | null
          member_label?: string | null
          net: number
          pay_date: string
          super?: number
          super_account_id?: string | null
          super_transaction_id?: string | null
          tax?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deductions?: number
          deposit_account_id?: string | null
          employer?: string | null
          gross?: number
          household_id?: string
          id?: string
          income_transaction_id?: string | null
          member_label?: string | null
          net?: number
          pay_date?: string
          super?: number
          super_account_id?: string | null
          super_transaction_id?: string | null
          tax?: number
        }
        Relationships: [
          {
            foreignKeyName: "payslips_deposit_account_id_fkey"
            columns: ["deposit_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payslips_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payslips_super_account_id_fkey"
            columns: ["super_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_rules: {
        Row: {
          account_id: string | null
          amount: number
          anchor_date: string
          auto_post: boolean
          category_id: string | null
          created_at: string
          day_of_month: number | null
          end_date: string | null
          frequency: string
          household_id: string
          id: string
          interval_count: number
          is_active: boolean
          name: string
          next_due_date: string | null
          type: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          anchor_date: string
          auto_post?: boolean
          category_id?: string | null
          created_at?: string
          day_of_month?: number | null
          end_date?: string | null
          frequency: string
          household_id: string
          id?: string
          interval_count?: number
          is_active?: boolean
          name: string
          next_due_date?: string | null
          type: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          anchor_date?: string
          auto_post?: boolean
          category_id?: string | null
          created_at?: string
          day_of_month?: number | null
          end_date?: string | null
          frequency?: string
          household_id?: string
          id?: string
          interval_count?: number
          is_active?: boolean
          name?: string
          next_due_date?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_rules_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_balances"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "recurring_rules_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_rules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_rules_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string
          amount: number
          category_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          household_id: string
          id: string
          import_batch_id: string | null
          merchant: string | null
          notes: string | null
          recurring_rule_id: string | null
          status: string
          transfer_group_id: string | null
          txn_date: string
          type: string
        }
        Insert: {
          account_id: string
          amount: number
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          household_id: string
          id?: string
          import_batch_id?: string | null
          merchant?: string | null
          notes?: string | null
          recurring_rule_id?: string | null
          status?: string
          transfer_group_id?: string | null
          txn_date: string
          type: string
        }
        Update: {
          account_id?: string
          amount?: number
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          household_id?: string
          id?: string
          import_batch_id?: string | null
          merchant?: string | null
          notes?: string | null
          recurring_rule_id?: string | null
          status?: string
          transfer_group_id?: string | null
          txn_date?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_balances"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_import_batch_id_fkey"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_recurring_rule_id_fkey"
            columns: ["recurring_rule_id"]
            isOneToOne: false
            referencedRelation: "recurring_rules"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      account_balances: {
        Row: {
          account_id: string | null
          balance: number | null
          class: string | null
          household_id: string | null
          include_in_net_worth: boolean | null
        }
        Insert: {
          account_id?: string | null
          balance?: never
          class?: string | null
          household_id?: string | null
          include_in_net_worth?: boolean | null
        }
        Update: {
          account_id?: string | null
          balance?: never
          class?: string | null
          household_id?: string | null
          include_in_net_worth?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "accounts_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      net_worth_current: {
        Row: {
          household_id: string | null
          net_worth: number | null
          total_assets: number | null
          total_liabilities: number | null
        }
        Relationships: [
          {
            foreignKeyName: "accounts_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      budget_actuals: {
        Args: { p_from: string; p_household: string; p_to: string }
        Returns: {
          category_id: string
          spend: number
        }[]
      }
      create_household: { Args: { household_name: string }; Returns: string }
      goal_progress: {
        Args: { p_household: string }
        Returns: {
          goal_id: string
          saved: number
        }[]
      }
      household_members_detail: {
        Args: { hid: string }
        Returns: {
          user_id: string
          role: string
          display_name: string | null
          email: string
        }[]
      }
      is_household_member: { Args: { hid: string }; Returns: boolean }
      seed_default_categories: { Args: { hid: string }; Returns: undefined }
      set_my_display_name: { Args: { p_name: string }; Returns: undefined }
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
