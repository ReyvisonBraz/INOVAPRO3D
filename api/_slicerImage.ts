import { GoogleGenAI } from "@google/genai";

const DEFAULT_MODELS = ["gemini-3.6-flash", "gemini-3.1-flash-lite", "gemini-2.5-flash-lite"];

const RESPONSE_SCHEMA = {
  type: "object",
  required: ["plates", "filaments", "warnings"],
  properties: {
    plates: {
      type: "array",
      items: {
        type: "object",
        required: ["name", "timeText"],
        properties: {
          name: { type: "string" },
          timeText: { type: "string" },
        },
      },
    },
    filaments: {
      type: "array",
      items: {
        type: "object",
        required: ["label", "grams"],
        properties: {
          label: { type: "string" },
          grams: { type: "number" },
        },
      },
    },
    warnings: { type: "array", items: { type: "string" } },
  },
};

export async function extractSlicerImageWithGemini(input: {
  imageData: string;
  mimeType: string;
}): Promise<unknown> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_NOT_CONFIGURED");
  const ai = new GoogleGenAI({ apiKey });
  const configuredModel = process.env.GEMINI_SLICER_MODEL?.trim();
  const models = [...new Set([configuredModel, ...DEFAULT_MODELS].filter(Boolean))] as string[];
  let lastUnavailableError: unknown;

  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [
          {
            role: "user",
            parts: [
              {
                text: [
                  "Leia este recorte do resumo de fatiamento do Bambu Studio.",
                  "Extraia apenas valores visíveis; nunca estime nem calcule números ausentes.",
                  "Em plates, devolva cada placa/bandeja e seu tempo exatamente como aparecem na seção de estimativa de tempo.",
                  "Em filaments, devolva cada linha de filamento usando somente o peso em gramas da coluna Total; inclua número, material, cor ou slot no label quando estiverem visíveis.",
                  "Não use a linha geral Total como se fosse outro filamento.",
                  "Não confunda metros de filamento, custo ou porcentagem com gramas.",
                  "Se algum valor estiver cortado ou ilegível, deixe o campo vazio e explique em warnings.",
                ].join(" "),
              },
              { inlineData: { data: input.imageData, mimeType: input.mimeType } },
            ],
          },
        ],
        config: {
          temperature: 0,
          responseMimeType: "application/json",
          responseJsonSchema: RESPONSE_SCHEMA,
        },
      });
      if (!response.text) throw new Error("EMPTY_MODEL_RESPONSE");
      return JSON.parse(response.text) as unknown;
    } catch (error) {
      // Contas novas podem não ter acesso a modelos antigos. Só tenta o
      // próximo modelo em 404; erros de chave, cota ou conteúdo continuam
      // visíveis e não geram chamadas/custos duplicados.
      if (
        typeof error === "object" &&
        error !== null &&
        "status" in error &&
        error.status === 404
      ) {
        lastUnavailableError = error;
        continue;
      }
      throw error;
    }
  }

  throw lastUnavailableError ?? new Error("GEMINI_MODEL_UNAVAILABLE");
}
