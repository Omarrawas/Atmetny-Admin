
// src/types/supabase.ts
// IMPORTANT: This is a basic placeholder.
// Generate this file properly using:
// npx supabase gen types typescript --project-id <your-project-id> --schema public > src/types/supabase.ts
// Replace <your-project-id> with your actual Supabase project ID.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Based on your SQL: public.subject_branch_enum null default 'undetermined'::subject_branch_enum
// You might need to define this enum in Supabase first if it's not a built-in type.
// For TypeScript, we can define it as a string literal union.
export type SubjectBranchEnumType = 'scientific' | 'literary' | 'general' | 'undetermined';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string // uuid not null
          email: string | null // text null
          name: string | null // text null
          avatar_url: string | null // text null
          avatar_hint: string | null // text null
          points: number // integer not null default 0
          level: number // integer not null default 1
          progress_to_next_level: number // integer not null default 0
          badges: Json | null // jsonb null default '[]'::jsonb
          rewards: Json | null // jsonb null default '[]'::jsonb
          student_goals: string | null // text null
          branch: SubjectBranchEnumType | null // public.subject_branch_enum null default 'undetermined'::subject_branch_enum
          university: string | null // text null
          major: string | null // text null
          active_subscription: Json | null // jsonb null
          created_at: string // timestamp with time zone not null default now()
          updated_at: string // timestamp with time zone not null default now()
          role: string | null // text null
          youtube_channel_url: string | null // text null
        }
        Insert: {
          id: string // uuid not null
          email?: string | null
          name?: string | null
          avatar_url?: string | null
          avatar_hint?: string | null
          points?: number
          level?: number
          progress_to_next_level?: number
          badges?: Json | null
          rewards?: Json | null
          student_goals?: string | null
          branch?: SubjectBranchEnumType | null
          university?: string | null
          major?: string | null
          active_subscription?: Json | null
          created_at?: string
          updated_at?: string
          role?: string | null
          youtube_channel_url?: string | null
        }
        Update: {
          id?: string
          email?: string | null
          name?: string | null
          avatar_url?: string | null
          avatar_hint?: string | null
          points?: number
          level?: number
          progress_to_next_level?: number
          badges?: Json | null
          rewards?: Json | null
          student_goals?: string | null
          branch?: SubjectBranchEnumType | null
          university?: string | null
          major?: string | null
          active_subscription?: Json | null
          created_at?: string
          updated_at?: string
          role?: string | null
          youtube_channel_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            referencedRelation: "users" // Supabase auth users table
            referencedColumns: ["id"]
          }
        ]
      }
      subjects: {
        Row: {
          id: string
          created_at: string
          name: string
          description: string | null
          branch: 'scientific' | 'literary' | 'general'
          image: string | null
          icon_name: string | null
          image_hint: string | null
          order: number | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          name: string
          description?: string | null
          branch: 'scientific' | 'literary' | 'general'
          image?: string | null
          icon_name?: string | null
          image_hint?: string | null
          order?: number | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          name?: string
          description?: string | null
          branch?: 'scientific' | 'literary' | 'general'
          image?: string | null
          icon_name?: string | null
          image_hint?: string | null
          order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      tags: {
        Row: {
          id: string
          created_at: string
          name: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      activation_codes: { // Renamed from access_codes
        Row: {
          id: string // uuid, primary key
          name: string // text, not null
          encoded_value: string // text, not null, unique
          type: string // text, not null
          subject_id: string | null // uuid, nullable, foreign key references subjects(id) ON DELETE SET NULL
          subject_name: string | null // text, nullable
          valid_from: string // timestamptz, not null
          valid_until: string // timestamptz, not null
          is_active: boolean // boolean, default true
          is_used: boolean // boolean, default false
          used_at: string | null // timestamptz, nullable
          used_by_user_id: string | null // uuid, nullable, foreign key references profiles(id) ON DELETE SET NULL
          created_at: string // timestamptz, default now()
          updated_at: string // timestamptz, default now()
        }
        Insert: {
          id?: string // uuid
          name: string // text
          encoded_value: string // text
          type: string // text
          subject_id?: string | null // uuid
          subject_name?: string | null // text
          valid_from: string // timestamptz
          valid_until: string // timestamptz
          is_active?: boolean // boolean
          is_used?: boolean // boolean
          used_at?: string | null // timestamptz
          used_by_user_id?: string | null // uuid
          created_at?: string // timestamptz
          updated_at?: string // timestamptz
        }
        Update: {
          id?: string // uuid
          name?: string // text
          encoded_value?: string // text
          type?: string // text
          subject_id?: string | null // uuid
          subject_name?: string | null // text
          valid_from?: string // timestamptz
          valid_until?: string // timestamptz
          is_active?: boolean // boolean
          is_used?: boolean // boolean
          used_at?: string | null // timestamptz
          used_by_user_id?: string | null // uuid
          created_at?: string // timestamptz
          updated_at?: string // timestamptz
        }
        Relationships: [
          {
            foreignKeyName: "activation_codes_subject_id_fkey" // Assuming this FK name
            columns: ["subject_id"]
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activation_codes_used_by_user_id_fkey" // Assuming this FK name
            columns: ["used_by_user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      // ... (Define other tables like questions, exams, news_articles, etc. based on your schema)
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
       subject_branch_enum: SubjectBranchEnumType
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
