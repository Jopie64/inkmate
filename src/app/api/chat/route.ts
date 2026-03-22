import { createOpenAI } from '@ai-sdk/openai'
import { streamText } from 'ai'

export const maxDuration = 30

export async function POST(req: Request) {
  try {
    const { messages } = await req.json()
    console.log("[Chat API POST] Received messages request. Length:", messages?.length);

    const baseURL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1"
    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey || apiKey.includes("your-api-key") || apiKey === "jouw-api-key-hier") {
      return new Response("Missing API Key. Vul een echte key in `.env.local` in.", { status: 401 })
    }
    
    const openai = createOpenAI({
      baseURL,
      apiKey,
    })

    const modelName = process.env.AI_MODEL || 'gpt-4o'

    // Vercel AI v6 (and strictly typed Providers) requires purely { role, content }
    // En we filteren eventuele lege assistant-responses eruit om API crashes te voorkomen.
    const coreMessages = messages
      .filter((m: any) => m.content && m.content.trim().length > 0)
      .map((m: any) => ({
        role: m.role,
        content: m.content,
      }));

    const result = await streamText({
      model: openai(modelName),
      messages: coreMessages,
    })

    console.log("[Chat API POST] Stream started for coreMessages length:", coreMessages.length);

    return result.toTextStreamResponse({
      headers: {
        'X-Vercel-AI-Data-Stream': 'v1' // Still passed just in case the client requires it
      }
    });
  } catch (err: any) {
    console.error("[Chat API Error]:", err);
    return new Response(err.message || "Unknown server error during AI response.", { status: 500 })
  }
}
