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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      learning_sessions: {
        Row: {
          context_type: string
          daf: string | null
          depth_mode: Database["public"]["Enums"]["learning_depth_mode"]
          ended_at: string | null
          id: string
          mesechta: string | null
          parsha: string | null
          sefer: string | null
          started_at: string
          title: string
          topic: string | null
          user_id: string
        }
        Insert: {
          context_type?: string
          daf?: string | null
          depth_mode?: Database["public"]["Enums"]["learning_depth_mode"]
          ended_at?: string | null
          id?: string
          mesechta?: string | null
          parsha?: string | null
          sefer?: string | null
          started_at?: string
          title: string
          topic?: string | null
          user_id: string
        }
        Update: {
          context_type?: string
          daf?: string | null
          depth_mode?: Database["public"]["Enums"]["learning_depth_mode"]
          ended_at?: string | null
          id?: string
          mesechta?: string | null
          parsha?: string | null
          sefer?: string | null
          started_at?: string
          title?: string
          topic?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          created_at: string
          id: string
          metadata: Json
          session_id: string
          speaker: string
          text: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json
          session_id: string
          speaker: string
          text: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json
          session_id?: string
          speaker?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "learning_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      note_anchor_sources: {
        Row: {
          note_id: string
          rank: number
          reference_label: string
          verification_status: string
          why_central: string
        }
        Insert: {
          note_id: string
          rank: number
          reference_label: string
          verification_status?: string
          why_central?: string
        }
        Update: {
          note_id?: string
          rank?: number
          reference_label?: string
          verification_status?: string
          why_central?: string
        }
        Relationships: [
          {
            foreignKeyName: "note_anchor_sources_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
        ]
      }
      note_facets: {
        Row: {
          facet_type: string
          facet_value: string
          note_id: string
        }
        Insert: {
          facet_type: string
          facet_value: string
          note_id: string
        }
        Update: {
          facet_type?: string
          facet_value?: string
          note_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "note_facets_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
        ]
      }
      note_sessions: {
        Row: {
          note_id: string
          session_id: string
        }
        Insert: {
          note_id: string
          session_id: string
        }
        Update: {
          note_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "note_sessions_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "note_sessions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "learning_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      note_versions: {
        Row: {
          author_display_name: string
          author_thesis_snapshot: string
          body: string
          change_reason: string
          created_at: string
          created_by: string
          id: string
          note_id: string
          parent_version_id: string | null
          summary: string
          title_snapshot: string
          version_number: number
        }
        Insert: {
          author_display_name: string
          author_thesis_snapshot: string
          body: string
          change_reason: string
          created_at?: string
          created_by: string
          id?: string
          note_id: string
          parent_version_id?: string | null
          summary?: string
          title_snapshot: string
          version_number: number
        }
        Update: {
          author_display_name?: string
          author_thesis_snapshot?: string
          body?: string
          change_reason?: string
          created_at?: string
          created_by?: string
          id?: string
          note_id?: string
          parent_version_id?: string | null
          summary?: string
          title_snapshot?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "note_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "note_versions_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "note_versions_note_id_parent_version_id_fkey"
            columns: ["note_id", "parent_version_id"]
            isOneToOne: false
            referencedRelation: "note_versions"
            referencedColumns: ["note_id", "id"]
          },
        ]
      }
      notes: {
        Row: {
          author_display_name: string
          author_thesis: string
          created_at: string
          current_version_id: string
          id: string
          owner_user_id: string
          title: string
          updated_at: string
        }
        Insert: {
          author_display_name: string
          author_thesis: string
          created_at?: string
          current_version_id: string
          id?: string
          owner_user_id: string
          title: string
          updated_at?: string
        }
        Update: {
          author_display_name?: string
          author_thesis?: string
          created_at?: string
          current_version_id?: string
          id?: string
          owner_user_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "current_version_same_note"
            columns: ["id", "current_version_id"]
            isOneToOne: false
            referencedRelation: "note_versions"
            referencedColumns: ["note_id", "id"]
          },
          {
            foreignKeyName: "notes_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          default_depth_mode: Database["public"]["Enums"]["learning_depth_mode"]
          display_name: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_depth_mode?: Database["public"]["Enums"]["learning_depth_mode"]
          display_name: string
          id: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_depth_mode?: Database["public"]["Enums"]["learning_depth_mode"]
          display_name?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      questions: {
        Row: {
          created_at: string
          id: string
          note_id: string | null
          owner_user_id: string
          question_text: string
          session_id: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          note_id?: string | null
          owner_user_id: string
          question_text: string
          session_id?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          note_id?: string | null
          owner_user_id?: string
          question_text?: string
          session_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "learning_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_global_admin: { Args: never; Returns: boolean }
      restore_learning_note: {
        Args: {
          p_expected_version_id: string
          p_note_id: string
          p_version_id: string
        }
        Returns: string
      }
      save_learning_note: {
        Args: {
          p_anchors: Json
          p_author_thesis: string
          p_body: string
          p_change_reason: string
          p_expected_version_id: string
          p_facets: Json
          p_note_id: string
          p_session_ids: string[]
          p_summary: string
          p_title: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "USER" | "GLOBAL_ADMIN"
      learning_depth_mode: "READING" | "BE_IYUN"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["USER", "GLOBAL_ADMIN"],
      learning_depth_mode: ["READING", "BE_IYUN"],
    },
  },
} as const
