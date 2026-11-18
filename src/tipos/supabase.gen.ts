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
      cc_movimientos: {
        Row: {
          cliente_id: string
          fecha: string
          id: number
          importe: number
          medio_pago: Database["public"]["Enums"]["forma_pago"] | null
          nota: string
          tipo: Database["public"]["Enums"]["tipo_cc"]
          usuario_id: string | null
          vence_el: string | null
          venta_id: string | null
        }
        Insert: {
          cliente_id: string
          fecha?: string
          id?: never
          importe: number
          medio_pago?: Database["public"]["Enums"]["forma_pago"] | null
          nota?: string
          tipo: Database["public"]["Enums"]["tipo_cc"]
          usuario_id?: string | null
          vence_el?: string | null
          venta_id?: string | null
        }
        Update: {
          cliente_id?: string
          fecha?: string
          id?: never
          importe?: number
          medio_pago?: Database["public"]["Enums"]["forma_pago"] | null
          nota?: string
          tipo?: Database["public"]["Enums"]["tipo_cc"]
          usuario_id?: string | null
          vence_el?: string | null
          venta_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cc_movimientos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cc_movimientos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "v_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cc_movimientos_venta_id_fkey"
            columns: ["venta_id"]
            isOneToOne: false
            referencedRelation: "v_ventas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cc_movimientos_venta_id_fkey"
            columns: ["venta_id"]
            isOneToOne: false
            referencedRelation: "ventas"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          activo: boolean
          actualizado_en: string
          actualizado_por: string | null
          creado_en: string
          creado_por: string | null
          cuit: string
          direccion: string
          id: string
          nombre: string
          notas: string
          telefono: string
          zona: string
        }
        Insert: {
          activo?: boolean
          actualizado_en?: string
          actualizado_por?: string | null
          creado_en?: string
          creado_por?: string | null
          cuit?: string
          direccion?: string
          id?: string
          nombre: string
          notas?: string
          telefono?: string
          zona?: string
        }
        Update: {
          activo?: boolean
          actualizado_en?: string
          actualizado_por?: string | null
          creado_en?: string
          creado_por?: string | null
          cuit?: string
          direccion?: string
          id?: string
          nombre?: string
          notas?: string
          telefono?: string
          zona?: string
        }
        Relationships: []
      }
      compra_items: {
        Row: {
          cantidad: number
          compra_id: string
          costo_unitario: number
          fecha_vencimiento: string | null
          id: string
          producto_id: string
          subtotal: number | null
        }
        Insert: {
          cantidad: number
          compra_id: string
          costo_unitario: number
          fecha_vencimiento?: string | null
          id?: string
          producto_id: string
          subtotal?: number | null
        }
        Update: {
          cantidad?: number
          compra_id?: string
          costo_unitario?: number
          fecha_vencimiento?: string | null
          id?: string
          producto_id?: string
          subtotal?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "compra_items_compra_id_fkey"
            columns: ["compra_id"]
            isOneToOne: false
            referencedRelation: "compras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compra_items_compra_id_fkey"
            columns: ["compra_id"]
            isOneToOne: false
            referencedRelation: "v_compras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compra_items_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compra_items_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "v_productos"
            referencedColumns: ["id"]
          },
        ]
      }
      compras: {
        Row: {
          actualizado_en: string
          actualizado_por: string | null
          creado_en: string
          creado_por: string | null
          fecha: string
          id: string
          numero: number
          observaciones: string
          proveedor_id: string | null
          total: number
        }
        Insert: {
          actualizado_en?: string
          actualizado_por?: string | null
          creado_en?: string
          creado_por?: string | null
          fecha?: string
          id?: string
          numero?: never
          observaciones?: string
          proveedor_id?: string | null
          total?: number
        }
        Update: {
          actualizado_en?: string
          actualizado_por?: string | null
          creado_en?: string
          creado_por?: string | null
          fecha?: string
          id?: string
          numero?: never
          observaciones?: string
          proveedor_id?: string | null
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "compras_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracion: {
        Row: {
          actualizado_en: string
          actualizado_por: string | null
          aviso_cc_dias: number
          aviso_vencimiento_dias: number
          comprobante_mostrar_datos: boolean
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
          comprobante_mostrar_datos?: boolean
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
          comprobante_mostrar_datos?: boolean
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
      gasto_categorias: {
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
      gastos: {
        Row: {
          actualizado_en: string
          actualizado_por: string | null
          anulado: boolean
          anulado_en: string | null
          anulado_motivo: string | null
          anulado_por: string | null
          categoria_id: string | null
          creado_en: string
          creado_por: string | null
          detalle: string
          fecha: string
          id: string
          medio_pago: Database["public"]["Enums"]["forma_pago"]
          monto: number
          pagado_a: string
        }
        Insert: {
          actualizado_en?: string
          actualizado_por?: string | null
          anulado?: boolean
          anulado_en?: string | null
          anulado_motivo?: string | null
          anulado_por?: string | null
          categoria_id?: string | null
          creado_en?: string
          creado_por?: string | null
          detalle?: string
          fecha?: string
          id?: string
          medio_pago?: Database["public"]["Enums"]["forma_pago"]
          monto: number
          pagado_a?: string
        }
        Update: {
          actualizado_en?: string
          actualizado_por?: string | null
          anulado?: boolean
          anulado_en?: string | null
          anulado_motivo?: string | null
          anulado_por?: string | null
          categoria_id?: string | null
          creado_en?: string
          creado_por?: string | null
          detalle?: string
          fecha?: string
          id?: string
          medio_pago?: Database["public"]["Enums"]["forma_pago"]
          monto?: number
          pagado_a?: string
        }
        Relationships: [
          {
            foreignKeyName: "gastos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "gasto_categorias"
            referencedColumns: ["id"]
          },
        ]
      }
      lotes: {
        Row: {
          cantidad_disponible: number
          cantidad_inicial: number
          compra_item_id: string | null
          costo_unitario: number
          creado_en: string
          creado_por: string | null
          fecha_vencimiento: string | null
          id: string
          producto_id: string
        }
        Insert: {
          cantidad_disponible: number
          cantidad_inicial: number
          compra_item_id?: string | null
          costo_unitario: number
          creado_en?: string
          creado_por?: string | null
          fecha_vencimiento?: string | null
          id?: string
          producto_id: string
        }
        Update: {
          cantidad_disponible?: number
          cantidad_inicial?: number
          compra_item_id?: string | null
          costo_unitario?: number
          creado_en?: string
          creado_por?: string | null
          fecha_vencimiento?: string | null
          id?: string
          producto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lotes_compra_item_id_fkey"
            columns: ["compra_item_id"]
            isOneToOne: false
            referencedRelation: "compra_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lotes_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lotes_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "v_productos"
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
      movimientos_stock: {
        Row: {
          cantidad: number
          fecha: string
          id: number
          lote_id: string | null
          motivo_ajuste: Database["public"]["Enums"]["motivo_ajuste"] | null
          nota: string
          producto_id: string
          referencia_id: string | null
          tipo: Database["public"]["Enums"]["tipo_movimiento"]
          usuario_id: string | null
        }
        Insert: {
          cantidad: number
          fecha?: string
          id?: never
          lote_id?: string | null
          motivo_ajuste?: Database["public"]["Enums"]["motivo_ajuste"] | null
          nota?: string
          producto_id: string
          referencia_id?: string | null
          tipo: Database["public"]["Enums"]["tipo_movimiento"]
          usuario_id?: string | null
        }
        Update: {
          cantidad?: number
          fecha?: string
          id?: never
          lote_id?: string | null
          motivo_ajuste?: Database["public"]["Enums"]["motivo_ajuste"] | null
          nota?: string
          producto_id?: string
          referencia_id?: string | null
          tipo?: Database["public"]["Enums"]["tipo_movimiento"]
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movimientos_stock_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_stock_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "v_lotes_por_vencer"
            referencedColumns: ["lote_id"]
          },
          {
            foreignKeyName: "movimientos_stock_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_stock_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "v_productos"
            referencedColumns: ["id"]
          },
        ]
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
      venta_item_costos: {
        Row: {
          costo_unitario: number
          venta_item_id: string
        }
        Insert: {
          costo_unitario: number
          venta_item_id: string
        }
        Update: {
          costo_unitario?: number
          venta_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venta_item_costos_venta_item_id_fkey"
            columns: ["venta_item_id"]
            isOneToOne: true
            referencedRelation: "venta_items"
            referencedColumns: ["id"]
          },
        ]
      }
      venta_items: {
        Row: {
          cantidad: number
          descripcion: string
          id: string
          precio_unitario: number
          producto_id: string
          subtotal: number | null
          unidad: string
          venta_id: string
        }
        Insert: {
          cantidad: number
          descripcion: string
          id?: string
          precio_unitario: number
          producto_id: string
          subtotal?: number | null
          unidad?: string
          venta_id: string
        }
        Update: {
          cantidad?: number
          descripcion?: string
          id?: string
          precio_unitario?: number
          producto_id?: string
          subtotal?: number | null
          unidad?: string
          venta_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venta_items_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venta_items_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "v_productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venta_items_venta_id_fkey"
            columns: ["venta_id"]
            isOneToOne: false
            referencedRelation: "v_ventas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venta_items_venta_id_fkey"
            columns: ["venta_id"]
            isOneToOne: false
            referencedRelation: "ventas"
            referencedColumns: ["id"]
          },
        ]
      }
      ventas: {
        Row: {
          actualizado_en: string
          actualizado_por: string | null
          anulada_en: string | null
          anulada_por: string | null
          cliente_id: string | null
          creado_en: string
          creado_por: string | null
          estado: Database["public"]["Enums"]["estado_venta"]
          fecha: string
          forma_pago: Database["public"]["Enums"]["forma_pago"]
          id: string
          motivo_anulacion: string | null
          nota: string
          numero: number
          total: number
          vence_el: string | null
        }
        Insert: {
          actualizado_en?: string
          actualizado_por?: string | null
          anulada_en?: string | null
          anulada_por?: string | null
          cliente_id?: string | null
          creado_en?: string
          creado_por?: string | null
          estado?: Database["public"]["Enums"]["estado_venta"]
          fecha?: string
          forma_pago: Database["public"]["Enums"]["forma_pago"]
          id?: string
          motivo_anulacion?: string | null
          nota?: string
          numero?: never
          total?: number
          vence_el?: string | null
        }
        Update: {
          actualizado_en?: string
          actualizado_por?: string | null
          anulada_en?: string | null
          anulada_por?: string | null
          cliente_id?: string | null
          creado_en?: string
          creado_por?: string | null
          estado?: Database["public"]["Enums"]["estado_venta"]
          fecha?: string
          forma_pago?: Database["public"]["Enums"]["forma_pago"]
          id?: string
          motivo_anulacion?: string | null
          nota?: string
          numero?: never
          total?: number
          vence_el?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ventas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ventas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "v_clientes"
            referencedColumns: ["id"]
          },
        ]
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
      v_cc_movimientos: {
        Row: {
          cliente_id: string | null
          fecha: string | null
          id: number | null
          importe: number | null
          medio_pago: Database["public"]["Enums"]["forma_pago"] | null
          nota: string | null
          saldo_acumulado: number | null
          tipo: Database["public"]["Enums"]["tipo_cc"] | null
          usuario: string | null
          usuario_id: string | null
          vence_el: string | null
          venta_id: string | null
          venta_numero: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cc_movimientos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cc_movimientos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "v_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cc_movimientos_venta_id_fkey"
            columns: ["venta_id"]
            isOneToOne: false
            referencedRelation: "v_ventas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cc_movimientos_venta_id_fkey"
            columns: ["venta_id"]
            isOneToOne: false
            referencedRelation: "ventas"
            referencedColumns: ["id"]
          },
        ]
      }
      v_clientes: {
        Row: {
          activo: boolean | null
          actualizado_en: string | null
          creado_en: string | null
          cuit: string | null
          dias: number | null
          direccion: string | null
          estado: string | null
          id: string | null
          nombre: string | null
          notas: string | null
          saldo: number | null
          telefono: string | null
          ultimo_pago: string | null
          vence_el: string | null
          zona: string | null
        }
        Relationships: []
      }
      v_compras: {
        Row: {
          creado_en: string | null
          creado_por: string | null
          detalle: string | null
          fecha: string | null
          id: string | null
          items: number | null
          numero: number | null
          observaciones: string | null
          proveedor: string | null
          proveedor_id: string | null
          total: number | null
          usuario: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compras_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
        ]
      }
      v_gastos: {
        Row: {
          anulado: boolean | null
          anulado_en: string | null
          anulado_motivo: string | null
          anulado_por_nombre: string | null
          categoria: string | null
          categoria_id: string | null
          creado_en: string | null
          creado_por: string | null
          detalle: string | null
          fecha: string | null
          id: string | null
          medio_pago: Database["public"]["Enums"]["forma_pago"] | null
          monto: number | null
          pagado_a: string | null
          usuario: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gastos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "gasto_categorias"
            referencedColumns: ["id"]
          },
        ]
      }
      v_lotes_por_vencer: {
        Row: {
          cantidad_disponible: number | null
          costo_unitario: number | null
          dias: number | null
          fecha_vencimiento: string | null
          lote_id: string | null
          producto: string | null
          producto_id: string | null
          unidad_venta: Database["public"]["Enums"]["unidad_venta"] | null
          unidades_por_bulto: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lotes_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lotes_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "v_productos"
            referencedColumns: ["id"]
          },
        ]
      }
      v_movimientos_stock: {
        Row: {
          cantidad: number | null
          fecha: string | null
          id: number | null
          lote_id: string | null
          lote_vence: string | null
          motivo_ajuste: Database["public"]["Enums"]["motivo_ajuste"] | null
          nota: string | null
          producto: string | null
          producto_id: string | null
          referencia_id: string | null
          tipo: Database["public"]["Enums"]["tipo_movimiento"] | null
          unidad_venta: Database["public"]["Enums"]["unidad_venta"] | null
          unidades_por_bulto: number | null
          usuario: string | null
          usuario_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movimientos_stock_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_stock_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "v_lotes_por_vencer"
            referencedColumns: ["lote_id"]
          },
          {
            foreignKeyName: "movimientos_stock_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_stock_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "v_productos"
            referencedColumns: ["id"]
          },
        ]
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
          vence_proximo: string | null
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
      v_ventas: {
        Row: {
          anulada_en: string | null
          anulada_por: string | null
          anulada_por_nombre: string | null
          cliente: string | null
          cliente_id: string | null
          costo_total: number | null
          creado_por: string | null
          detalle: string | null
          dia: string | null
          estado: Database["public"]["Enums"]["estado_venta"] | null
          fecha: string | null
          forma_pago: Database["public"]["Enums"]["forma_pago"] | null
          ganancia: number | null
          id: string | null
          items: number | null
          motivo_anulacion: string | null
          nota: string | null
          numero: number | null
          total: number | null
          usuario: string | null
          vence_el: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ventas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ventas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "v_clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      v_ventas_por_dia: {
        Row: {
          cantidad: number | null
          costo: number | null
          dia: string | null
          ganancia: number | null
          ventas: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      ajustar_cc: {
        Args: {
          p_cliente_id: string
          p_importe: number
          p_nota: string
          p_saldo_inicial?: boolean
          p_vence_el?: string
        }
        Returns: number
      }
      ajustar_stock: {
        Args: {
          p_cantidad: number
          p_fecha_vencimiento?: string
          p_lote_id?: string
          p_motivo: Database["public"]["Enums"]["motivo_ajuste"]
          p_nota?: string
          p_producto_id: string
        }
        Returns: undefined
      }
      anular_venta: {
        Args: { p_motivo: string; p_venta_id: string }
        Returns: undefined
      }
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
      balance: {
        Args: { p_desde: string; p_hasta: string }
        Returns: {
          costo: number
          dia: string
          ganancia_bruta: number
          gastos: number
          gastos_cantidad: number
          resultado: number
          ventas: number
          ventas_cantidad: number
        }[]
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
      cargar_stock_inicial: {
        Args: {
          p_cantidad: number
          p_costo_unitario?: number
          p_fecha_vencimiento?: string
          p_producto_id: string
        }
        Returns: undefined
      }
      confirmar_venta: { Args: { p: Json }; Returns: string }
      consumir_stock: {
        Args: {
          p_cantidad: number
          p_lote_id?: string
          p_motivo?: Database["public"]["Enums"]["motivo_ajuste"]
          p_nota?: string
          p_producto_id: string
          p_referencia_id?: string
          p_tipo: Database["public"]["Enums"]["tipo_movimiento"]
        }
        Returns: undefined
      }
      es_superusuario: { Args: never; Returns: boolean }
      fecha_ar: { Args: { t: string }; Returns: string }
      guardar_producto: { Args: { p: Json }; Returns: string }
      hoy_ar: { Args: never; Returns: string }
      ingresar_stock: {
        Args: {
          p_cantidad: number
          p_compra_item_id?: string
          p_costo_unitario: number
          p_fecha_vencimiento: string
          p_motivo?: Database["public"]["Enums"]["motivo_ajuste"]
          p_nota?: string
          p_producto_id: string
          p_referencia_id?: string
          p_tipo: Database["public"]["Enums"]["tipo_movimiento"]
        }
        Returns: string
      }
      mover_cc: {
        Args: {
          p_cliente_id: string
          p_importe: number
          p_medio_pago?: Database["public"]["Enums"]["forma_pago"]
          p_nota?: string
          p_tipo: Database["public"]["Enums"]["tipo_cc"]
          p_vence_el?: string
          p_venta_id?: string
        }
        Returns: number
      }
      productos_mas_vendidos: {
        Args: { p_desde: string; p_hasta: string; p_limite?: number }
        Returns: {
          cantidad: number
          ganancia: number
          producto: string
          producto_id: string
          stock_actual: number
          stock_bajo: boolean
          unidad: string
          ventas: number
        }[]
      }
      redondear_precio: {
        Args: { redondeo: number; valor: number }
        Returns: number
      }
      redondeo_configurado: { Args: never; Returns: number }
      registrar_compra: { Args: { p: Json }; Returns: string }
      registrar_pago: {
        Args: {
          p_cliente_id: string
          p_importe: number
          p_medio: Database["public"]["Enums"]["forma_pago"]
          p_nota?: string
        }
        Returns: number
      }
      usuario_activo: { Args: never; Returns: boolean }
      ve_costos: { Args: never; Returns: boolean }
      ve_ganancias: { Args: never; Returns: boolean }
      ventas_por_categoria: {
        Args: { p_desde: string; p_hasta: string }
        Returns: {
          categoria: string
          porcentaje: number
          ventas: number
        }[]
      }
    }
    Enums: {
      estado_venta: "confirmada" | "anulada"
      forma_pago: "efectivo" | "transferencia" | "cuenta_corriente"
      motivo_ajuste: "rotura" | "vencido" | "conteo" | "otro"
      rol_usuario: "superusuario" | "administracion" | "reparto"
      tipo_cc: "saldo_inicial" | "venta" | "pago" | "anulacion_venta" | "ajuste"
      tipo_movimiento:
        | "carga_inicial"
        | "compra"
        | "venta"
        | "anulacion_venta"
        | "ajuste"
      unidad_venta: "unidad" | "pack" | "caja" | "cajon"
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
      estado_venta: ["confirmada", "anulada"],
      forma_pago: ["efectivo", "transferencia", "cuenta_corriente"],
      motivo_ajuste: ["rotura", "vencido", "conteo", "otro"],
      rol_usuario: ["superusuario", "administracion", "reparto"],
      tipo_cc: ["saldo_inicial", "venta", "pago", "anulacion_venta", "ajuste"],
      tipo_movimiento: [
        "carga_inicial",
        "compra",
        "venta",
        "anulacion_venta",
        "ajuste",
      ],
      unidad_venta: ["unidad", "pack", "caja", "cajon"],
    },
  },
} as const
