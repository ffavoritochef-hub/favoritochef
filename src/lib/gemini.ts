// Cliente mínimo da API do Google Gemini (plano gratuito). Usar SOMENTE no servidor.

export class GeminiError extends Error {
  constructor(message: string, public status = 500) {
    super(message);
  }
}

export const geminiConfigured = () => !!process.env.GEMINI_API_KEY;

export interface GeminiImage {
  mimeType: string;
  data: string; // base64
}

/** Gera uma resposta JSON seguindo `schema` (formato OpenAPI do Gemini). */
export async function geminiJson<T>(prompt: string, schema: object, images: GeminiImage[] = []): Promise<T> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new GeminiError('A IA ainda não foi configurada no servidor.', 503);
  const model = process.env.GEMINI_MODEL || 'gemini-flash-latest';

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }, ...images.map((i) => ({ inline_data: { mime_type: i.mimeType, data: i.data } }))],
        },
      ],
      generationConfig: { responseMimeType: 'application/json', responseSchema: schema, temperature: 0.8 },
    }),
    signal: AbortSignal.timeout(90_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error('gemini', res.status, body.slice(0, 500));
    if (res.status === 429) throw new GeminiError('A IA atingiu o limite gratuito por agora. Tente de novo em alguns minutos.', 429);
    if (res.status === 400 || res.status === 403) throw new GeminiError('A IA recusou o pedido. Verifique a chave GEMINI_API_KEY no servidor.', 502);
    throw new GeminiError('A IA está indisponível no momento. Tente de novo.', 502);
  }

  const json = await res.json();
  const text: string | undefined = json?.candidates?.[0]?.content?.parts?.find((p: { text?: string }) => p.text)?.text;
  if (!text) throw new GeminiError('A IA não conseguiu responder. Tente com outras fotos ou textos.', 502);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new GeminiError('A IA respondeu em um formato inesperado. Tente de novo.', 502);
  }
}
