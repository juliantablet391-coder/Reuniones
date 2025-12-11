import React from 'react';
import { TranscriptSegment } from '../types';
import { User, Clock, Mic } from 'lucide-react';

interface Props {
  segments: TranscriptSegment[];
  isLoading?: boolean;
}

export const TranscriptDisplay: React.FC<Props> = ({ segments, isLoading }) => {
  if (!segments.length && !isLoading) {
    return (
      <div className="text-center py-12 text-slate-500 border-2 border-dashed border-slate-700 rounded-lg bg-slate-800/50">
        <p>No hay transcripciones disponibles aún.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {segments.map((seg, idx) => (
        <div 
          key={idx} 
          className="bg-slate-800 border border-slate-700 rounded-lg p-4 hover:border-indigo-500/50 transition-colors shadow-sm"
        >
          <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-wide font-semibold text-slate-400 mb-2">
            <div className={`flex items-center gap-1 px-2 py-1 rounded ${seg.gender === 'Masculino' ? 'bg-blue-900/30 text-blue-400' : seg.gender === 'Femenino' ? 'bg-pink-900/30 text-pink-400' : 'bg-slate-700 text-slate-300'}`}>
              <User size={12} />
              <span>{seg.speaker}</span>
              {seg.gender !== 'Desconocido' && <span className="opacity-75">({seg.gender})</span>}
            </div>
            <div className="flex items-center gap-1 text-slate-500 bg-slate-900/50 px-2 py-1 rounded">
              <Clock size={12} />
              <span>{seg.timestamp}</span>
            </div>
          </div>
          <p className="text-slate-200 leading-relaxed whitespace-pre-wrap">{seg.text}</p>
        </div>
      ))}
      {isLoading && (
        <div className="animate-pulse space-y-3">
          <div className="h-24 bg-slate-800 rounded-lg"></div>
          <div className="h-24 bg-slate-800 rounded-lg"></div>
        </div>
      )}
    </div>
  );
};
