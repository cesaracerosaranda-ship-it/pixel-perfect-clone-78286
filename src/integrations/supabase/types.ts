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
  public: {
    Tables: {
      cotizaciones: {
        Row: {
          cantidad: number
          cliente_empresa: string
          cliente_nombre: string
          cliente_telefono: string | null
          cp_destino: string | null
          created_at: string
          descripcion_producto: string
          estado: string
          estado_destino: string | null
          fecha: string
          flete_costo: number | null
          flete_modalidad: string | null
          flete_paqueteria: string | null
          folio: string
          folio_padre: string | null
          id: string
          incluye_flete: boolean
          iva: number | null
          margen_porcentaje: number | null
          municipio: string | null
          notas_internas: string | null
          precio_especial: boolean
          precio_unitario: number
          producto: string
          requiere_factura: boolean
          revision: number
          subtotal_general: number
          subtotal_producto: number
          total: number
          updated_at: string
        }
        Insert: {
          cantidad?: number
          cliente_empresa?: string
          cliente_nombre?: string
          cliente_telefono?: string | null
          cp_destino?: string | null
          created_at?: string
          descripcion_producto?: string
          estado?: string
          estado_destino?: string | null
          fecha?: string
          flete_costo?: number | null
          flete_modalidad?: string | null
          flete_paqueteria?: string | null
          folio: string
          folio_padre?: string | null
          id?: string
          incluye_flete?: boolean
          iva?: number | null
          margen_porcentaje?: number | null
          municipio?: string | null
          notas_internas?: string | null
          precio_especial?: boolean
          precio_unitario?: number
          producto?: string
          requiere_factura?: boolean
          revision?: number
          subtotal_general?: number
          subtotal_producto?: number
          total?: number
          updated_at?: string
        }
        Update: {
          cantidad?: number
          cliente_empresa?: string
          cliente_nombre?: string
          cliente_telefono?: string | null
          cp_destino?: string | null
          created_at?: string
          descripcion_producto?: string
          estado?: string
          estado_destino?: string | null
          fecha?: string
          flete_costo?: number | null
          flete_modalidad?: string | null
          flete_paqueteria?: string | null
          folio?: string
          folio_padre?: string | null
          id?: string
          incluye_flete?: boolean
          iva?: number | null
          margen_porcentaje?: number | null
          municipio?: string | null
          notas_internas?: string | null
          precio_especial?: boolean
          precio_unitario?: number
          producto?: string
          requiere_factura?: boolean
          revision?: number
          subtotal_general?: number
          subtotal_producto?: number
          total?: number
          updated_at?: string
        }
        Relationships: []
      }
      folio_counter: {
        Row: {
          id: number
          last_number: number
        }
        Insert: {
          id?: number
          last_number?: number
        }
        Update: {
          id?: number
          last_number?: number
        }
        Relationships: []
      }
      inventario: {
        Row: {
          boyas_disponibles: number
          id: number
          updated_at: string
        }
        Insert: {
          boyas_disponibles?: number
          id?: number
          updated_at?: string
        }
        Update: {
          boyas_disponibles?: number
          id?: number
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      next_folio: { Args: { p_year: number }; Returns: string }
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
  public: {
    Enums: {},
  },
} as const
