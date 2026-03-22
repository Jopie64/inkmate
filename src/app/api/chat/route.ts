import { createOpenAI } from '@ai-sdk/openai'
import { streamText } from 'ai'

export const maxDuration = 30

export async function POST(req: Request) {
  try {
    const { messages } = await req.json()
    
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

    const result = streamText({
      model: openai(modelName),
      messages,
    })

    // Fallback voor verschillende Vercel AI SDK versies (v3.1 tot v4+)
    const responseMethod = (result as any).toDataStreamResponse || (result as any).toAIStreamResponse;
    if (responseMethod) {
      return responseMethod.call(result);
    }
    
    // Mocht het nog ouder zijn, of specifiek textueel:
    // @ts-ignore
    return result.toTextStreamResponse()
  } catch (err: any) {
    return new Response(err.message || "Unknown server error during AI response.", { status: 500 })
  }
}
