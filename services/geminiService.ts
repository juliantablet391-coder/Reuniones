import { GoogleGenAI, Type } from "@google/genai";
import { TranscriptSegment } from "../types";

// Initialize API
const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

/**
 * Transcribe an audio file using generateContent with a specific schema
 * to extract speaker, gender, and timestamps.
 */
export const transcribeAudioFile = async (
  base64Data: string,
  mimeType: string
): Promise<TranscriptSegment[]> => {
  if (!apiKey) throw new Error("API Key faltante.");

  const modelId = "gemini-2.5-flash"; // Good balance of speed and multimodal capability

  const prompt = `
    Actúa como un transcriptor experto de reuniones.
    Analiza el archivo de audio proporcionado.
    Tu tarea es generar una transcripción estructurada.
    
    Reglas:
    1. Identifica a los diferentes hablantes (Ej: "Hablante 1", "Hablante 2").
    2. Estima el género de la voz (Masculino/Femenino) basándote en el tono.
    3. Proporciona una marca de tiempo aproximada (formato MM:SS) de inicio del segmento.
    4. Transcribe el texto exacto dicho en español.
    
    Devuelve SOLO un array JSON válido.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              speaker: { type: Type.STRING, description: "Identificador del hablante (ej. Hablante 1)" },
              gender: { type: Type.STRING, enum: ["Masculino", "Femenino", "Desconocido"] },
              timestamp: { type: Type.STRING, description: "Formato MM:SS" },
              text: { type: Type.STRING, description: "El texto transcrito" },
            },
            required: ["speaker", "gender", "timestamp", "text"],
          },
        },
      },
    });

    const jsonText = response.text;
    if (!jsonText) return [];
    return JSON.parse(jsonText) as TranscriptSegment[];
  } catch (error) {
    console.error("Error en transcripción de archivo:", error);
    throw error;
  }
};

/**
 * Establish a Live API connection.
 * Note: Live API is conversational. We use inputAudioTranscription to get the user's text.
 * Diarization is limited in Live mode compared to File mode.
 */
export const connectLiveSession = async (
  onOpen: () => void,
  onTranscription: (text: string, isFinal: boolean) => void,
  onClose: () => void,
  onError: (err: any) => void
) => {
  if (!apiKey) throw new Error("API Key faltante.");

  const session = await ai.live.connect({
    model: 'gemini-2.5-flash-native-audio-preview-09-2025',
    config: {
      systemInstruction: "Eres un transcriptor silencioso. Escucha el audio y transcríbelo con precisión. No respondas a las preguntas, solo transcribe.",
      inputAudioTranscription: {
        model: "gemini-2.5-flash-native-audio-preview-09-2025" 
      },
    },
    callbacks: {
      onopen: onOpen,
      onclose: onClose,
      onerror: onError,
      onmessage: (msg) => {
        // Handle Input Transcription (User's voice transcribed by Gemini)
        const inputTx = msg.serverContent?.inputTranscription;
        if (inputTx) {
          // Send text update. Gemini sends chunks, so we just stream the text.
          if (inputTx.text) {
             onTranscription(inputTx.text, !!msg.serverContent?.turnComplete);
          }
        }
      }
    }
  });

  return session;
};
