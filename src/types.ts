export interface PasoEstimado {
  paso: string;
  duracionMin: number;
  duracionMax: number;
}

export interface ResultadoTempario {
  vehiculo: string;
  reparacion: string;
  tiempoMinimo: number;
  tiempoMaximo: number;
  pasos: PasoEstimado[];
  consejos: string[];
  explicacionSencilla: string;
}

export interface RegistroConsulta {
  id: string;
  fecha: string;
  usuario: string;
  vehiculo: string;
  consulta: string;
  resultado: ResultadoTempario;
  sincronizadoSheets?: boolean;
  errorSincronizacion?: string;
  _notSavedInHistory?: boolean;
}

export interface EstadisticaCategoria {
  categoria: string;
  cantidad: number;
  porcentaje: number;
}
