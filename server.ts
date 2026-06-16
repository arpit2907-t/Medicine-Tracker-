import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

// Load configuration
dotenv.config();

const app = express();
const PORT = 3000;

// Reassuring middleware for JSON bodies (expanding size limits for base64 uploads)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Lazy initializer for Gemini client to prevent crash if key is missing during startup
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is not configured. Please add it via Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// 🩺 API Endpoint: Extract medicine schedules from an uploaded prescription image (or camera frame)
app.post("/api/extract-prescription", async (req, res) => {
  try {
    const { image, mimeType } = req.body;
    if (!image) {
      return res.status(400).json({ error: "Missing prescription image data." });
    }

    // Clean base64 string if it contains prefix
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const actualMimeType = mimeType || "image/jpeg";

    const ai = getGeminiClient();

    const systemInstruction = 
      "You are an expert pharmaceutical assistant. Your task is to analyze the uploaded doctor's prescription " +
      "or medicine label image and extract structural medication details. Be highly careful with drug names, " +
      "dosages, and frequencies. If some details are unreadable or handwriting is extremely faint, make a " +
      "wise clinical estimate based on standard practices, or complete the fields to the best of your ability. " +
      "Construct high-quality 24-hour military-style schedules (e.g. ['08:00', '20:00'] for twice daily, " +
      "['08:00', '13:00', '19:00'] for breakfast/lunch/dinner, etc.). Keep medicine names neat and capitalized.";

    const promptString = 
      "Scan this image. Identify all medications, their descriptive details, dosage instruction, frequency, " +
      "intake instructions (before/after food, with water, warning notes), category type, total duration, and " +
      "compute or estimate the total starting quantity (for example, if taking 1 tablet 3 times a day for 10 days, " +
      "total starting quantity is 30. If it is an ointment or syrup, use standard packaging values like 1 or the " +
      "predicted count of tablets). Output structural JSON conforming exactly to the responseSchema.";

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        {
          inlineData: {
            data: base64Data,
            mimeType: actualMimeType,
          },
        },
        { text: promptString }
      ],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            medicines: {
              type: Type.ARRAY,
              description: "List of successfully parsed medications from the doctor's prescription.",
              items: {
                type: Type.OBJECT,
                properties: {
                  name: {
                    type: Type.STRING,
                    description: "Properly capitalized name of the drug."
                  },
                  dosage: {
                    type: Type.STRING,
                    description: "Dosage amount e.g., '1 tablet', '10ml', '2 drops', '1 puff'."
                  },
                  frequency: {
                    type: Type.STRING,
                    description: "Frequency explanation in words e.g., 'Twice a day', 'Once daily at night', 'Every 8 hours', 'With breakfast and dinner'."
                  },
                  specificTimes: {
                    type: Type.ARRAY,
                    description: "Estimated or specified 24-hour clock times for intake based on the frequency e.g. ['08:00', '20:00']. Must be array of string times.",
                    items: {
                      type: Type.STRING
                    }
                  },
                  durationDays: {
                    type: Type.INTEGER,
                    description: "Estimated treatment duration in days. If unspecified, assume 10 days (use integers)."
                  },
                  totalQuantityToStart: {
                    type: Type.INTEGER,
                    description: "Total count/pieces of capsules, tablets, or bottles supplied. If medication is taken twice daily for 10 days, this should be 20. If unspecified, default to 30."
                  },
                  instructions: {
                    type: Type.STRING,
                    description: "Special intake instructions e.g., 'Take after food', 'Take empty stomach', 'Avoid alcohol/dairy'."
                  },
                  category: {
                    type: Type.STRING,
                    description: "An medical category for grouping e.g. 'Antibiotic', 'Analgesic (Pain Relief)', 'Digestive', 'Allergy', 'Cardiovascular', 'Vitamins & Supplements', 'Diabetes'."
                  }
                },
                required: ["name", "dosage", "frequency", "specificTimes", "durationDays", "totalQuantityToStart", "instructions", "category"]
              }
            },
            clinicalDisclaimer: {
              type: Type.STRING,
              description: "A friendly and humble safety prompt encouraging the customer to confirm details with their pharmacist or doctor."
            }
          },
          required: ["medicines", "clinicalDisclaimer"]
        }
      }
    });

    const parsedResponse = JSON.parse(response.text || "{}");
    res.json(parsedResponse);
  } catch (error: any) {
    console.error("Prescription parsing error:", error);
    res.status(500).json({
      error: "Failed to extract medication from prescription.",
      details: error?.message || String(error),
    });
  }
});

// Configure Vite middleware or production static serving
async function configureApp() {
  if (process.env.NODE_ENV !== "production") {
    // Development mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production mode
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`MediTrack full-stack application running at http://localhost:${PORT}`);
  });
}

configureApp();
