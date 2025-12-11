import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, AlertCircle } from 'lucide-react';
import { connectLiveSession } from '../services/geminiService';
import { float32ToInt16, arrayBufferToBase64 } from '../services/audioUtils';

interface Props {
  onTranscriptionUpdate: (text: string) => void;
}

export const LiveSession: React.FC<Props> = ({ onTranscriptionUpdate }) => {
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Refs for audio processing
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const sessionRef = useRef<any>(null); // To store the Gemini Live session

  // Canvas for visualizer
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>();

  const startSession = async () => {
    setError(null);
    try {
      // 1. Get Microphone
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          sampleRate: 16000, 
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        } 
      });
      mediaStreamRef.current = stream;

      // 2. Setup Audio Context
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass({ sampleRate: 16000 });
      audioContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      sourceRef.current = source;

      // 3. Analyzer for Visualizer
      const analyzer = ctx.createAnalyser();
      analyzer.fftSize = 256;
      source.connect(analyzer);
      analyzerRef.current = analyzer;

      // 4. Processor for Data Stream
      // Using legacy ScriptProcessor for broader compatibility in this context, 
      // though AudioWorklet is preferred for heavy production.
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      // 5. Connect to Gemini Live
      const sessionPromise = connectLiveSession(
        () => setIsActive(true),
        (text, isFinal) => {
           onTranscriptionUpdate(text);
        },
        () => setIsActive(false),
        (err) => {
          console.error("Live API Error:", err);
          setError("Error de conexión con la API en vivo.");
          stopSession();
        }
      );

      // 6. Handle Audio Process
      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        // Convert to PCM Int16
        const pcmData = float32ToInt16(inputData);
        // Encode to base64
        const base64Data = arrayBufferToBase64(pcmData.buffer);

        // Send to Gemini
        sessionPromise.then(session => {
          sessionRef.current = session;
          session.sendRealtimeInput({
            media: {
              mimeType: 'audio/pcm;rate=16000',
              data: base64Data
            }
          });
        }).catch(e => console.error("Session not ready", e));
      };

      source.connect(processor);
      processor.connect(ctx.destination); // Required for script processor to run

      drawVisualizer();

    } catch (err) {
      console.error(err);
      setError("No se pudo acceder al micrófono o conectar.");
    }
  };

  const stopSession = () => {
    setIsActive(false);
    
    // Cleanup Audio
    if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
    }
    if (sourceRef.current) {
        sourceRef.current.disconnect();
        sourceRef.current = null;
    }
    if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
    }
    if (sessionRef.current) {
        // Assuming session object has a close method or similar if supported by SDK wrapper
        // The SDK examples show close in callbacks, but explicit close:
        // Currently we just stop sending data.
        sessionRef.current = null;
    }
    if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
    }
  };

  const drawVisualizer = () => {
    if (!canvasRef.current || !analyzerRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const analyzer = analyzerRef.current;
    if (!ctx) return;

    const bufferLength = analyzer.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);
      analyzer.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2;
        ctx.fillStyle = `rgb(${barHeight + 100}, 99, 235)`; // Indigo/Blueish
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }
    };
    draw();
  };

  useEffect(() => {
    return () => stopSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="w-full flex flex-col items-center gap-6">
      <div className="relative">
        <canvas 
            ref={canvasRef} 
            width={300} 
            height={80} 
            className="rounded-lg bg-slate-900 border border-slate-700 shadow-inner"
        />
        {!isActive && !error && (
             <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-xs uppercase tracking-wider">
                Visualizador Inactivo
             </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-400 bg-red-900/20 px-4 py-2 rounded-lg border border-red-900/50">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <button
        onClick={isActive ? stopSession : startSession}
        className={`
            flex items-center gap-2 px-8 py-3 rounded-full font-semibold shadow-lg transition-all transform hover:scale-105 active:scale-95
            ${isActive 
                ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/30' 
                : 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-indigo-500/30'}
        `}
      >
        {isActive ? (
            <>
                <MicOff size={20} />
                <span>Detener Grabación</span>
            </>
        ) : (
            <>
                <Mic size={20} />
                <span>Iniciar Transcripción en Vivo</span>
            </>
        )}
      </button>
      
      {isActive && (
        <p className="text-sm text-slate-400 animate-pulse">
            Escuchando y transcribiendo... (La API en vivo no separa hablantes automáticamente)
        </p>
      )}
    </div>
  );
};
