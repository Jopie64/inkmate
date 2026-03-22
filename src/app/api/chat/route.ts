import { createOpenAI } from '@ai-sdk/openai'
import { streamText } from 'ai'

export const maxDuration = 30

export async function POST(req: Request) {
  const { messages } = await req.json()
  
  // Custom OpenAI compatible endpoint (Supports Groq, OpenRouter, OpenAI)
  const openai = createOpenAI({
    baseURL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
    apiKey: process.env.OPENAI_API_KEY,
  })

  // Allows model overriding via .env, defauls to a robust model.
  const modelName = process.env.AI_MODEL || 'gpt-4o'

  const result = streamText({
    model: openai(modelName),
    messages,
  })

  return result.toTextStreamResponse()
}
