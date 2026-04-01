import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const systemPrompts: Record<number, string> = {
    1: "You are an expert AI image generation prompt engineer. Analyze this image in extreme detail and return ONLY a valid JSON object with these exact keys: subject, composition, lighting, colors, textures, mood, style, camera_angle, background, quality_tags. No explanation, no markdown, only raw JSON.",
    2: "You are a creative director and cinematographer. Analyze the directional and compositional choices in this image and return ONLY a valid JSON object with these exact keys: primary_concept, narrative, scene_type, subject_focus, spatial_layout, depth_of_field, movement_feeling, emotional_tone, symbolic_elements. No explanation, no markdown, only raw JSON.",
    3: "You are an art historian and visual style analyst. Extract the complete visual style fingerprint of this image and return ONLY a valid JSON object with these exact keys: art_movement, rendering_style, color_palette_name, texture_quality, line_work, material_properties, era_influence, technical_approach, unique_identifiers. No explanation, no markdown, only raw JSON.",
    4: "You are an expert typographer and graphic designer. Analyze all typography and text elements visible in this image and return ONLY a valid JSON object with these exact keys: font_style, font_weight, font_category, letter_spacing, text_alignment, text_color, text_effects, hierarchy_structure, layout_relationship, typographic_mood. If no text is visible, return recommended typography that suits this image style. No explanation, no markdown, only raw JSON."
};

async function startServer() {
    const app = express();
    const PORT = 3000;

    app.use(cors());
    app.use(express.json({ limit: '10mb' }));

    // API Routes
    app.post("/api/analyze", async (req, res) => {
        const { image, mimeType, tab, apiKey } = req.body;
        
        // Use provided key or environment key
        const key = apiKey || process.env.GEMINI_API_KEY;
        
        if (!key) {
            return res.status(400).json({ error: "API Key is required" });
        }

        try {
            const ai = new GoogleGenAI({ apiKey: key });
            const prompt = systemPrompts[tab] || systemPrompts[1];

            const response = await ai.models.generateContent({
                model: "gemini-2.0-flash",
                contents: [{
                    parts: [
                        { text: prompt },
                        { inlineData: { data: image, mimeType: mimeType || "image/jpeg" } }
                    ]
                }],
                config: {
                    temperature: 0.4,
                    maxOutputTokens: 2048
                }
            });

            const text = response.text;
            res.json({ text });
        } catch (error: any) {
            console.error("Gemini API Error:", error);
            res.status(500).json({ error: error.message || "Failed to analyze image" });
        }
    });

    // Vite middleware for development
    if (process.env.NODE_ENV !== "production") {
        const vite = await createViteServer({
            server: { middlewareMode: true },
            appType: "spa",
        });
        app.use(vite.middlewares);
    } else {
        const distPath = path.join(process.cwd(), "dist");
        app.use(express.static(distPath));
        app.get("*", (req, res) => {
            res.sendFile(path.join(distPath, "index.html"));
        });
    }

    app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

startServer();
