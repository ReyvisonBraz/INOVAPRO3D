import { GoogleGenAI } from "@google/genai";

const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["plates", "warnings"],
  properties: {
    plates: {
      type: "array",
      maxItems: 20,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "timeText", "filaments"],
        properties: {
          name: { type: "string" },
          timeText: { type: "string" },
          filaments: {
            type: "array",
            maxItems: 16,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["label", "grams"],
              properties: {
                label: { type: "string" },
                grams: { type: "number", minimum: 0 },
              },
            },
          },
        },
      },
    },
    warnings: { type: "array", maxItems: 10, items: { type: "string" } },
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
              "Para cada placa/bandeja, devolva o tempo exatamente como aparece e cada filamento com material, cor/slot quando visível e peso em gramas.",
              "Se a imagem mostrar somente totais do projeto, devolva uma única placa chamada 'Plate 1'.",
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
