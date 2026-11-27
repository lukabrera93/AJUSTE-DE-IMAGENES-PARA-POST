import "dotenv/config";
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === "production";

interface AnalyzeFontInput {
  id: string;
  name: string;
  category: string;
  isCustom: boolean;
}

interface AnalyzeLayerInput {
  id: string;
  role: string;
  text: string;
}

interface AnalyzeRequestBody {
  imageBase64?: string;
  mimeType?: string;
  aspectRatio?: "1080x1350" | "1080x1920";
  fonts?: AnalyzeFontInput[];
  textLayers?: AnalyzeLayerInput[];
}

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("MISSING_GEMINI_API_KEY");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "25mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.post("/api/analyze-layout", async (req, res) => {
    try {
      const body = req.body as AnalyzeRequestBody;
      const { imageBase64, mimeType, aspectRatio, fonts, textLayers } = body;

      if (!imageBase64 || !mimeType) {
        res.status(400).json({
          error: "Debes proporcionar una imagen válida para analizar.",
          code: "INVALID_INPUT",
        });
        return;
      }

      if (!textLayers || textLayers.length === 0) {
        res.status(400).json({
          error: "Añade al menos un bloque de texto antes de analizar.",
          code: "NO_TEXT_LAYERS",
        });
        return;
      }

      const ai = getAiClient();
      const targetFormat = aspectRatio === "1080x1920" ? "1080x1920 (9:16 Historia)" : "1080x1350 (4:5 Feed Vertical)";
      const safeFonts = (fonts && fonts.length > 0 ? fonts : []).slice(0, 24);
      const customFonts = safeFonts.filter((f) => f.isCustom);
      const fontSummary = safeFonts
        .map((f) => `- "${f.name}" (categoría: ${f.category}, origen: ${f.isCustom ? "SUBIDA POR EL USUARIO - PRIORIZAR" : "Estudio"})`)
        .join("\n");

      const layersSummary = textLayers
        .map((l) => `- id: "${l.id}", rol: "${l.role}", texto: "${l.text.slice(0, 220)}"`)
        .join("\n");

      const systemInstruction = `Eres director de arte editorial para redes sociales (1080x1350 y 1080x1920).
Analiza rápidamente la imagen: espacio negativo, contraste y sujeto principal.
Reglas clave:
1. En 1080x1920 evita el 14% superior y 18% inferior. En 1080x1350 respeta 6% de margen.
2. Usa SOLO los nombres exactos de fuentes proporcionados. ${
        customFonts.length > 0
          ? "PRIORIZA las fuentes marcadas como SUBIDA POR EL USUARIO."
          : "Combina con criterio las fuentes del estudio."
      }
3. Sé muy breve (máximo 14 palabras por descripción) para responder rápido:
   - "recommendations": 3 recomendaciones concretas de estética limpia ejecutables.
   - "proposals": 2 composiciones completas bien diferenciadas.
4. Coordenadas en porcentaje (0-100): x (6..58), y (6..84), widthPct (34..88, x+widthPct<=94), fontSize (base 1080px: título 58-108, subtítulo 26-40, etiqueta 20-26). Evita solapamientos y usa color hex de alto contraste.`;

      const promptText = `Formato: ${targetFormat}.
Fuentes disponibles:
${fontSummary}

Capas de texto:
${layersSummary}

Devuelve 3 recomendaciones de estética limpia y 2 composiciones en español de forma concisa.`;

      const cleanBase64 = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;

      const placementSchema = {
        type: Type.OBJECT,
        properties: {
          layerId: { type: Type.STRING },
          x: { type: Type.NUMBER },
          y: { type: Type.NUMBER },
          widthPct: { type: Type.NUMBER },
          fontFamily: { type: Type.STRING },
          fontSize: { type: Type.NUMBER },
          fontWeight: { type: Type.NUMBER },
          letterSpacing: { type: Type.NUMBER },
          lineHeight: { type: Type.NUMBER },
          textAlign: { type: Type.STRING },
          color: { type: Type.STRING },
          shadowStrength: { type: Type.NUMBER },
        },
        required: [
          "layerId",
          "x",
          "y",
          "widthPct",
          "fontFamily",
          "fontSize",
          "fontWeight",
          "letterSpacing",
          "lineHeight",
          "textAlign",
          "color",
          "shadowStrength",
        ],
      };

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: cleanBase64,
              },
            },
            {
              text: promptText,
            },
          ],
        },
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              paletteColors: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "4 colores hexadecimales dominantes o complementarios extraídos de la imagen.",
              },
              focalZone: {
                type: Type.OBJECT,
                properties: {
                  x: { type: Type.NUMBER },
                  y: { type: Type.NUMBER },
                  width: { type: Type.NUMBER },
                  height: { type: Type.NUMBER },
                  label: { type: Type.STRING },
                },
                required: ["x", "y", "width", "height", "label"],
              },
              recommendations: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    category: { type: Type.STRING },
                    recommendedScrim: { type: Type.STRING },
                    scrimOpacity: { type: Type.NUMBER },
                    placements: {
                      type: Type.ARRAY,
                      items: placementSchema,
                    },
                  },
                  required: [
                    "id",
                    "title",
                    "description",
                    "category",
                    "recommendedScrim",
                    "scrimOpacity",
                    "placements",
                  ],
                },
              },
              proposals: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    title: { type: Type.STRING },
                    rationale: { type: Type.STRING },
                    recommendedScrim: { type: Type.STRING },
                    scrimOpacity: { type: Type.NUMBER },
                    placements: {
                      type: Type.ARRAY,
                      items: placementSchema,
                    },
                  },
                  required: ["id", "title", "rationale", "recommendedScrim", "scrimOpacity", "placements"],
                },
              },
            },
            required: ["paletteColors", "focalZone", "recommendations", "proposals"],
          },
        },
      });

      const rawText = response.text;
      if (!rawText) {
        res.status(502).json({
          error: "El motor de análisis no devolvió resultados válidos.",
          code: "EMPTY_RESPONSE",
        });
        return;
      }

      const parsed = JSON.parse(rawText);
      res.json(parsed);
    } catch (err: unknown) {
      const errorObj = err as { message?: string; status?: number; code?: string };
      const message = errorObj?.message || "Error inesperado al analizar la imagen.";
      console.error("Error in /api/analyze-layout:", message);

      if (message === "MISSING_GEMINI_API_KEY") {
        res.status(500).json({
          error: "Falta configurar GEMINI_API_KEY en el panel de Secretos de Configuración.",
          code: "MISSING_API_KEY",
        });
        return;
      }

      if (message.includes("API_KEY_INVALID") || errorObj?.status === 400) {
        res.status(400).json({
          error: "La clave de API no es válida. Verifica Settings > Secrets.",
          code: "API_KEY_INVALID",
        });
        return;
      }

      if (message.includes("PERMISSION_DENIED") || errorObj?.status === 403) {
        res.status(403).json({
          error: "Permiso denegado al servicio de análisis. Verifica tu clave en Settings > Secrets.",
          code: "PERMISSION_DENIED",
        });
        return;
      }

      if (message.includes("RESOURCE_EXHAUSTED") || errorObj?.status === 429) {
        res.status(429).json({
          error: "Límite de cuota temporal alcanzado. Intenta nuevamente en unos segundos.",
          code: "RESOURCE_EXHAUSTED",
        });
        return;
      }

      res.status(500).json({
        error: "No se pudo completar el análisis visual. Intenta de nuevo.",
        code: "ANALYSIS_FAILED",
      });
    }
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, "dist");
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get("/{*splat}", (_req, res) => {
        res.sendFile(path.join(distDir, "index.html"));
      });
    }
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Retícula Studio server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
