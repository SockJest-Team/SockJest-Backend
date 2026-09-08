export const MAX_IMAGENES_POR_SUBASTA = 5;
export const INCREMENTO_MINIMO_DEFAULT = 5;
export const COMISION_PLATAFORMA_PCT = 0.05;
export const ESTADOS_CATALOGO = ['Aprobada', 'Activa', 'Finalizada'] as const;

export const TRANSICIONES_ESTADOS: Record<string, readonly string[]> = {
  Pendiente: ['Aprobada', 'Rechazada'],
  Aprobada: ['Activa', 'Rechazada'],
  Activa: ['Finalizada'],
  Rechazada: [],
  Finalizada: [],
};
