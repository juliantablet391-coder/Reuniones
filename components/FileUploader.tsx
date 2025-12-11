import React, { useState, useRef } from 'react';
import { Upload, FileAudio, X, Play } from 'lucide-react';

interface Props {
  onFileSelected: (base64: string, mimeType: string, fileName: string) => void;
  isProcessing: boolean;
}

export const FileUploader: React.FC<Props> = ({ onFileSelected, isProcessing }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    // Basic validation
    const validTypes = ['audio/mp4', 'audio/mpeg', 'audio/x-m4a', 'audio/wav', 'audio/aac', 'audio/webm'];
    // Many mobile devices record in audio/mp4 or audio/x-m4a
    // We accept general audio
    if (!file.type.startsWith('audio/') && !file.type.includes('mp4')) {
        alert("Por favor selecciona un archivo de audio válido.");
        return;
    }

    setSelectedFile(file);
    
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g., "data:audio/mpeg;base64,")
      const base64Data = result.split(',')[1];
      onFileSelected(base64Data, file.type, file.name);
    };
    reader.readAsDataURL(file);
  };

  const clearFile = () => {
    setSelectedFile(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="w-full mb-8">
      {!selectedFile ? (
        <div 
          onClick={() => !isProcessing && inputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all
            ${isProcessing ? 'border-slate-700 opacity-50 cursor-not-allowed' : 'border-slate-600 hover:border-indigo-500 hover:bg-slate-800/50'}
          `}
        >
          <input 
            type="file" 
            ref={inputRef} 
            onChange={handleFileChange} 
            className="hidden" 
            accept="audio/*,.m4a"
          />
          <div className="flex flex-col items-center gap-3">
            <div className="p-4 bg-slate-800 rounded-full text-indigo-400">
              <Upload size={32} />
            </div>
            <h3 className="text-lg font-medium text-slate-200">Sube tu grabación de reunión</h3>
            <p className="text-sm text-slate-400">Soporta M4A, MP3, WAV (Móviles)</p>
          </div>
        </div>
      ) : (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-900/30 p-3 rounded-lg text-indigo-400">
              <FileAudio size={24} />
            </div>
            <div>
              <p className="font-medium text-slate-200 truncate max-w-[200px] sm:max-w-md">{selectedFile.name}</p>
              <p className="text-xs text-slate-500">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
            </div>
          </div>
          {!isProcessing && (
            <button 
              onClick={clearFile}
              className="p-2 hover:bg-red-900/20 text-slate-400 hover:text-red-400 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
