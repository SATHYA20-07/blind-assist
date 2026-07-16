/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Set up JSON parsing with generous limits to support base64 images
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ limit: "20mb", extended: true }));

// Lazy init the GoogleGenAI client to avoid crashing on start if the key is missing
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      throw new Error("GEMINI_API_KEY environment variable is not configured. Please add it in Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "AI Smart Vision Assistant API is online" });
});

// API endpoint for smart vision analysis
app.post("/api/analyze", async (req, res) => {
  try {
    const { image, mode, faces, translationTarget, appLanguage } = req.body;

    if (!image) {
      res.status(400).json({ error: "Missing image data" });
      return;
    }

    const ai = getGeminiClient();
    const base64Data = image.split(",")[1] || image; // Strip out the data:image/jpeg;base64, prefix if present
    const mimeType = image.split(";")[0]?.split(":")[1] || "image/jpeg";

    // Setup input parts
    const currentFramePart = {
      inlineData: {
        mimeType,
        data: base64Data,
      },
    };

    let systemInstruction = "";
    let promptText = "";
    const extraParts: any[] = [];
    let responseSchema: any = null;

    // Define instructions and structures based on the selected mode
    switch (mode) {
      case "scene":
        systemInstruction = "You are a highly detailed visual guide assisting a blind or visually impaired person. Your goal is to give a vivid, compact, clear, and descriptive spatial outline of what is directly ahead. Describe layout, people, objects, general activity, lighting, and mood. Avoid technical system jargon.";
        promptText = "Analyze this image and describe it clearly for a visually impaired user. Provide the output in JSON format with fields: 'description' (vivid paragraph description), 'categories' (array of simple tag strings), and 'elements' (array of objects with 'label' and 'position' e.g. [{'label': 'wooden chair', 'position': 'center left'}]).";
        responseSchema = {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING, description: "A vivid description for a blind user, describing the surroundings." },
            categories: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "High-level visual category tags (e.g. kitchen, street, daytime, people)."
            },
            elements: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING, description: "Name of the element" },
                  position: { type: Type.STRING, description: "Spatial location relative to the frame (e.g. front left, center, top right)" }
                },
                required: ["label", "position"]
              }
            }
          },
          required: ["description", "categories", "elements"]
        };
        break;

      case "object":
        systemInstruction = "You are an accurate real-time object localizer. Identify key visual items in the image and locate them precisely using bounding boxes.";
        promptText = "Detect all major, discrete physical items in this image. For each, estimate a 2D bounding box normalized to a range of 0 to 1000 where [ymin, xmin, ymax, xmax] represents coordinates (0 is top/left, 1000 is bottom/right). Output in JSON with 'objects' (array of objects, each containing: 'label' (string), 'confidence' (float, 0-1), and 'box' (array of exactly 4 numbers [ymin, xmin, ymax, xmax])).";
        responseSchema = {
          type: Type.OBJECT,
          properties: {
            objects: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING, description: "Simple generic name of the object" },
                  confidence: { type: Type.NUMBER, description: "Confidence score between 0.0 and 1.0" },
                  box: {
                    type: Type.ARRAY,
                    items: { type: Type.INTEGER },
                    description: "Bounding box [ymin, xmin, ymax, xmax] from 0 to 1000"
                  }
                },
                required: ["label", "confidence", "box"]
              }
            }
          },
          required: ["objects"]
        };
        break;

      case "color":
        systemInstruction = "You are an expert color analyzer for the visually impaired. You detect general dominant colors and the exact color at the absolute center of the camera view (crosshair).";
        promptText = "Analyze colors in this image. Identify the dominant colors and the precise color in the center of the frame (where a person pointing their camera would target). Return JSON with 'dominantColors' (array of objects with 'name', 'hex', and 'percentage' of pixel coverage) and 'centerColor' (object with 'name', 'hex', and a descriptive 'description' like 'Vibrant royal blue' or 'Faded forest green').";
        responseSchema = {
          type: Type.OBJECT,
          properties: {
            dominantColors: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  hex: { type: Type.STRING },
                  percentage: { type: Type.NUMBER }
                },
                required: ["name", "hex", "percentage"]
              }
            },
            centerColor: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING, description: "Simple color name e.g. Crimson" },
                hex: { type: Type.STRING, description: "Hex value of the center color" },
                description: { type: Type.STRING, description: "Vivid, conversational color descriptor e.g. Deep glossy forest green" }
              },
              required: ["name", "hex", "description"]
            }
          },
          required: ["dominantColors", "centerColor"]
        };
        break;

      case "obstacle":
        systemInstruction = "You are a proactive mobility safety guide assisting a blind pedestrian. Scan the ground and path for physical hazards, trip hazards, steps, stairs, curbs, low-hanging signs, wires, puddles, or furniture.";
        promptText = "Detect any obstacles or hazards that might block or trip a blind pedestrian. Estimate their distance, direction (one of: 'front-left', 'directly ahead', 'front-right', 'below', 'above', 'left', 'right'), and safety severity ('low', 'medium', 'high'). Return a JSON with an 'obstacles' array containing these fields.";
        responseSchema = {
          type: Type.OBJECT,
          properties: {
            obstacles: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING, description: "Name of the obstacle e.g. Electric scooter, open manhole, staircase step" },
                  distance: { type: Type.STRING, description: "Estimated distance in meters or paces e.g. 1.2 meters, 3 steps" },
                  direction: {
                    type: Type.STRING,
                    enum: ["front-left", "directly ahead", "front-right", "below", "above", "left", "right"],
                    description: "Where the obstacle is relative to the path"
                  },
                  severity: {
                    type: Type.STRING,
                    enum: ["low", "medium", "high"],
                    description: "High means immediate collision/tripping hazard within 1 meter; Medium is 1-3 meters away; Low is distant or non-critical."
                  }
                },
                required: ["label", "distance", "direction", "severity"]
              }
            }
          },
          required: ["obstacles"]
        };
        break;

      case "ocr":
        systemInstruction = "You are a highly accurate Optical Character Recognition (OCR) system. You extract text from signs, book pages, labels, or monitors, preserving paragraphs, and optionally translate them.";
        promptText = `Perform OCR on the image. ${translationTarget ? `Additionally, translate the extracted text into ${translationTarget}.` : ""} Return a JSON with: 'text' (the fully reconstructed text), 'language' (detected language), 'translation' (string containing the translation or empty string if not requested), and 'blocks' (array of paragraphs with text and coordinates 'box' [ymin, xmin, ymax, xmax] if detectable).`;
        responseSchema = {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING, description: "Full extracted plain text with proper line breaks" },
            language: { type: Type.STRING, description: "Language detected (e.g. English, Japanese)" },
            translation: { type: Type.STRING, description: "Translated text in the target language if requested, else empty string" },
            blocks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING },
                  box: {
                    type: Type.ARRAY,
                    items: { type: Type.INTEGER },
                    description: "Coordinates [ymin, xmin, ymax, xmax] from 0 to 1000"
                  }
                },
                required: ["text"]
              }
            }
          },
          required: ["text", "language"]
        };
        break;

      case "face_recognize":
        systemInstruction = "You are a personal visual recognition assistant. You compare the face in the current snapshot with reference photos of registered family or friends, and report who they are.";
        promptText = "Compare the face in the first primary snapshot with the reference photos of registered friends/family provided in the prompt. Identify if the face matches anyone. If a face is found but doesn't match any references, mark it as unknown. Return a JSON containing 'recognized' (array of matched faces, with 'name', 'confidence' (0-1), and 'box' [ymin, xmin, ymax, xmax] of the face in the current snapshot), and 'unknownFacesCount' (integer indicating other faces detected that are not registered).";
        
        // Feed in face reference images
        if (faces && Array.isArray(faces) && faces.length > 0) {
          extraParts.push({ text: "--- REGISTERED CONTACTS REFERENCE DATABASE ---" });
          faces.forEach((faceProfile: any) => {
            const faceBase64 = faceProfile.imageUrl.split(",")[1] || faceProfile.imageUrl;
            const faceMime = faceProfile.imageUrl.split(";")[0]?.split(":")[1] || "image/jpeg";
            
            extraParts.push({
              inlineData: {
                mimeType: faceMime,
                data: faceBase64,
              }
            });
            extraParts.push({ text: `This reference photo belongs to: ${faceProfile.name}` });
          });
          extraParts.push({ text: "--- END OF REFERENCE DATABASE. NOW COMPARE THE FIRST SNAPSHOT WITH THESE REFERENCES ---" });
        } else {
          extraParts.push({ text: "Note: There are no registered contacts in the reference database yet. Simply identify faces and count them as unknown." });
        }

        responseSchema = {
          type: Type.OBJECT,
          properties: {
            recognized: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "The registered name of the matched person" },
                  confidence: { type: Type.NUMBER, description: "How close of a match between 0.0 and 1.0" },
                  box: {
                    type: Type.ARRAY,
                    items: { type: Type.INTEGER },
                    description: "Location [ymin, xmin, ymax, xmax] from 0 to 1000 of the face in the current snapshot"
                  }
                },
                required: ["name", "confidence", "box"]
              }
            },
            unknownFacesCount: { type: Type.INTEGER, description: "The count of other visible faces that are not registered contacts" }
          },
          required: ["recognized", "unknownFacesCount"]
        };
        break;

      case "currency":
        systemInstruction = "You are an expert currency identifier for the blind. You identify banknotes (bills) and coins, state their value, and sum them up.";
        promptText = "Identify and count all currency notes and coins visible in the image. Support any official currency (USD, EUR, INR, GBP, etc.). For each, return their denomination (e.g. '10 USD', '500 INR'), confidence, and bounding box 'box' [ymin, xmin, ymax, xmax] from 0 to 1000. Provide the sum of all notes as 'totalValue' and specify the 'currencyCode'. Return JSON.";
        responseSchema = {
          type: Type.OBJECT,
          properties: {
            currencyCode: { type: Type.STRING, description: "The standard code e.g. USD, INR, EUR" },
            notes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  denomination: { type: Type.STRING, description: "Value and currency, e.g. 20 USD, 50 EUR" },
                  confidence: { type: Type.NUMBER },
                  box: {
                    type: Type.ARRAY,
                    items: { type: Type.INTEGER },
                    description: "Coordinates [ymin, xmin, ymax, xmax] from 0 to 1000"
                  }
                },
                required: ["denomination", "confidence", "box"]
              }
            },
            totalValue: { type: Type.NUMBER, description: "The summed numerical value of all identified cash" }
          },
          required: ["currencyCode", "notes", "totalValue"]
        };
        break;

      case "medicine":
        systemInstruction = "You are a highly precise medical packaging scanning helper. Read the brand/generic name, active ingredients, instructions, warning text, and search meticulously for an expiry date. The current year is 2026.";
        promptText = "Scan this medicine box, container, or bottle. Extract the brand name, active ingredients, expiry date (e.g. MM/YYYY or DD/MM/YYYY if visible), evaluate if it is expired based on current year 2026, extract dosage directions, and list critical warnings. Output JSON with fields: 'medicineName', 'activeIngredients', 'expiryDate', 'isExpired' (bool), 'dosageInstruction', and 'warnings'.";
        responseSchema = {
          type: Type.OBJECT,
          properties: {
            medicineName: { type: Type.STRING, description: "The commercial brand or generic name of the medicine" },
            activeIngredients: { type: Type.STRING, description: "Main active pharmaceutical ingredients" },
            expiryDate: { type: Type.STRING, description: "The extracted expiry date, e.g. 11/2027 or Nov 2026" },
            isExpired: { type: Type.BOOLEAN, description: "True if the current date of July 2026 is past the expiry date" },
            dosageInstruction: { type: Type.STRING, description: "How to take it, e.g. 'Take 1 tablet every 8 hours after meals'" },
            warnings: { type: Type.STRING, description: "Crucial warnings or side effects e.g. 'May cause drowsiness. Keep away from children.'" }
          },
          required: ["medicineName"]
        };
        break;

      default:
        res.status(400).json({ error: "Invalid mode provided" });
        return;
    }

    // Combine prompt, image, and any references
    const contentParts = [
      currentFramePart,
      ...extraParts,
      { text: promptText }
    ];

    // Inject critical multilingual target instruction if specified
    const targetLang = appLanguage || translationTarget || "English";
    if (targetLang && targetLang !== "English") {
      systemInstruction += `\n\nCRITICAL MULTILINGUAL MANDATE: The user's preferred spoken and written language is ${targetLang}. You MUST translate all verbal response strings inside the JSON fields (including description paragraphs, lists, tags, obstacle labels, color names, descriptive sentences, names, notes, directions, active ingredients, warnings, and instructions) directly into ${targetLang} (using native ${targetLang} script or readable phonetic transliteration, or both). The JSON structure and keys themselves must remain exactly as defined in the response schema, but the text values inside must be in ${targetLang}.`;
    }

    // Call the Gemini API using gemini-3.5-flash as recommended
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contentParts,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.2, // low temperature for precise factual extraction
      },
    });

    const textResult = response.text;
    if (!textResult) {
      throw new Error("No response generated by the model");
    }

    // Parse the structured JSON response
    const parsedData = JSON.parse(textResult.trim());
    
    // Return unified schema back to the client
    res.json({
      mode,
      timestamp: new Date().toISOString(),
      [mode]: parsedData,
    });

  } catch (error: any) {
    console.error("Analysis Error:", error);
    res.status(500).json({
      error: error.message || "An error occurred during vision analysis. Check your Gemini API Key configuration."
    });
  }
});

// Setup Vite Dev Server / Static Hosting based on environment
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in development mode with Vite HMR middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in production mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AI Smart Vision Server is running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
