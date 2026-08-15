import { GoogleGenAI } from "@google/genai";

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
  const response = await ai.models.generateContent({
    model: process.env.GEMINI_SLICER_MODEL || "gemini-2.5-flash",
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
}
