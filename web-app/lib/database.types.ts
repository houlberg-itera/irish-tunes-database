export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      tunes: {
        Row: {
          id: string
          title: string
          tune_type_id: string | null
          key_id: string | null
          mode: string | null
          time_signature: string | null
          abc_notation: string | null
          abc_header: string | null
          composer_id: string | null
          composition_year: number | null
          region: string | null
          difficulty_level: number | null
          popularity_score: number
          play_count: number
          notes: string | null
          historical_notes: string | null
          thesession_tune_id: number | null
          created_at: string
          updated_at: string
          created_by: string | null
          search_vector: unknown | null
        }
        Insert: {
          id?: string
          title: string
          tune_type_id?: string | null
          key_id?: string | null
          mode?: string | null
          time_signature?: string | null
          abc_notation?: string | null
          abc_header?: string | null
          composer_id?: string | null
          composition_year?: number | null
          region?: string | null
          difficulty_level?: number | null
          popularity_score?: number
          play_count?: number
          notes?: string | null
          historical_notes?: string | null
          thesession_tune_id?: number | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          title?: string
          tune_type_id?: string | null
          key_id?: string | null
          mode?: string | null
          time_signature?: string | null
          abc_notation?: string | null
          abc_header?: string | null
          composer_id?: string | null
          composition_year?: number | null
          region?: string | null
          difficulty_level?: number | null
          popularity_score?: number
          play_count?: number
          notes?: string | null
          historical_notes?: string | null
          thesession_tune_id?: number | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
      }
      tune_types: {
        Row: {
          id: string
          name: string
          description: string | null
          typical_time_signature: string | null
          created_at: string
          updated_at: string
        }
      }
      musical_keys: {
        Row: {
          id: string
          name: string
          mode: string | null
          display_order: number | null
          created_at: string
        }
      }
      user_tune_practice: {
        Row: {
          id: string
          user_id: string
          tune_id: string
          proficiency_level: number | null
          proficiency_notes: string | null
          total_practice_time_minutes: number
          practice_count: number
          last_practiced_at: string | null
          started_learning_at: string
          achieved_proficiency_at: string | null
          learning_notes: string | null
          trouble_spots: string | null
          target_proficiency_level: number | null
          target_date: string | null
          is_active: boolean
          is_favorite: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          tune_id: string
          proficiency_level?: number | null
          proficiency_notes?: string | null
          total_practice_time_minutes?: number
          practice_count?: number
          last_practiced_at?: string | null
          started_learning_at?: string
          achieved_proficiency_at?: string | null
          learning_notes?: string | null
          trouble_spots?: string | null
          target_proficiency_level?: number | null
          target_date?: string | null
          is_active?: boolean
          is_favorite?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          tune_id?: string
          proficiency_level?: number | null
          proficiency_notes?: string | null
          total_practice_time_minutes?: number
          practice_count?: number
          last_practiced_at?: string | null
          started_learning_at?: string
          achieved_proficiency_at?: string | null
          learning_notes?: string | null
          trouble_spots?: string | null
          target_proficiency_level?: number | null
          target_date?: string | null
          is_active?: boolean
          is_favorite?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      tune_sets: {
        Row: {
          id: string
          name: string | null
          description: string | null
          created_by: string | null
          is_public: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name?: string | null
          description?: string | null
          created_by?: string | null
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string | null
          description?: string | null
          created_by?: string | null
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      tune_set_items: {
        Row: {
          id: string
          set_id: string
          tune_id: string
          position: number
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          set_id: string
          tune_id: string
          position: number
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          set_id?: string
          tune_id?: string
          position?: number
          notes?: string | null
          created_at?: string
        }
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
  }
}
