export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          at: string
          diff: Json | null
          entity: string
          entity_id: string
          id: string
          org_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          at?: string
          diff?: Json | null
          entity: string
          entity_id: string
          id?: string
          org_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          at?: string
          diff?: Json | null
          entity?: string
          entity_id?: string
          id?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment: {
        Row: {
          archived_at: string | null
          created_at: string
          id: string
          installed_at: string | null
          make_model: string | null
          notes: string | null
          org_id: string
          property_id: string
          type: string
          warranty_until: string | null
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          id?: string
          installed_at?: string | null
          make_model?: string | null
          notes?: string | null
          org_id: string
          property_id: string
          type: string
          warranty_until?: string | null
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          id?: string
          installed_at?: string | null
          make_model?: string | null
          notes?: string | null
          org_id?: string
          property_id?: string
          type?: string
          warranty_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property"
            referencedColumns: ["id"]
          },
        ]
      }
      invite: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string | null
          expires_at: string
          id: string
          invited_by: string
          org_id: string
          property_ids: string[]
          role: Database["public"]["Enums"]["member_role"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email?: string | null
          expires_at?: string
          id?: string
          invited_by: string
          org_id: string
          property_ids?: string[]
          role: Database["public"]["Enums"]["member_role"]
          token: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string | null
          expires_at?: string
          id?: string
          invited_by?: string
          org_id?: string
          property_ids?: string[]
          role?: Database["public"]["Enums"]["member_role"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invite_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invite_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org"
            referencedColumns: ["id"]
          },
        ]
      }
      issue_tag: {
        Row: {
          confirmed_at: string | null
          confirmed_by: string | null
          id: string
          source: string
          tag: string
          turnover_id: string
        }
        Insert: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          id?: string
          source: string
          tag: string
          turnover_id: string
        }
        Update: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          id?: string
          source?: string
          tag?: string
          turnover_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "issue_tag_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issue_tag_turnover_id_fkey"
            columns: ["turnover_id"]
            isOneToOne: false
            referencedRelation: "turnover"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_log: {
        Row: {
          created_at: string
          done_at: string
          done_by: string | null
          id: string
          note: string | null
          property_id: string
          task_id: string
        }
        Insert: {
          created_at?: string
          done_at?: string
          done_by?: string | null
          id?: string
          note?: string | null
          property_id: string
          task_id: string
        }
        Update: {
          created_at?: string
          done_at?: string
          done_by?: string | null
          id?: string
          note?: string | null
          property_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_log_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_log_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "maintenance_task"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_task: {
        Row: {
          archived_at: string | null
          created_at: string
          id: string
          last_done_at: string | null
          notes: string | null
          org_id: string
          property_id: string
          recurrence_kind: Database["public"]["Enums"]["maintenance_recurrence_kind"]
          recurrence_unit:
            | Database["public"]["Enums"]["maintenance_recurrence_unit"]
            | null
          recurrence_value: number
          title: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          id?: string
          last_done_at?: string | null
          notes?: string | null
          org_id: string
          property_id: string
          recurrence_kind: Database["public"]["Enums"]["maintenance_recurrence_kind"]
          recurrence_unit?:
            | Database["public"]["Enums"]["maintenance_recurrence_unit"]
            | null
          recurrence_value: number
          title: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          id?: string
          last_done_at?: string | null
          notes?: string | null
          org_id?: string
          property_id?: string
          recurrence_kind?: Database["public"]["Enums"]["maintenance_recurrence_kind"]
          recurrence_unit?:
            | Database["public"]["Enums"]["maintenance_recurrence_unit"]
            | null
          recurrence_value?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_task_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_task_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property"
            referencedColumns: ["id"]
          },
        ]
      }
      membership: {
        Row: {
          created_at: string
          id: string
          org_id: string
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      notification: {
        Row: {
          created_at: string
          id: string
          message: string
          org_id: string
          property_id: string | null
          read_at: string | null
          scheduled_item_id: string | null
          turnover_id: string | null
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          org_id: string
          property_id?: string | null
          read_at?: string | null
          scheduled_item_id?: string | null
          turnover_id?: string | null
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          org_id?: string
          property_id?: string | null
          read_at?: string | null
          scheduled_item_id?: string | null
          turnover_id?: string | null
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_scheduled_item_id_fkey"
            columns: ["scheduled_item_id"]
            isOneToOne: false
            referencedRelation: "scheduled_item"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_turnover_id_fkey"
            columns: ["turnover_id"]
            isOneToOne: false
            referencedRelation: "turnover"
            referencedColumns: ["id"]
          },
        ]
      }
      org: {
        Row: {
          billing_ref: string | null
          created_at: string
          id: string
          name: string
          plan: string
        }
        Insert: {
          billing_ref?: string | null
          created_at?: string
          id?: string
          name: string
          plan?: string
        }
        Update: {
          billing_ref?: string | null
          created_at?: string
          id?: string
          name?: string
          plan?: string
        }
        Relationships: []
      }
      org_note: {
        Row: {
          body: string | null
          org_id: string
          updated_at: string
        }
        Insert: {
          body?: string | null
          org_id: string
          updated_at?: string
        }
        Update: {
          body?: string | null
          org_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_note_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "org"
            referencedColumns: ["id"]
          },
        ]
      }
      photo: {
        Row: {
          ai_suggested_tags: string[]
          caption: string | null
          captured_at: string | null
          confirmed_tags: string[]
          created_at: string
          id: string
          phase: Database["public"]["Enums"]["capture_phase"]
          slot: Database["public"]["Enums"]["photo_slot"]
          storage_path: string | null
          turnover_id: string
        }
        Insert: {
          ai_suggested_tags?: string[]
          caption?: string | null
          captured_at?: string | null
          confirmed_tags?: string[]
          created_at?: string
          id?: string
          phase?: Database["public"]["Enums"]["capture_phase"]
          slot: Database["public"]["Enums"]["photo_slot"]
          storage_path?: string | null
          turnover_id: string
        }
        Update: {
          ai_suggested_tags?: string[]
          caption?: string | null
          captured_at?: string | null
          confirmed_tags?: string[]
          created_at?: string
          id?: string
          phase?: Database["public"]["Enums"]["capture_phase"]
          slot?: Database["public"]["Enums"]["photo_slot"]
          storage_path?: string | null
          turnover_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "photo_turnover_id_fkey"
            columns: ["turnover_id"]
            isOneToOne: false
            referencedRelation: "turnover"
            referencedColumns: ["id"]
          },
        ]
      }
      profile: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      proof_event: {
        Row: {
          actor_user_id: string | null
          id: string
          kind: string
          occurred_at: string
          turnover_id: string
        }
        Insert: {
          actor_user_id?: string | null
          id?: string
          kind: string
          occurred_at?: string
          turnover_id: string
        }
        Update: {
          actor_user_id?: string | null
          id?: string
          kind?: string
          occurred_at?: string
          turnover_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proof_event_turnover_id_fkey"
            columns: ["turnover_id"]
            isOneToOne: false
            referencedRelation: "turnover"
            referencedColumns: ["id"]
          },
        ]
      }
      property: {
        Row: {
          address: string | null
          created_at: string
          geofence_radius_m: number
          id: string
          lat: number | null
          lng: number | null
          name: string
          org_id: string
          sanitizer_type: Database["public"]["Enums"]["sanitizer_type"]
          tub_notes: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          geofence_radius_m?: number
          id?: string
          lat?: number | null
          lng?: number | null
          name: string
          org_id: string
          sanitizer_type?: Database["public"]["Enums"]["sanitizer_type"]
          tub_notes?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          geofence_radius_m?: number
          id?: string
          lat?: number | null
          lng?: number | null
          name?: string
          org_id?: string
          sanitizer_type?: Database["public"]["Enums"]["sanitizer_type"]
          tub_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org"
            referencedColumns: ["id"]
          },
        ]
      }
      property_owner: {
        Row: {
          owner_user_id: string
          property_id: string
        }
        Insert: {
          owner_user_id: string
          property_id: string
        }
        Update: {
          owner_user_id?: string
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_owner_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_owner_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_item: {
        Row: {
          archived_at: string | null
          assignee_user_id: string | null
          created_at: string
          done_at: string | null
          id: string
          kind: Database["public"]["Enums"]["scheduled_item_kind"]
          maintenance_task_id: string | null
          notes: string | null
          org_id: string
          property_id: string
          scheduled_for: string
          source: Database["public"]["Enums"]["scheduled_item_source"]
          status: Database["public"]["Enums"]["scheduled_item_status"]
          title: string
          turnover_id: string | null
        }
        Insert: {
          archived_at?: string | null
          assignee_user_id?: string | null
          created_at?: string
          done_at?: string | null
          id?: string
          kind: Database["public"]["Enums"]["scheduled_item_kind"]
          maintenance_task_id?: string | null
          notes?: string | null
          org_id: string
          property_id: string
          scheduled_for: string
          source?: Database["public"]["Enums"]["scheduled_item_source"]
          status?: Database["public"]["Enums"]["scheduled_item_status"]
          title: string
          turnover_id?: string | null
        }
        Update: {
          archived_at?: string | null
          assignee_user_id?: string | null
          created_at?: string
          done_at?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["scheduled_item_kind"]
          maintenance_task_id?: string | null
          notes?: string | null
          org_id?: string
          property_id?: string
          scheduled_for?: string
          source?: Database["public"]["Enums"]["scheduled_item_source"]
          status?: Database["public"]["Enums"]["scheduled_item_status"]
          title?: string
          turnover_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_item_maintenance_task_id_fkey"
            columns: ["maintenance_task_id"]
            isOneToOne: false
            referencedRelation: "maintenance_task"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_item_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "org"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_item_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_item_turnover_id_fkey"
            columns: ["turnover_id"]
            isOneToOne: false
            referencedRelation: "turnover"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_assignment: {
        Row: {
          property_id: string
          staff_user_id: string
        }
        Insert: {
          property_id: string
          staff_user_id: string
        }
        Update: {
          property_id?: string
          staff_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_assignment_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_assignment_staff_user_id_fkey"
            columns: ["staff_user_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      task: {
        Row: {
          created_at: string
          due_at: string | null
          id: string
          property_id: string
          recurrence: string | null
          status: string
          title: string
        }
        Insert: {
          created_at?: string
          due_at?: string | null
          id?: string
          property_id: string
          recurrence?: string | null
          status?: string
          title: string
        }
        Update: {
          created_at?: string
          due_at?: string | null
          id?: string
          property_id?: string
          recurrence?: string | null
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property"
            referencedColumns: ["id"]
          },
        ]
      }
      turnover: {
        Row: {
          capture_lat: number | null
          capture_lng: number | null
          cleaning_steps: string[]
          created_at: string
          geofence_ok: boolean | null
          id: string
          notes: string | null
          property_id: string
          share_token: string | null
          status: Database["public"]["Enums"]["turnover_status"]
          submitted_at_server: string
          submitter_id: string
          urgent: boolean
          version: number
        }
        Insert: {
          capture_lat?: number | null
          capture_lng?: number | null
          cleaning_steps?: string[]
          created_at?: string
          geofence_ok?: boolean | null
          id?: string
          notes?: string | null
          property_id: string
          share_token?: string | null
          status?: Database["public"]["Enums"]["turnover_status"]
          submitted_at_server?: string
          submitter_id: string
          urgent?: boolean
          version?: number
        }
        Update: {
          capture_lat?: number | null
          capture_lng?: number | null
          cleaning_steps?: string[]
          created_at?: string
          geofence_ok?: boolean | null
          id?: string
          notes?: string | null
          property_id?: string
          share_token?: string | null
          status?: Database["public"]["Enums"]["turnover_status"]
          submitted_at_server?: string
          submitter_id?: string
          urgent?: boolean
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "turnover_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turnover_submitter_id_fkey"
            columns: ["submitter_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist: {
        Row: {
          created_at: string
          email: string
          id: string
          source: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          source?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          source?: string
        }
        Relationships: []
      }
      water_reading: {
        Row: {
          balanced: boolean
          calcium_hardness: number | null
          created_at: string
          id: string
          ph: number | null
          property_id: string
          recorded_at: string
          sanitizer_ppm: number | null
          temp_f: number | null
          total_alkalinity: number | null
          treatment_note: string | null
          treatments: string[]
          turnover_id: string
        }
        Insert: {
          balanced?: boolean
          calcium_hardness?: number | null
          created_at?: string
          id?: string
          ph?: number | null
          property_id: string
          recorded_at?: string
          sanitizer_ppm?: number | null
          temp_f?: number | null
          total_alkalinity?: number | null
          treatment_note?: string | null
          treatments?: string[]
          turnover_id: string
        }
        Update: {
          balanced?: boolean
          calcium_hardness?: number | null
          created_at?: string
          id?: string
          ph?: number | null
          property_id?: string
          recorded_at?: string
          sanitizer_ppm?: number | null
          temp_f?: number | null
          total_alkalinity?: number | null
          treatment_note?: string | null
          treatments?: string[]
          turnover_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "water_reading_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "water_reading_turnover_id_fkey"
            columns: ["turnover_id"]
            isOneToOne: true
            referencedRelation: "turnover"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invite: { Args: { p_token: string }; Returns: string }
      app_can_capture_property: {
        Args: { p_property: string }
        Returns: boolean
      }
      app_can_see_property: { Args: { p_property: string }; Returns: boolean }
      app_has_role: {
        Args: {
          p_org: string
          p_role: Database["public"]["Enums"]["member_role"]
        }
        Returns: boolean
      }
      app_is_member: { Args: { p_org: string }; Returns: boolean }
      app_shares_org: { Args: { p_user: string }; Returns: boolean }
      founder_metrics: { Args: never; Returns: Json }
      fulfill_scheduled_turnover: {
        Args: { p_turnover_id: string }
        Returns: string
      }
      get_invite_preview: { Args: { p_token: string }; Returns: Json }
      notify_scheduled_assignment: {
        Args: { p_scheduled_item_id: string }
        Returns: undefined
      }
      notify_turnover_ready: {
        Args: { p_turnover_id: string }
        Returns: {
          email: string
        }[]
      }
      nudge_stale_draft_turnovers: {
        Args: { p_threshold?: string }
        Returns: number
      }
      record_proof_open: { Args: { p_share_token: string }; Returns: undefined }
    }
    Enums: {
      capture_phase: "before" | "after"
      maintenance_recurrence_kind: "time" | "turnover"
      maintenance_recurrence_unit: "day" | "week" | "month"
      member_role: "operator" | "staff" | "owner"
      notification_type: "turnover_ready" | "assigned" | "draft_reminder"
      photo_slot:
        | "wide"
        | "waterline"
        | "panel"
        | "cover"
        | "full_frame"
        | "water_level"
        | "issue"
      sanitizer_type: "chlorine" | "bromine"
      scheduled_item_kind: "turnover" | "maintenance" | "custom"
      scheduled_item_source: "manual" | "auto"
      scheduled_item_status: "scheduled" | "done" | "skipped"
      turnover_status: "draft" | "submitted_locked"
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
    Enums: {
      capture_phase: ["before", "after"],
      maintenance_recurrence_kind: ["time", "turnover"],
      maintenance_recurrence_unit: ["day", "week", "month"],
      member_role: ["operator", "staff", "owner"],
      notification_type: ["turnover_ready", "assigned", "draft_reminder"],
      photo_slot: [
        "wide",
        "waterline",
        "panel",
        "cover",
        "full_frame",
        "water_level",
        "issue",
      ],
      sanitizer_type: ["chlorine", "bromine"],
      scheduled_item_kind: ["turnover", "maintenance", "custom"],
      scheduled_item_source: ["manual", "auto"],
      scheduled_item_status: ["scheduled", "done", "skipped"],
      turnover_status: ["draft", "submitted_locked"],
    },
  },
} as const

