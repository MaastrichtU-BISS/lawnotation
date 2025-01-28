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
          },
        ]
      }
      annotations: {
        Row: {
          assignment_id: number | null
          confidence_rating: number
          created_at: string | null
          end_index: number | null
          html_metadata: Json | null
          id: number
          label: string | null
          ls_id: string | null
          metadata: string | null
          origin: Database["public"]["Enums"]["origins"] | null
          start_index: number | null
          text: string | null
        }
        Insert: {
          assignment_id?: number | null
          confidence_rating?: number
          created_at?: string | null
          end_index?: number | null
          html_metadata?: Json | null
          id?: number
          label?: string | null
          ls_id?: string | null
          metadata?: string | null
          origin?: Database["public"]["Enums"]["origins"] | null
          start_index?: number | null
          text?: string | null
        }
        Update: {
          assignment_id?: number | null
          confidence_rating?: number
          created_at?: string | null
          end_index?: number | null
          html_metadata?: Json | null
          id?: number
          label?: string | null
          ls_id?: string | null
          metadata?: string | null
          origin?: Database["public"]["Enums"]["origins"] | null
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
          },
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
          origin: Database["public"]["Enums"]["origins"] | null
          original_task_id: number | null
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
          origin?: Database["public"]["Enums"]["origins"] | null
          original_task_id?: number | null
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
          origin?: Database["public"]["Enums"]["origins"] | null
          original_task_id?: number | null
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
          },
        ]
      }
      documents: {
        Row: {
          created_at: string | null
          full_text: string | null
          hash: string | null
          id: number
          name: string | null
          project_id: number | null
          source: string | null
        }
        Insert: {
          created_at?: string | null
          full_text?: string | null
          hash?: string | null
          id?: number
          name?: string | null
          project_id?: number | null
          source?: string | null
        }
        Update: {
          created_at?: string | null
          full_text?: string | null
          hash?: string | null
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
          },
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
          },
        ]
      }
      ml_models: {
        Row: {
          annotation_level:
            | Database["public"]["Enums"]["annotation_level"]
            | null
          created_at: string
          id: number
          labelset_id: number | null
          name: string | null
          type: string | null
        }
        Insert: {
          annotation_level?:
            | Database["public"]["Enums"]["annotation_level"]
            | null
          created_at?: string
          id?: number
          labelset_id?: number | null
          name?: string | null
          type?: string | null
        }
        Update: {
          annotation_level?:
            | Database["public"]["Enums"]["annotation_level"]
            | null
          created_at?: string
          id?: number
          labelset_id?: number | null
          name?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "public_ml_models_labelset_id_fkey"
            columns: ["labelset_id"]
            isOneToOne: false
            referencedRelation: "labelsets"
            referencedColumns: ["id"]
          },
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
          },
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
          },
        ]
      }
      tasks: {
        Row: {
          ann_guidelines: string | null
          annotation_level:
            | Database["public"]["Enums"]["annotation_level"]
            | null
          created_at: string | null
          desc: string | null
          id: number
          labelset_id: number | null
          ml_model_id: number | null
          name: string | null
          project_id: number | null
        }
        Insert: {
          ann_guidelines?: string | null
          annotation_level?:
            | Database["public"]["Enums"]["annotation_level"]
            | null
          created_at?: string | null
          desc?: string | null
          id?: number
          labelset_id?: number | null
          ml_model_id?: number | null
          name?: string | null
          project_id?: number | null
        }
        Update: {
          ann_guidelines?: string | null
          annotation_level?:
            | Database["public"]["Enums"]["annotation_level"]
            | null
          created_at?: string | null
          desc?: string | null
          id?: number
          labelset_id?: number | null
          ml_model_id?: number | null
          name?: string | null
          project_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "public_tasks_ml_model_id_fkey"
            columns: ["ml_model_id"]
            isOneToOne: false
            referencedRelation: "ml_models"
            referencedColumns: ["id"]
          },
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
          },
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
          },
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
          annotation_level:
            | Database["public"]["Enums"]["annotation_level"]
            | null
          created_at: string | null
          desc: string | null
          id: number
          labelset_id: number | null
          ml_model_id: number | null
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
          hash: string | null
          id: number
          name: string | null
          project_id: number | null
          source: string | null
        }[]
      }
      get_all_docs_from_task_mini: {
        Args: {
          t_id: number
        }
        Returns: {
          id: number
          hash: string
        }[]
      }
      get_all_shared_docs_from_task: {
        Args: {
          t_id: number
        }
        Returns: {
          created_at: string | null
          full_text: string | null
          hash: string | null
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
          origin: Database["public"]["Enums"]["origins"] | null
          original_task_id: number | null
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
      annotation_level:
        | "word"
        | "document"
        | "symbol"
        | "sentence"
        | "paragraph"
      assignment_status:
        | "pending"
        | "done"
        | "predicting"
        | "pre-annotated"
        | "failed"
      origins: "manual" | "imported" | "model"
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
          user_metadata: Json | null
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
          user_metadata?: Json | null
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
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "s3_multipart_uploads"
            referencedColumns: ["id"]
          },
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
        Returns: string[]
      }
      get_size_by_bucket: {
        Args: Record<PropertyKey, never>
        Returns: {
          size: number
          bucket_id: string
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          prefix_param: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
        }
        Returns: {
          key: string
          id: string
          created_at: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          bucket_id: string
          prefix_param: string
          delimiter_param: string
          max_keys?: number
          start_after?: string
          next_token?: string
        }
        Returns: {
          name: string
          id: string
          metadata: Json
          updated_at: string
        }[]
      }
      operation: {
        Args: Record<PropertyKey, never>
        Returns: string
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

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

