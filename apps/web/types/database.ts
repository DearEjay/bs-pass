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
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_type: string
          created_at: string | null
          diff: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          project_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_type?: string
          created_at?: string | null
          diff?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          project_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_type?: string
          created_at?: string | null
          diff?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          project_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          body: string | null
          created_at: string | null
          id: string
          is_deleted: boolean
          mention_all: boolean
          mentions: string[] | null
          project_id: string
          sender_id: string | null
          sender_type: string
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          id?: string
          is_deleted?: boolean
          mention_all?: boolean
          mentions?: string[] | null
          project_id: string
          sender_id?: string | null
          sender_type?: string
        }
        Update: {
          body?: string | null
          created_at?: string | null
          id?: string
          is_deleted?: boolean
          mention_all?: boolean
          mentions?: string[] | null
          project_id?: string
          sender_id?: string | null
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      collaborators: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          id: string
          invite_token: string | null
          invited_at: string | null
          is_main_artist: boolean
          muted_user_ids: string[] | null
          notif_prefs: Json | null
          project_id: string
          removed_at: string | null
          roles: string[]
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          id?: string
          invite_token?: string | null
          invited_at?: string | null
          is_main_artist?: boolean
          muted_user_ids?: string[] | null
          notif_prefs?: Json | null
          project_id: string
          removed_at?: string | null
          roles?: string[]
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          id?: string
          invite_token?: string | null
          invited_at?: string | null
          is_main_artist?: boolean
          muted_user_ids?: string[] | null
          notif_prefs?: Json | null
          project_id?: string
          removed_at?: string | null
          roles?: string[]
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collaborators_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collaborators_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          payload: Json
          project_id: string | null
          read_at: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          payload?: Json
          project_id?: string | null
          read_at?: string | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          payload?: Json
          project_id?: string | null
          read_at?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_invites: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          email: string
          expires_at: string
          id: string
          invite_token: string
          invited_by: string
          project_id: string
          roles: string[]
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          email: string
          expires_at?: string
          id?: string
          invite_token?: string
          invited_by: string
          project_id: string
          roles?: string[]
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          invite_token?: string
          invited_by?: string
          project_id?: string
          roles?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "pending_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_invites_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_name: string
          full_name: string | null
          global_notif_prefs: Json | null
          id: string
          ipi_number: string | null
          pro_name: string | null
          tos_accepted_at: string | null
          tos_version: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          display_name: string
          full_name?: string | null
          global_notif_prefs?: Json | null
          id: string
          ipi_number?: string | null
          pro_name?: string | null
          tos_accepted_at?: string | null
          tos_version?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string
          full_name?: string | null
          global_notif_prefs?: Json | null
          id?: string
          ipi_number?: string | null
          pro_name?: string | null
          tos_accepted_at?: string | null
          tos_version?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          agent_mode: string
          auto_tasks_enabled: boolean
          budget_level: string | null
          cover_url: string | null
          created_at: string | null
          deleted_at: string | null
          genre: string | null
          id: string
          owner_id: string
          project_type: string
          record_label: string | null
          release_date: string | null
          status: string
          target_track_count: number | null
          timeline_end: string | null
          timeline_start: string | null
          title: string
          updated_at: string | null
          upc: string | null
        }
        Insert: {
          agent_mode?: string
          auto_tasks_enabled?: boolean
          budget_level?: string | null
          cover_url?: string | null
          created_at?: string | null
          deleted_at?: string | null
          genre?: string | null
          id?: string
          owner_id: string
          project_type: string
          record_label?: string | null
          release_date?: string | null
          status?: string
          target_track_count?: number | null
          timeline_end?: string | null
          timeline_start?: string | null
          title: string
          updated_at?: string | null
          upc?: string | null
        }
        Update: {
          agent_mode?: string
          auto_tasks_enabled?: boolean
          budget_level?: string | null
          cover_url?: string | null
          created_at?: string | null
          deleted_at?: string | null
          genre?: string | null
          id?: string
          owner_id?: string
          project_type?: string
          record_label?: string | null
          release_date?: string | null
          status?: string
          target_track_count?: number | null
          timeline_end?: string | null
          timeline_start?: string | null
          title?: string
          updated_at?: string | null
          upc?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      roadmap_templates: {
        Row: {
          created_at: string | null
          id: string
          project_type: string
          tasks: Json
          title: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          project_type: string
          tasks: Json
          title: string
        }
        Update: {
          created_at?: string | null
          id?: string
          project_type?: string
          tasks?: Json
          title?: string
        }
        Relationships: []
      }
      splits: {
        Row: {
          collaborator_id: string
          created_at: string | null
          id: string
          percentage: number
          role: string | null
          signature_token: string | null
          signed_at: string | null
          signed_ip: string | null
          split_status: string
          token_expires_at: string | null
          track_id: string
          updated_at: string | null
        }
        Insert: {
          collaborator_id: string
          created_at?: string | null
          id?: string
          percentage: number
          role?: string | null
          signature_token?: string | null
          signed_at?: string | null
          signed_ip?: string | null
          split_status?: string
          token_expires_at?: string | null
          track_id: string
          updated_at?: string | null
        }
        Update: {
          collaborator_id?: string
          created_at?: string | null
          id?: string
          percentage?: number
          role?: string | null
          signature_token?: string | null
          signed_at?: string | null
          signed_ip?: string | null
          split_status?: string
          token_expires_at?: string | null
          track_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "splits_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "splits_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      stem_versions: {
        Row: {
          created_at: string | null
          id: string
          stem_id: string
          storage_path: string
          uploaded_by: string | null
          version_number: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          stem_id: string
          storage_path: string
          uploaded_by?: string | null
          version_number?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          stem_id?: string
          storage_path?: string
          uploaded_by?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "stem_versions_stem_id_fkey"
            columns: ["stem_id"]
            isOneToOne: false
            referencedRelation: "stems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stem_versions_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stems: {
        Row: {
          created_at: string | null
          current_stem_version_id: string | null
          deleted_at: string | null
          duration_secs: number | null
          file_size_bytes: number | null
          id: string
          name: string
          storage_path: string
          track_id: string
          track_version_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_stem_version_id?: string | null
          deleted_at?: string | null
          duration_secs?: number | null
          file_size_bytes?: number | null
          id?: string
          name: string
          storage_path: string
          track_id: string
          track_version_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_stem_version_id?: string | null
          deleted_at?: string | null
          duration_secs?: number | null
          file_size_bytes?: number | null
          id?: string
          name?: string
          storage_path?: string
          track_id?: string
          track_version_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_current_stem_version"
            columns: ["current_stem_version_id"]
            isOneToOne: false
            referencedRelation: "stem_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stems_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stems_track_version_id_fkey"
            columns: ["track_version_id"]
            isOneToOne: false
            referencedRelation: "track_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      task_dependencies: {
        Row: {
          created_at: string | null
          depends_on_id: string
          id: string
          task_id: string
        }
        Insert: {
          created_at?: string | null
          depends_on_id: string
          id?: string
          task_id: string
        }
        Update: {
          created_at?: string | null
          depends_on_id?: string
          id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_dependencies_depends_on_id_fkey"
            columns: ["depends_on_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_dependencies_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignee_id: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          created_by: string
          deleted_at: string | null
          description: string | null
          due_date: string | null
          id: string
          plugin_name: string | null
          priority: string
          project_id: string
          sort_order: number | null
          start_date: string | null
          status: string
          title: string
          updated_at: string | null
        }
        Insert: {
          assignee_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          created_by?: string
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          plugin_name?: string | null
          priority?: string
          project_id: string
          sort_order?: number | null
          start_date?: string | null
          status?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          assignee_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          created_by?: string
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          plugin_name?: string | null
          priority?: string
          project_id?: string
          sort_order?: number | null
          start_date?: string | null
          status?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      track_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          deleted_at: string | null
          id: string
          project_id: string
          timestamp_secs: number
          track_id: string
          track_version_id: string | null
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          project_id: string
          timestamp_secs: number
          track_id: string
          track_version_id?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          project_id?: string
          timestamp_secs?: number
          track_id?: string
          track_version_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "track_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "track_comments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "track_comments_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "track_comments_track_version_id_fkey"
            columns: ["track_version_id"]
            isOneToOne: false
            referencedRelation: "track_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      track_credits: {
        Row: {
          created_at: string | null
          id: string
          name: string
          role: string
          sort_order: number | null
          track_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name?: string
          role?: string
          sort_order?: number | null
          track_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          role?: string
          sort_order?: number | null
          track_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "track_credits_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      track_versions: {
        Row: {
          bpm: number | null
          created_at: string | null
          duration_secs: number | null
          file_path: string | null
          id: string
          key: string | null
          notes: string | null
          track_id: string
          version_label: string
          version_number: number
        }
        Insert: {
          bpm?: number | null
          created_at?: string | null
          duration_secs?: number | null
          file_path?: string | null
          id?: string
          key?: string | null
          notes?: string | null
          track_id: string
          version_label?: string
          version_number?: number
        }
        Update: {
          bpm?: number | null
          created_at?: string | null
          duration_secs?: number | null
          file_path?: string | null
          id?: string
          key?: string | null
          notes?: string | null
          track_id?: string
          version_label?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "track_versions_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      tracks: {
        Row: {
          bpm: number | null
          created_at: string | null
          current_status: string
          current_version_id: string | null
          deleted_at: string | null
          duration_secs: number | null
          id: string
          isrc: string | null
          key: string | null
          language: string | null
          lyrics: string | null
          project_id: string
          record_label: string | null
          release_date: string | null
          sort_order: number | null
          splits_agent_locked: boolean
          title: string
          track_cover_url: string | null
          updated_at: string | null
        }
        Insert: {
          bpm?: number | null
          created_at?: string | null
          current_status?: string
          current_version_id?: string | null
          deleted_at?: string | null
          duration_secs?: number | null
          id?: string
          isrc?: string | null
          key?: string | null
          language?: string | null
          lyrics?: string | null
          project_id: string
          record_label?: string | null
          release_date?: string | null
          sort_order?: number | null
          splits_agent_locked?: boolean
          title: string
          track_cover_url?: string | null
          updated_at?: string | null
        }
        Update: {
          bpm?: number | null
          created_at?: string | null
          current_status?: string
          current_version_id?: string | null
          deleted_at?: string | null
          duration_secs?: number | null
          id?: string
          isrc?: string | null
          key?: string | null
          language?: string | null
          lyrics?: string | null
          project_id?: string
          record_label?: string | null
          release_date?: string | null
          sort_order?: number | null
          splits_agent_locked?: boolean
          title?: string
          track_cover_url?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_current_version"
            columns: ["current_version_id"]
            isOneToOne: false
            referencedRelation: "track_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_agent_preferences: {
        Row: {
          agent_tone: string | null
          agent_verbosity: string | null
          auto_assign_roles: Json | null
          auto_task_triggers: boolean | null
          avoided_task_types: string[] | null
          created_at: string | null
          enabled_plugins: Json | null
          id: string
          learning_enabled: boolean | null
          preferred_agent_mode: string | null
          preferred_timeline_buffer_days: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          agent_tone?: string | null
          agent_verbosity?: string | null
          auto_assign_roles?: Json | null
          auto_task_triggers?: boolean | null
          avoided_task_types?: string[] | null
          created_at?: string | null
          enabled_plugins?: Json | null
          id?: string
          learning_enabled?: boolean | null
          preferred_agent_mode?: string | null
          preferred_timeline_buffer_days?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          agent_tone?: string | null
          agent_verbosity?: string | null
          auto_assign_roles?: Json | null
          auto_task_triggers?: boolean | null
          avoided_task_types?: string[] | null
          created_at?: string | null
          enabled_plugins?: Json | null
          id?: string
          learning_enabled?: boolean | null
          preferred_agent_mode?: string | null
          preferred_timeline_buffer_days?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_agent_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_emails_by_user_ids: {
        Args: { p_user_ids: string[] }
        Returns: {
          email: string
          id: string
        }[]
      }
      get_invite_by_token: { Args: { p_token: string }; Returns: Json }
      get_split_by_token: { Args: { p_token: string }; Returns: Json }
      get_user_id_by_email: { Args: { p_email: string }; Returns: string }
      is_project_collaborator_from_path: {
        Args: { object_name: string }
        Returns: boolean
      }
      is_project_main_artist: {
        Args: { p_project_id: string }
        Returns: boolean
      }
      is_project_member: { Args: { p_project_id: string }; Returns: boolean }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
