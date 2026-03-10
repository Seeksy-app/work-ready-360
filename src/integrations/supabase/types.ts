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
      interest_profiler_results: {
        Row: {
          completed_at: string
          created_at: string
          id: string
          responses: Json
          scores: Json
          top_interests: string[]
          user_id: string
        }
        Insert: {
          completed_at?: string
          created_at?: string
          id?: string
          responses: Json
          scores: Json
          top_interests: string[]
          user_id: string
        }
        Update: {
          completed_at?: string
          created_at?: string
          id?: string
          responses?: Json
          scores?: Json
          top_interests?: string[]
          user_id?: string
        }
        Relationships: []
      }
      podcasts: {
        Row: {
          audio_url: string | null
          created_at: string
          duration_seconds: number | null
          id: string
          job_listing_url: string | null
          occupation_code: string | null
          occupation_title: string | null
          status: string
          title: string
          transcript: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          audio_url?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          job_listing_url?: string | null
          occupation_code?: string | null
          occupation_title?: string | null
          status?: string
          title: string
          transcript?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          audio_url?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          job_listing_url?: string | null
          occupation_code?: string | null
          occupation_title?: string | null
          status?: string
          title?: string
          transcript?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          notifications_enabled: boolean | null
          role: string
          updated_at: string
          user_id: string
          zip_code: string | null
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          notifications_enabled?: boolean | null
          role?: string
          updated_at?: string
          user_id: string
          zip_code?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          notifications_enabled?: boolean | null
          role?: string
          updated_at?: string
          user_id?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      resumes: {
        Row: {
          created_at: string
          file_name: string
          file_url: string
          id: string
          parsed_content: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_url: string
          id?: string
          parsed_content?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_url?: string
          id?: string
          parsed_content?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wip_block_responses: {
        Row: {
          assigned_rank: number
          block_number: number
          created_at: string
          id: string
          item_id: number
          session_id: string
        }
        Insert: {
          assigned_rank: number
          block_number: number
          created_at?: string
          id?: string
          item_id: number
          session_id: string
        }
        Update: {
          assigned_rank?: number
          block_number?: number
          created_at?: string
          id?: string
          item_id?: number
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wip_block_responses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "wip_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      wip_importance_responses: {
        Row: {
          created_at: string
          id: string
          is_important: boolean
          item_id: number
          session_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_important: boolean
          item_id: number
          session_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_important?: boolean
          item_id?: number
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wip_importance_responses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "wip_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      wip_item_scores: {
        Row: {
          adjusted_votes: number
          final_score: number
          id: string
          initial_z: number
          item_id: number
          proportion_p: number
          raw_votes: number
          session_id: string
        }
        Insert: {
          adjusted_votes: number
          final_score: number
          id?: string
          initial_z: number
          item_id: number
          proportion_p: number
          raw_votes: number
          session_id: string
        }
        Update: {
          adjusted_votes?: number
          final_score?: number
          id?: string
          initial_z?: number
          item_id?: number
          proportion_p?: number
          raw_votes?: number
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wip_item_scores_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "wip_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      wip_scale_scores: {
        Row: {
          id: string
          rank_order: number
          scale_key: string
          scale_label: string
          score: number
          session_id: string
        }
        Insert: {
          id?: string
          rank_order: number
          scale_key: string
          scale_label: string
          score: number
          session_id: string
        }
        Update: {
          id?: string
          rank_order?: number
          scale_key?: string
          scale_label?: string
          score?: number
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wip_scale_scores_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "wip_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      wip_sessions: {
        Row: {
          completed_at: string | null
          consistency_flag: boolean | null
          consistency_score: number | null
          created_at: string
          id: string
          is_demo: boolean | null
          result_payload: Json | null
          source: string | null
          status: string
          top_scale_1: string | null
          top_scale_2: string | null
          user_id: string
          zero_point_raw_votes: number | null
          zero_point_z: number | null
        }
        Insert: {
          completed_at?: string | null
          consistency_flag?: boolean | null
          consistency_score?: number | null
          created_at?: string
          id?: string
          is_demo?: boolean | null
          result_payload?: Json | null
          source?: string | null
          status?: string
          top_scale_1?: string | null
          top_scale_2?: string | null
          user_id: string
          zero_point_raw_votes?: number | null
          zero_point_z?: number | null
        }
        Update: {
          completed_at?: string | null
          consistency_flag?: boolean | null
          consistency_score?: number | null
          created_at?: string
          id?: string
          is_demo?: boolean | null
          result_payload?: Json | null
          source?: string | null
          status?: string
          top_scale_1?: string | null
          top_scale_2?: string | null
          user_id?: string
          zero_point_raw_votes?: number | null
          zero_point_z?: number | null
        }
        Relationships: []
      }
      work_importance_results: {
        Row: {
          completed_at: string
          created_at: string
          id: string
          responses: Json
          scores: Json
          top_values: string[]
          user_id: string
        }
        Insert: {
          completed_at?: string
          created_at?: string
          id?: string
          responses: Json
          scores: Json
          top_values: string[]
          user_id: string
        }
        Update: {
          completed_at?: string
          created_at?: string
          id?: string
          responses?: Json
          scores?: Json
          top_values?: string[]
          user_id?: string
        }
        Relationships: []
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
