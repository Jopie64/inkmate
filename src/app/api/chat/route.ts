import { createOpenAI } from '@ai-sdk/openai'
import { createAgentUIStreamResponse, ToolLoopAgent } from 'ai'

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
    // We filter out any empty assistant responses to prevent API crashes.
    const uiMessages = messages
      .map((m: any) => ({
        id: m.id || crypto.randomUUID(),
        role: m.role,
        parts: m.parts || (m.content ? [{ type: 'text', text: m.content }] : []),
      }));

    const chatAgent = new ToolLoopAgent({
      model: openai(modelName),
    })

    console.log("[Chat API POST] Agent Stream started for uiMessages length:", uiMessages.length);

    return createAgentUIStreamResponse({
      agent: chatAgent,
      uiMessages: uiMessages,
    });
  } catch (err: any) {
    console.error("[Chat API Error]:", err);
    return new Response(err.message || "Unknown server error during AI response.", { status: 500 })
  }
}
