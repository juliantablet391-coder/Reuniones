export interface TranscriptSegment {
  speaker: string;
  gender: 'Masculino' | 'Femenino' | 'Desconocido';
  timestamp: string;
  text: string;
}

export enum AppMode {
  UPLOAD = 'UPLOAD',
  LIVE = 'LIVE'
}

export interface ProcessingState {
  isProcessing: boolean;
  progress?: string;
  error?: string;
}
