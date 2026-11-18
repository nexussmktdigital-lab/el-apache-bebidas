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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      auditoria: {
        Row: {
          accion: string
          antes: Json | null
          despues: Json | null
          fecha: string
          id: number
          registro_id: string
          tabla: string
          usuario_id: string | null
        }
        Insert: {
          accion: string
          antes?: Json | null
          despues?: Json | null
          fecha?: string
          id?: never
          registro_id: string
          tabla: string
          usuario_id?: string | null
        }
        Update: {
          accion?: string
          antes?: Json | null
          despues?: Json | null
          fecha?: string
          id?: never
          registro_id?: string
          tabla?: string
          usuario_id?: string | null
        }
        Relationships: []
      }
      categorias: {
        Row: {
          activo: boolean
          actualizado_en: string
          actualizado_por: string | null
          creado_en: string
          creado_por: string | null
          id: string
          nombre: string
        }
        Insert: {
          activo?: boolean
          actualizado_en?: string
          actualizado_por?: string | null
          creado_en?: string
          creado_por?: string | null
          id?: string
          nombre: string
        }
        Update: {
          activo?: boolean
          actualizado_en?: string
          actualizado_por?: string | null
          creado_en?: string
          creado_por?: string | null
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      configuracion: {
        Row: {
          actualizado_en: string
          actualizado_por: string | null
          aviso_cc_dias: number
          aviso_vencimiento_dias: number
          cuit: string
          direccion: string
          id: boolean
          leyenda_comprobante: string
          mensaje_whatsapp: string
          nombre_negocio: string
          pie_comprobante: string
          plazo_cc_dias: number
          redondeo_precio: number
          sucursal: string
          telefono: string
        }
        Insert: {
          actualizado_en?: string
          actualizado_por?: string | null
          aviso_cc_dias?: number
          aviso_vencimiento_dias?: number
          cuit?: string
          direccion?: string
          id?: boolean
          leyenda_comprobante?: string
          mensaje_whatsapp?: string
          nombre_negocio?: string
          pie_comprobante?: string
          plazo_cc_dias?: number
          redondeo_precio?: number
          sucursal?: string
          telefono?: string
        }
        Update: {
          actualizado_en?: string
          actualizado_por?: string | null
          aviso_cc_dias?: number
          aviso_vencimiento_dias?: number
          cuit?: string
          direccion?: string
          id?: boolean
          leyenda_comprobante?: string
          mensaje_whatsapp?: string
          nombre_negocio?: string
          pie_comprobante?: string
          plazo_cc_dias?: number
          redondeo_precio?: number
          sucursal?: string
          telefono?: string
        }
        Relationships: [
          {
            foreignKeyName: "configuracion_actualizado_por_fkey"
            columns: ["actualizado_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      marcas: {
        Row: {
          activo: boolean
          actualizado_en: string
          actualizado_por: string | null
          creado_en: string
          creado_por: string | null
          id: string
          nombre: string
        }
        Insert: {
          activo?: boolean
          actualizado_en?: string
          actualizado_por?: string | null
          creado_en?: string
          creado_por?: string | null
          id?: string
          nombre: string
        }
        Update: {
          activo?: boolean
          actualizado_en?: string
          actualizado_por?: string | null
          creado_en?: string
          creado_por?: string | null
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      perfiles: {
        Row: {
          activo: boolean
          actualizado_en: string
          creado_en: string
          id: string
          nombre: string
          rol: Database["public"]["Enums"]["rol_usuario"]
        }
        Insert: {
          activo?: boolean
          actualizado_en?: string
          creado_en?: string
          id: string
          nombre: string
          rol?: Database["public"]["Enums"]["rol_usuario"]
        }
        Update: {
          activo?: boolean
          actualizado_en?: string
          creado_en?: string
          id?: string
          nombre?: string
          rol?: Database["public"]["Enums"]["rol_usuario"]
        }
        Relationships: []
      }
      precios_historial: {
        Row: {
          costo: number
          fecha: string
          id: number
          margen_pct: number
          motivo: string
          precio_manual: number | null
          precio_venta: number
          producto_id: string
          usuario_id: string | null
        }
        Insert: {
          costo: number
          fecha?: string
          id?: never
          margen_pct: number
          motivo: string
          precio_manual?: number | null
          precio_venta: number
          producto_id: string
          usuario_id?: string | null
        }
        Update: {
          costo?: number
          fecha?: string
          id?: never
          margen_pct?: number
          motivo?: string
          precio_manual?: number | null
          precio_venta?: number
          producto_id?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "precios_historial_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "precios_historial_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "v_productos"
            referencedColumns: ["id"]
          },
        ]
      }
      producto_costos: {
        Row: {
          actualizado_en: string
          actualizado_por: string | null
          costo_actual: number
          margen_pct: number
          precio_manual: number | null
          producto_id: string
        }
        Insert: {
          actualizado_en?: string
          actualizado_por?: string | null
          costo_actual?: number
          margen_pct?: number
          precio_manual?: number | null
          producto_id: string
        }
        Update: {
          actualizado_en?: string
          actualizado_por?: string | null
          costo_actual?: number
          margen_pct?: number
          precio_manual?: number | null
          producto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "producto_costos_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: true
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producto_costos_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: true
            referencedRelation: "v_productos"
            referencedColumns: ["id"]
          },
        ]
      }
      productos: {
        Row: {
          activo: boolean
          actualizado_en: string
          actualizado_por: string | null
          categoria_id: string | null
          codigo: string | null
          creado_en: string
          creado_por: string | null
          id: string
          marca_id: string | null
          nombre: string
          precio_venta: number
          proveedor_id: string | null
          stock_actual: number
          stock_minimo: number
          unidad_venta: Database["public"]["Enums"]["unidad_venta"]
          unidades_por_bulto: number
        }
        Insert: {
          activo?: boolean
          actualizado_en?: string
          actualizado_por?: string | null
          categoria_id?: string | null
          codigo?: string | null
          creado_en?: string
          creado_por?: string | null
          id?: string
          marca_id?: string | null
          nombre: string
          precio_venta?: number
          proveedor_id?: string | null
          stock_actual?: number
          stock_minimo?: number
          unidad_venta?: Database["public"]["Enums"]["unidad_venta"]
          unidades_por_bulto?: number
        }
        Update: {
          activo?: boolean
          actualizado_en?: string
          actualizado_por?: string | null
          categoria_id?: string | null
          codigo?: string | null
          creado_en?: string
          creado_por?: string | null
          id?: string
          marca_id?: string | null
          nombre?: string
          precio_venta?: number
          proveedor_id?: string | null
          stock_actual?: number
          stock_minimo?: number
          unidad_venta?: Database["public"]["Enums"]["unidad_venta"]
          unidades_por_bulto?: number
        }
        Relationships: [
          {
            foreignKeyName: "productos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "productos_marca_id_fkey"
            columns: ["marca_id"]
            isOneToOne: false
            referencedRelation: "marcas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "productos_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
        ]
      }
      proveedores: {
        Row: {
          activo: boolean
          actualizado_en: string
          actualizado_por: string | null
          contacto: string
          creado_en: string
          creado_por: string | null
          id: string
          nombre: string
          notas: string
          telefono: string
        }
        Insert: {
          activo?: boolean
          actualizado_en?: string
          actualizado_por?: string | null
          contacto?: string
          creado_en?: string
          creado_por?: string | null
          id?: string
          nombre: string
          notas?: string
          telefono?: string
        }
        Update: {
          activo?: boolean
          actualizado_en?: string
          actualizado_por?: string | null
          contacto?: string
          creado_en?: string
          creado_por?: string | null
          id?: string
          nombre?: string
          notas?: string
          telefono?: string
        }
        Relationships: []
      }
    }
    Views: {
      v_auditoria: {
        Row: {
          accion: string | null
          antes: Json | null
          despues: Json | null
          fecha: string | null
          id: number | null
          registro_id: string | null
          tabla: string | null
          usuario: string | null
          usuario_id: string | null
        }
        Relationships: []
      }
      v_productos: {
        Row: {
          activo: boolean | null
          actualizado_en: string | null
          bajo_costo: boolean | null
          categoria: string | null
          categoria_id: string | null
          codigo: string | null
          costo_actual: number | null
          id: string | null
          marca: string | null
          marca_id: string | null
          margen_pct: number | null
          margen_pesos: number | null
          margen_real_pct: number | null
          nombre: string | null
          precio_manual: number | null
          precio_venta: number | null
          proveedor: string | null
          proveedor_id: string | null
          stock_actual: number | null
          stock_bajo: boolean | null
          stock_minimo: number | null
          unidad_venta: Database["public"]["Enums"]["unidad_venta"] | null
          unidades_por_bulto: number | null
        }
        Relationships: [
          {
            foreignKeyName: "productos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "productos_marca_id_fkey"
            columns: ["marca_id"]
            isOneToOne: false
            referencedRelation: "marcas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "productos_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
        ]
      }
      v_valor_stock: {
        Row: {
          en_minimo: number | null
          productos: number | null
          valor_costo: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      aumentar_precios: {
        Args: {
          p_categoria_id?: string
          p_pct: number
          p_proveedor_id?: string
        }
        Returns: number
      }
      auth_rol: {
        Args: never
        Returns: Database["public"]["Enums"]["rol_usuario"]
      }
      calcular_precio: {
        Args: {
          costo: number
          margen_pct: number
          precio_manual: number
          redondeo: number
        }
        Returns: number
      }
      es_superusuario: { Args: never; Returns: boolean }
      fecha_ar: { Args: { t: string }; Returns: string }
      guardar_producto: { Args: { p: Json }; Returns: string }
      hoy_ar: { Args: never; Returns: string }
      redondear_precio: {
        Args: { redondeo: number; valor: number }
        Returns: number
      }
      redondeo_configurado: { Args: never; Returns: number }
      usuario_activo: { Args: never; Returns: boolean }
      ve_costos: { Args: never; Returns: boolean }
    }
    Enums: {
      rol_usuario: "superusuario" | "administracion" | "reparto"
      unidad_venta: "unidad" | "pack" | "caja"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      rol_usuario: ["superusuario", "administracion", "reparto"],
      unidad_venta: ["unidad", "pack", "caja"],
    },
  },
} as const
