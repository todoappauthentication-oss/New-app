import { GoogleGenAI } from "@google/genai";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API_KEY is missing.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const generateSmartTags = async (title: string, xmlSnippet: string): Promise<string[]> => {
  const client = getClient();
  if (!client) return ["#local", "#project"];

  try {
    const prompt = `Generate 3-5 short, relevant hashtags for a motion graphics project titled "${title}". 
      The XML snippet hints at: ${xmlSnippet.substring(0, 100)}...
      Return ONLY the tags separated by spaces (e.g. #shake #glow #3d).`;

    const response = await client.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
          parts: [
            { text: prompt }
          ]
        }
      ],
    });
    
    const text = response.text || "";
    return text.split(' ').filter(t => t.startsWith('#'));
  } catch (error) {
    console.error("Gemini API Error:", error);
    return ["#am", "#xml"];
  }
};