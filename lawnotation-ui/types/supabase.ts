export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
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
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
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
            isOneToOne: false
            referencedRelation: "annotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "annotation_relations_to_id_fkey"
            columns: ["to_id"]
            isOneToOne: false
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
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          }
        ]
      }
      assignments: {
        Row: {
          annotator_id: string | null
          annotator_number: number
          created_at: string | null
          difficulty_rating: number | null
          document_id: number | null
          id: number
          seq_pos: number | null
          status: Database["public"]["Enums"]["assignment_status"] | null
          task_id: number | null
        }
        Insert: {
          annotator_id?: string | null
          annotator_number?: number
          created_at?: string | null
          difficulty_rating?: number | null
          document_id?: number | null
          id?: number
          seq_pos?: number | null
          status?: Database["public"]["Enums"]["assignment_status"] | null
          task_id?: number | null
        }
        Update: {
          annotator_id?: string | null
          annotator_number?: number
          created_at?: string | null
          difficulty_rating?: number | null
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
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
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
            isOneToOne: false
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
            isOneToOne: false
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
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      publications: {
        Row: {
          annotations: number | null
          annotators: number | null
          assignments: number | null
          author: string | null
          contact: string | null
          created_at: string
          documents: number | null
          editor_id: string | null
          file_url: string | null
          guidelines_url: string | null
          id: number
          labels_description: string | null
          labels_name: string | null
          relations: number | null
          status: Database["public"]["Enums"]["publication_status"] | null
          task_description: string | null
          task_name: string | null
        }
        Insert: {
          annotations?: number | null
          annotators?: number | null
          assignments?: number | null
          author?: string | null
          contact?: string | null
          created_at?: string
          documents?: number | null
          editor_id?: string | null
          file_url?: string | null
          guidelines_url?: string | null
          id?: number
          labels_description?: string | null
          labels_name?: string | null
          relations?: number | null
          status?: Database["public"]["Enums"]["publication_status"] | null
          task_description?: string | null
          task_name?: string | null
        }
        Update: {
          annotations?: number | null
          annotators?: number | null
          assignments?: number | null
          author?: string | null
          contact?: string | null
          created_at?: string
          documents?: number | null
          editor_id?: string | null
          file_url?: string | null
          guidelines_url?: string | null
          id?: number
          labels_description?: string | null
          labels_name?: string | null
          relations?: number | null
          status?: Database["public"]["Enums"]["publication_status"] | null
          task_description?: string | null
          task_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "publications_editor_id_fkey"
            columns: ["editor_id"]
            isOneToOne: false
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
            isOneToOne: false
            referencedRelation: "labelsets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
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
            isOneToOne: true
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
      get_all_annotators_from_task: {
        Args: {
          t_id: number
        }
        Returns: {
          id: string
          email: string
          role: Database["public"]["Enums"]["user_roles"]
          annotator_number: number
        }[]
      }
      get_all_docs_from_task: {
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
      get_completion_by_annotator: {
        Args: {
          a_id: string
        }
        Returns: {
          status: Database["public"]["Enums"]["assignment_status"]
          count: number
        }[]
      }
      get_completion_by_editor: {
        Args: {
          e_id: string
        }
        Returns: {
          status: Database["public"]["Enums"]["assignment_status"]
          count: number
        }[]
      }
      get_count_assignments: {
        Args: {
          e_id: string
        }
        Returns: number
      }
      get_count_tasks: {
        Args: {
          e_id: string
        }
        Returns: number
      }
      get_difficulties_by_editor: {
        Args: {
          e_id: string
        }
        Returns: {
          difficulty: number
          count: number
        }[]
      }
      get_unannotated_documents: {
        Args: {
          task_id_param: number
        }
        Returns: {
          document_id: number
        }[]
      }
      next_random_assignment: {
        Args: {
          a_id: string
          t_id: number
        }
        Returns: {
          annotator_id: string | null
          annotator_number: number
          created_at: string | null
          difficulty_rating: number | null
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
      publication_status: "published" | "unpublished"
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
      user_roles: "editor" | "annotator" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_insert_object: {
        Args: {
          bucketid: string
          name: string
          owner: string
          metadata: Json
        }
        Returns: undefined
      }
      extension: {
        Args: {
          name: string
        }
        Returns: string
      }
      filename: {
        Args: {
          name: string
        }
        Returns: string
      }
      foldername: {
        Args: {
          name: string
        }
        Returns: unknown
      }
      get_size_by_bucket: {
        Args: Record<PropertyKey, never>
        Returns: {
          size: number
          bucket_id: string
        }[]
      }
      search: {
        Args: {
          prefix: string
          bucketname: string
          limits?: number
          levels?: number
          offsets?: number
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          name: string
          id: string
          updated_at: string
          created_at: string
          last_accessed_at: string
          metadata: Json
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
      Database["public"]["Views"])
  ? (Database["public"]["Tables"] &
      Database["public"]["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
  ? Database["public"]["Enums"][PublicEnumNameOrOptions]
  : never

