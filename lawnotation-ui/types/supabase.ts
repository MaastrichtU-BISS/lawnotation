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
      annotation_relations: {
        Row: {
          created_at: string | null
          direction: Database["public"]["Enums"]["relation_directions"] | null
          from_id: number | null
          id: number
          labels: Database["public"]["Enums"]["relation_labels"][] | null
          ls_from: string | null
          ls_to: string | null
          to_id: number | null
        }
        Insert: {
          created_at?: string | null
          direction?: Database["public"]["Enums"]["relation_directions"] | null
          from_id?: number | null
          id?: number
          labels?: Database["public"]["Enums"]["relation_labels"][] | null
          ls_from?: string | null
          ls_to?: string | null
          to_id?: number | null
        }
        Update: {
          created_at?: string | null
          direction?: Database["public"]["Enums"]["relation_directions"] | null
          from_id?: number | null
          id?: number
          labels?: Database["public"]["Enums"]["relation_labels"][] | null
          ls_from?: string | null
          ls_to?: string | null
          to_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "annotation_relations_from_id_fkey"
            columns: ["from_id"]
            referencedRelation: "annotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "annotation_relations_to_id_fkey"
            columns: ["to_id"]
            referencedRelation: "annotations"
            referencedColumns: ["id"]
          }
        ]
      }
      annotations: {
        Row: {
          assignment_id: number | null
          created_at: string | null
          end_index: number | null
          id: number
          label: string | null
          ls_id: string | null
          origin: string | null
          start_index: number | null
          text: string | null
        }
        Insert: {
          assignment_id?: number | null
          created_at?: string | null
          end_index?: number | null
          id?: number
          label?: string | null
          ls_id?: string | null
          origin?: string | null
          start_index?: number | null
          text?: string | null
        }
        Update: {
          assignment_id?: number | null
          created_at?: string | null
          end_index?: number | null
          id?: number
          label?: string | null
          ls_id?: string | null
          origin?: string | null
          start_index?: number | null
          text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "annotations_assignment_id_fkey"
            columns: ["assignment_id"]
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          }
        ]
      }
      assignments: {
        Row: {
          annotator_id: string | null
          created_at: string | null
          document_id: number | null
          id: number
          seq_pos: number | null
          status: Database["public"]["Enums"]["assignment_status"] | null
          task_id: number | null
        }
        Insert: {
          annotator_id?: string | null
          created_at?: string | null
          document_id?: number | null
          id?: number
          seq_pos?: number | null
          status?: Database["public"]["Enums"]["assignment_status"] | null
          task_id?: number | null
        }
        Update: {
          annotator_id?: string | null
          created_at?: string | null
          document_id?: number | null
          id?: number
          seq_pos?: number | null
          status?: Database["public"]["Enums"]["assignment_status"] | null
          task_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assignments_annotator_id_fkey"
            columns: ["annotator_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_document_id_fkey"
            columns: ["document_id"]
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_task_id_fkey"
            columns: ["task_id"]
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          }
        ]
      }
      documents: {
        Row: {
          created_at: string | null
          full_text: string | null
          id: number
          name: string | null
          project_id: number | null
          source: string | null
        }
        Insert: {
          created_at?: string | null
          full_text?: string | null
          id?: number
          name?: string | null
          project_id?: number | null
          source?: string | null
        }
        Update: {
          created_at?: string | null
          full_text?: string | null
          id?: number
          name?: string | null
          project_id?: number | null
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
        ]
      }
      labelsets: {
        Row: {
          created_at: string | null
          desc: string | null
          editor_id: string | null
          id: number
          labels: Json | null
          name: string | null
        }
        Insert: {
          created_at?: string | null
          desc?: string | null
          editor_id?: string | null
          id?: number
          labels?: Json | null
          name?: string | null
        }
        Update: {
          created_at?: string | null
          desc?: string | null
          editor_id?: string | null
          id?: number
          labels?: Json | null
          name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "labelsets_editor_id_fkey"
            columns: ["editor_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      projects: {
        Row: {
          created_at: string | null
          desc: string | null
          editor_id: string | null
          id: number
          name: string | null
        }
        Insert: {
          created_at?: string | null
          desc?: string | null
          editor_id?: string | null
          id?: number
          name?: string | null
        }
        Update: {
          created_at?: string | null
          desc?: string | null
          editor_id?: string | null
          id?: number
          name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_editor_id_fkey"
            columns: ["editor_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      tasks: {
        Row: {
          ann_guidelines: string | null
          created_at: string | null
          desc: string | null
          id: number
          labelset_id: number | null
          name: string | null
          project_id: number | null
        }
        Insert: {
          ann_guidelines?: string | null
          created_at?: string | null
          desc?: string | null
          id?: number
          labelset_id?: number | null
          name?: string | null
          project_id?: number | null
        }
        Update: {
          ann_guidelines?: string | null
          created_at?: string | null
          desc?: string | null
          id?: number
          labelset_id?: number | null
          name?: string | null
          project_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_labelset_id_fkey"
            columns: ["labelset_id"]
            referencedRelation: "labelsets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
        ]
      }
      users: {
        Row: {
          email: string | null
          id: string
          role: Database["public"]["Enums"]["user_roles"] | null
        }
        Insert: {
          email?: string | null
          id: string
          role?: Database["public"]["Enums"]["user_roles"] | null
        }
        Update: {
          email?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_roles"] | null
        }
        Relationships: [
          {
            foreignKeyName: "users_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_all_annotator_tasks: {
        Args: {
          a_id: string
        }
        Returns: {
          ann_guidelines: string | null
          created_at: string | null
          desc: string | null
          id: number
          labelset_id: number | null
          name: string | null
          project_id: number | null
        }[]
      }
      get_all_shared_docs_from_task: {
        Args: {
          t_id: number
        }
        Returns: {
          created_at: string | null
          full_text: string | null
          id: number
          name: string | null
          project_id: number | null
          source: string | null
        }[]
      }
      next_random_assignment: {
        Args: {
          a_id: string
          t_id: number
        }
        Returns: {
          annotator_id: string | null
          created_at: string | null
          document_id: number | null
          id: number
          seq_pos: number | null
          status: Database["public"]["Enums"]["assignment_status"] | null
          task_id: number | null
        }[]
      }
      random_sample: {
        Args: {
          n: number
          pid: number
        }
        Returns: number[]
      }
      system_rows: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
    }
    Enums: {
      assignment_status: "pending" | "done"
      relation_directions: "bi" | "left" | "right"
      relation_labels:
        | "Is a"
        | "Has a"
        | "Belongs to"
        | "Implies"
        | "Depends on"
        | "Related to"
        | "Is not"
        | "Part of"
      user_roles: "editor" | "annotator"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
