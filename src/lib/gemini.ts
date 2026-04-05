import { GoogleGenAI, Type } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || "";
const ai = new GoogleGenAI({ apiKey });

export async function generateNoteTitle(content: string): Promise<string> {
  if (!content.trim()) return "Untitled Note";
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate a short, catchy title (max 5 words) for the following note content: "${content.substring(0, 500)}"`,
      config: {
        systemInstruction: "You are a helpful assistant that generates concise note titles.",
        temperature: 0.7,
      },
    });
    return response.text?.trim() || "Untitled Note";
  } catch (error) {
    console.error("Error generating title:", error);
    return "Untitled Note";
  }
}

export async function summarizeNote(content: string): Promise<string> {
  if (!content.trim()) return "";
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Summarize the following note content in 2-3 sentences: "${content}"`,
      config: {
        systemInstruction: "You are a helpful assistant that summarizes notes concisely.",
        temperature: 0.5,
      },
    });
    return response.text?.trim() || "No summary available.";
  } catch (error) {
    console.error("Error summarizing note:", error);
    return "Error generating summary.";
  }
}

export async function correctGrammar(content: string): Promise<string> {
  if (!content.trim()) return content;
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Correct the grammar and improve the flow of the following text, but keep the original meaning: "${content}"`,
      config: {
        systemInstruction: "You are a professional editor. Provide only the corrected text.",
        temperature: 0.3,
      },
    });
    return response.text?.trim() || content;
  } catch (error) {
    console.error("Error correcting grammar:", error);
    return content;
  }
}
