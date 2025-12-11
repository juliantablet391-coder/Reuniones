import React, { useState } from 'react';
import { FileAudio, Mic, Download, Info } from 'lucide-react';
import { AppMode, TranscriptSegment, ProcessingState } from './types';
import { FileUploader } from './components/FileUploader';
import { TranscriptDisplay } from './components/TranscriptDisplay';
import { LiveSession } from './components/LiveSession';
import { transcribeAudioFile } from './services/geminiService';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.UPLOAD);
  const [transcripts, setTranscripts] = useState<TranscriptSegment[]>([]);
  const [processing, setProcessing] = useState<ProcessingState>({ isProcessing: false });

  // Handle File Transcription
  const handleFileProcess = async (base64: string, mimeType: string) => {
    setProcessing({ isProcessing: true, progress: 'Analizando audio...' });
    setTranscripts([]);
    
    try {
      const segments = await transcribeAudioFile(base64, mimeType);
      setTranscripts(segments);
      setProcessing({ isProcessing: false });
    } catch (error) {
      setProcessing({ isProcessing: false, error: 'Ocurrió un error al procesar el archivo. Revisa tu API Key.' });
    }
  };

  // Handle Live Transcription Update
  const handleLiveUpdate = (text: string) => {
    // Live API returns raw text streams. For the UI consistency, we create a pseudo-segment.
    // Real "Speaker Diarization" in live mode is complex without processing completed chunks.
    // We update the last segment if it exists and is recent, or create a new one.
    
    setTranscripts(prev => {
        const last = prev[prev.length - 1];
        // Simple logic: if the last segment is "Live User", append. 
        // In a real app, you'd use a timer to break segments.
        if (last && last.speaker === 'En Vivo') {
            const updated = [...prev];
            updated[updated.length - 1] = { ...last, text: last.text + text };
            return updated;
        } else {
            return [...prev, {
                speaker: 'En Vivo',
                gender: 'Desconocido', // Live API metadata is limited
                timestamp: new Date().toLocaleTimeString([], {minute:'2-digit', second:'2-digit'}),
                text: text
            }];
        }
    });
  };

  // Export Function
  const handleExport = () => {
    if (transcripts.length === 0) return;

    let content = "Hablante,Género,Tiempo,Texto\n";
    transcripts.forEach(t => {
      // Escape quotes for CSV
      const safeText = `"${t.text.replace(/"/g, '""')}"`;
      content += `${t.speaker},${t.gender},${t.timestamp},${safeText}\n`;
    });

    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `transcripcion_${new Date().toISOString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Mic className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                ReuniónAI
              </h1>
              <p className="text-xs text-slate-500">Transcripción Inteligente con Gemini</p>
            </div>
          </div>
          
          <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
            <button
              onClick={() => setMode(AppMode.UPLOAD)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${mode === AppMode.UPLOAD ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <div className="flex items-center gap-2">
                <FileAudio size={14} />
                <span>Archivo</span>
              </div>
            </button>
            <button
              onClick={() => setMode(AppMode.LIVE)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${mode === AppMode.LIVE ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <div className="flex items-center gap-2">
                <Mic size={14} />
                <span>En Vivo</span>
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-8">
        
        {/* Helper Card */}
        <div className="mb-8 p-4 bg-indigo-900/10 border border-indigo-500/20 rounded-lg flex gap-3 text-indigo-300 text-sm">
          <Info className="shrink-0 mt-0.5" size={18} />
          <div>
            <p className="font-semibold mb-1">Capacidades del Modelo</p>
            <p className="opacity-80">
              {mode === AppMode.UPLOAD 
                ? "El modo Archivo utiliza Gemini Flash para analizar todo el audio a la vez. Es ideal para obtener: Identificación precisa de hablantes, detección de género (masculino/femenino) y marcas de tiempo exactas."
                : "El modo En Vivo transcribe en tiempo real. Nota: La identificación de hablantes en tiempo real es limitada comparada con el procesamiento de archivos."}
            </p>
          </div>
        </div>

        {mode === AppMode.UPLOAD ? (
          <FileUploader onFileSelected={handleFileProcess} isProcessing={processing.isProcessing} />
        ) : (
          <LiveSession onTranscriptionUpdate={handleLiveUpdate} />
        )}

        {/* Processing State */}
        {processing.isProcessing && mode === AppMode.UPLOAD && (
          <div className="text-center py-8">
            <div className="inline-block w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-indigo-400 font-medium animate-pulse">{processing.progress}</p>
          </div>
        )}

        {/* Error State */}
        {processing.error && (
          <div className="bg-red-900/20 border border-red-500/50 text-red-300 p-4 rounded-lg mb-6 text-center">
            {processing.error}
          </div>
        )}

        {/* Results Header */}
        {(transcripts.length > 0) && (
          <div className="flex items-center justify-between mb-4 mt-8 border-b border-slate-800 pb-4">
            <h2 className="text-lg font-semibold text-slate-200">Transcripción</h2>
            <button 
              onClick={handleExport}
              className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 hover:bg-indigo-900/30 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Download size={16} />
              <span>Exportar CSV</span>
            </button>
          </div>
        )}

        {/* Transcript List */}
        <TranscriptDisplay segments={transcripts} />
      </main>
    </div>
  );
};

export default App;
