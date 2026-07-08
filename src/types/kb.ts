// Sugerencias de la Base de Conocimiento oficial de Finnegans
// (bc.finneg.com, foro Discourse). Shape del back: /api/kb/*.

export interface KbSugerencia {
  topicId: number;
  titulo: string;
  slug: string;
  url: string;
  extracto: string;
  categoria: string;
  tags: string[];
}

export interface KbRespuesta {
  consulta: string;
  sugerencias: KbSugerencia[];
}
