// Tipos de la base de datos.
// Escritos a mano para la fase 0; desde la fase 1 se generan con `npm run db:types`
// (necesita el proyecto de Supabase asociado con `npx supabase link`).

export type RolUsuario = 'superusuario' | 'administracion' | 'reparto'

export type Perfil = {
  id: string
  nombre: string
  rol: RolUsuario
  activo: boolean
  creado_en: string
  actualizado_en: string
}

export type Configuracion = {
  id: boolean
  nombre_negocio: string
  sucursal: string
  direccion: string
  telefono: string
  cuit: string
  leyenda_comprobante: string
  pie_comprobante: string
  plazo_cc_dias: number
  aviso_cc_dias: number
  aviso_vencimiento_dias: number
  redondeo_precio: 1 | 10 | 50 | 100
  mensaje_whatsapp: string
  actualizado_en: string
  actualizado_por: string | null
}

export type Auditoria = {
  id: number
  fecha: string
  usuario_id: string | null
  usuario: string | null
  tabla: string
  registro_id: string
  accion: 'insert' | 'update' | 'delete'
  antes: Record<string, unknown> | null
  despues: Record<string, unknown> | null
}

type Tabla<Fila, Insert = Partial<Fila>, Update = Partial<Fila>> = {
  Row: Fila
  Insert: Insert
  Update: Update
  Relationships: []
}

export interface Database {
  public: {
    Tables: {
      perfiles: Tabla<Perfil>
      configuracion: Tabla<Configuracion>
      auditoria: Tabla<Omit<Auditoria, 'usuario'>>
    }
    Views: {
      v_auditoria: { Row: Auditoria; Relationships: [] }
    }
    Functions: {
      auth_rol: { Args: Record<string, never>; Returns: RolUsuario | null }
      es_superusuario: { Args: Record<string, never>; Returns: boolean }
      ve_costos: { Args: Record<string, never>; Returns: boolean }
      usuario_activo: { Args: Record<string, never>; Returns: boolean }
      hoy_ar: { Args: Record<string, never>; Returns: string }
    }
    Enums: {
      rol_usuario: RolUsuario
    }
    CompositeTypes: Record<string, never>
  }
}
