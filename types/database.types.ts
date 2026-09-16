// Generated to match supabase/migrations/*.sql.
// If you have the Supabase CLI linked to a live project, you can regenerate
// this file with:
//   npx supabase gen types typescript --project-id <project-ref> > types/database.types.ts
// Keep it in sync with the migrations whenever the schema changes.

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
      categories: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      prompts: {
        Row: {
          id: string;
          user_id: string;
          category_id: string;
          title: string;
          prompt_text: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          category_id: string;
          title: string;
          prompt_text: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          category_id?: string;
          title?: string;
          prompt_text?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "prompts_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      prompt_images: {
        Row: {
          id: string;
          prompt_id: string;
          user_id: string;
          storage_path: string;
          display_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          prompt_id: string;
          user_id: string;
          storage_path: string;
          display_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          prompt_id?: string;
          user_id?: string;
          storage_path?: string;
          display_order?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "prompt_images_prompt_id_fkey";
            columns: ["prompt_id"];
            isOneToOne: false;
            referencedRelation: "prompts";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
