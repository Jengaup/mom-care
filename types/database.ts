// Tipos de la base de datos.
// Escrito a mano a partir de las migraciones (el entorno de dev sin Docker no
// puede correr `supabase gen types`). Regenerable con:
//   npm run db:types            # requiere el stack local (supabase start)
// Mantener sincronizado con supabase/migrations/*.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          role: Database["public"]["Enums"]["user_role"];
          phone: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          phone?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          phone?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      patients: {
        Row: {
          id: string;
          full_name: string;
          birth_date: string | null;
          notes: string | null;
          grace_minutes: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          full_name: string;
          birth_date?: string | null;
          notes?: string | null;
          grace_minutes?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          birth_date?: string | null;
          notes?: string | null;
          grace_minutes?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      caregiver_patients: {
        Row: {
          id: string;
          profile_id: string;
          patient_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          patient_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          patient_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      medication_catalog: {
        Row: {
          id: string;
          name: string;
          default_unit: string | null;
          is_custom: boolean;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          default_unit?: string | null;
          is_custom?: boolean;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          default_unit?: string | null;
          is_custom?: boolean;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      patient_medications: {
        Row: {
          id: string;
          patient_id: string;
          catalog_id: string | null;
          name: string;
          dose: number | null;
          unit: string | null;
          instructions: string | null;
          is_active: boolean;
          prn_reason: string | null;
          prn_min_hours_between: number | null;
          track_stock: boolean;
          units_per_dose: number;
          stock_unit_label: string | null;
          low_stock_threshold: number | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          catalog_id?: string | null;
          name: string;
          dose?: number | null;
          unit?: string | null;
          instructions?: string | null;
          is_active?: boolean;
          prn_reason?: string | null;
          prn_min_hours_between?: number | null;
          track_stock?: boolean;
          units_per_dose?: number;
          stock_unit_label?: string | null;
          low_stock_threshold?: number | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          patient_id?: string;
          catalog_id?: string | null;
          name?: string;
          dose?: number | null;
          unit?: string | null;
          instructions?: string | null;
          is_active?: boolean;
          prn_reason?: string | null;
          prn_min_hours_between?: number | null;
          track_stock?: boolean;
          units_per_dose?: number;
          stock_unit_label?: string | null;
          low_stock_threshold?: number | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      medication_restocks: {
        Row: {
          id: string;
          patient_medication_id: string;
          patient_id: string;
          units: number;
          note: string | null;
          recorded_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          patient_medication_id: string;
          patient_id: string;
          units: number;
          note?: string | null;
          recorded_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          patient_medication_id?: string;
          patient_id?: string;
          units?: number;
          note?: string | null;
          recorded_by?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      medication_schedules: {
        Row: {
          id: string;
          patient_medication_id: string;
          schedule_type: Database["public"]["Enums"]["schedule_type"];
          time_of_day: string | null;
          days_of_week: number[] | null;
          interval_hours: number | null;
          anchor_time: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          patient_medication_id: string;
          schedule_type: Database["public"]["Enums"]["schedule_type"];
          time_of_day?: string | null;
          days_of_week?: number[] | null;
          interval_hours?: number | null;
          anchor_time?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          patient_medication_id?: string;
          schedule_type?: Database["public"]["Enums"]["schedule_type"];
          time_of_day?: string | null;
          days_of_week?: number[] | null;
          interval_hours?: number | null;
          anchor_time?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      medication_logs: {
        Row: {
          id: string;
          patient_medication_id: string;
          schedule_id: string | null;
          scheduled_for: string | null;
          administered_at: string | null;
          status: Database["public"]["Enums"]["med_log_status"];
          postponed_to: string | null;
          note: string | null;
          recorded_by: string;
          previous_status: Database["public"]["Enums"]["med_log_status"] | null;
          corrected_by: string | null;
          corrected_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          patient_medication_id: string;
          schedule_id?: string | null;
          scheduled_for?: string | null;
          administered_at?: string | null;
          status: Database["public"]["Enums"]["med_log_status"];
          postponed_to?: string | null;
          note?: string | null;
          recorded_by: string;
          previous_status?: Database["public"]["Enums"]["med_log_status"] | null;
          corrected_by?: string | null;
          corrected_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          patient_medication_id?: string;
          schedule_id?: string | null;
          scheduled_for?: string | null;
          administered_at?: string | null;
          status?: Database["public"]["Enums"]["med_log_status"];
          postponed_to?: string | null;
          note?: string | null;
          recorded_by?: string;
          previous_status?: Database["public"]["Enums"]["med_log_status"] | null;
          corrected_by?: string | null;
          corrected_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          patient_id: string;
          title: string;
          description: string | null;
          category: string | null;
          is_active: boolean;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          title: string;
          description?: string | null;
          category?: string | null;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          patient_id?: string;
          title?: string;
          description?: string | null;
          category?: string | null;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      task_schedules: {
        Row: {
          id: string;
          task_id: string;
          time_of_day: string;
          days_of_week: number[] | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          time_of_day: string;
          days_of_week?: number[] | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          time_of_day?: string;
          days_of_week?: number[] | null;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      task_logs: {
        Row: {
          id: string;
          task_id: string;
          schedule_id: string | null;
          scheduled_for: string | null;
          completed_at: string | null;
          status: Database["public"]["Enums"]["task_log_status"];
          note: string | null;
          recorded_by: string;
          previous_status: Database["public"]["Enums"]["task_log_status"] | null;
          corrected_by: string | null;
          corrected_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          schedule_id?: string | null;
          scheduled_for?: string | null;
          completed_at?: string | null;
          status: Database["public"]["Enums"]["task_log_status"];
          note?: string | null;
          recorded_by: string;
          previous_status?: Database["public"]["Enums"]["task_log_status"] | null;
          corrected_by?: string | null;
          corrected_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          schedule_id?: string | null;
          scheduled_for?: string | null;
          completed_at?: string | null;
          status?: Database["public"]["Enums"]["task_log_status"];
          note?: string | null;
          recorded_by?: string;
          previous_status?: Database["public"]["Enums"]["task_log_status"] | null;
          corrected_by?: string | null;
          corrected_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      appointments: {
        Row: {
          id: string;
          patient_id: string;
          title: string;
          doctor_name: string | null;
          specialty: string | null;
          clinic: string | null;
          scheduled_at: string;
          address: string | null;
          phone: string | null;
          notes: string | null;
          accompanied_by: string | null;
          status: Database["public"]["Enums"]["appointment_status"];
          rescheduled_to: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          title: string;
          doctor_name?: string | null;
          specialty?: string | null;
          clinic?: string | null;
          scheduled_at: string;
          address?: string | null;
          phone?: string | null;
          notes?: string | null;
          accompanied_by?: string | null;
          status?: Database["public"]["Enums"]["appointment_status"];
          rescheduled_to?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          patient_id?: string;
          title?: string;
          doctor_name?: string | null;
          specialty?: string | null;
          clinic?: string | null;
          scheduled_at?: string;
          address?: string | null;
          phone?: string | null;
          notes?: string | null;
          accompanied_by?: string | null;
          status?: Database["public"]["Enums"]["appointment_status"];
          rescheduled_to?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      appointment_notes: {
        Row: {
          id: string;
          appointment_id: string;
          summary: string | null;
          next_steps: string | null;
          medication_changes: string | null;
          next_appointment_at: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          appointment_id: string;
          summary?: string | null;
          next_steps?: string | null;
          medication_changes?: string | null;
          next_appointment_at?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          appointment_id?: string;
          summary?: string | null;
          next_steps?: string | null;
          medication_changes?: string | null;
          next_appointment_at?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      daily_notes: {
        Row: {
          id: string;
          patient_id: string;
          note_date: string;
          content: string | null;
          author_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          note_date: string;
          content?: string | null;
          author_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          patient_id?: string;
          note_date?: string;
          content?: string | null;
          author_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      activity_logs: {
        Row: {
          id: string;
          patient_id: string;
          actor_id: string | null;
          action: Database["public"]["Enums"]["activity_action"];
          entity_type: string;
          entity_id: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          actor_id?: string | null;
          action: Database["public"]["Enums"]["activity_action"];
          entity_type: string;
          entity_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          patient_id?: string;
          actor_id?: string | null;
          action?: Database["public"]["Enums"]["activity_action"];
          entity_type?: string;
          entity_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      observations: {
        Row: {
          id: string;
          patient_id: string;
          type: Database["public"]["Enums"]["observation_type"];
          value_num: number | null;
          value_text: string | null;
          unit: string | null;
          note: string | null;
          measured_at: string;
          recorded_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          type: Database["public"]["Enums"]["observation_type"];
          value_num?: number | null;
          value_text?: string | null;
          unit?: string | null;
          note?: string | null;
          measured_at?: string;
          recorded_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          patient_id?: string;
          type?: Database["public"]["Enums"]["observation_type"];
          value_num?: number | null;
          value_text?: string | null;
          unit?: string | null;
          note?: string | null;
          measured_at?: string;
          recorded_by?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      search_medication_catalog: {
        Args: { q: string };
        Returns: Database["public"]["Tables"]["medication_catalog"]["Row"][];
      };
    };
    Enums: {
      user_role: "admin" | "caregiver";
      schedule_type: "fixed" | "interval" | "prn";
      med_log_status: "given" | "skipped" | "postponed";
      task_log_status: "done" | "skipped";
      appointment_status:
        | "upcoming"
        | "completed"
        | "cancelled"
        | "rescheduled";
      activity_action:
        | "med_given"
        | "med_skipped"
        | "med_postponed"
        | "med_corrected"
        | "task_done"
        | "task_skipped"
        | "appt_created"
        | "appt_completed"
        | "appt_cancelled"
        | "appt_rescheduled"
        | "note_added"
        | "note_updated";
      observation_type:
        | "weight"
        | "blood_pressure"
        | "temperature"
        | "glucose"
        | "heart_rate"
        | "oxygen"
        | "pain"
        | "fluid_intake"
        | "fluid_output"
        | "bowel"
        | "skin"
        | "mood"
        | "other";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type PublicSchema = Database["public"];

export type Tables<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"];
export type Enums<T extends keyof PublicSchema["Enums"]> =
  PublicSchema["Enums"][T];
