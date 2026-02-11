
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

/**
 * Extracts text from an image using Gemini API.
 * Follows the latest @google/genai guidelines.
 */
export async function extractTextFromImage(
  base64Data: string, 
  mimeType: string, 
  sourceLang: string = 'auto',
  targetLang: string | null = null
): Promise<string> {
  // Try to get key from localStorage first (user-pasted key), fallback to environment
  const savedKey = localStorage.getItem('ocrlens_apikey');
  const apiKey = savedKey || import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("API Key não configurada. Por favor, cole sua chave nas configurações.");
  }

  const ai = new GoogleGenAI({ apiKey: apiKey });
  
  const systemInstruction = `
Você é o motor OCRLens, especializado em extração de texto de alta precisão.

DIRETRIZES:
1. Extraia o texto exatamente como apresentado na imagem.
2. Preserve a formatação, parágrafos e quebras de linha.
3. Ignore elementos decorativos, logotipos e ruídos visuais.
4. Se o idioma de origem for especificado como "${sourceLang}", utilize este contexto para melhorar a precisão.
5. ${targetLang ? `IMPORTANTE: Após a extração, traduza o conteúdo fielmente para o idioma "${targetLang}". Retorne APENAS o texto traduzido.` : 'Retorne APENAS o texto puro extraído.'}
6. Use tabelas em Markdown se detectar dados estruturados.
7. Não adicione comentários, introduções ou notas. Retorne apenas o resultado final.
`;

  const imagePart = {
    inlineData: {
      mimeType: mimeType,
      data: base64Data,
    },
  };

  const textPart = {
    text: "Extraia e processe o texto desta imagem."
  };

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [imagePart, textPart] },
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.1,
      }
    });

    return response.text || '';
  } catch (error: any) {
    console.error("OCRLens Service Error:", error);
    if (error.message?.includes("API key not valid")) {
      throw new Error("Sua chave de API parece ser inválida. Verifique-a nas configurações.");
    }
    throw error;
  }
}
