import { createOpenAI } from '@ai-sdk/openai'
import { streamText, convertToModelMessages, stepCountIs, tool } from 'ai'
import { createProjectTools } from '@/lib/agents/tools'
import { auth } from '@/auth'
import { getOctokit, getFileContent } from '@/lib/github'

export const maxDuration = 30

export async function POST(req: Request) {
  try {
    const { messages, projectId, contextConfig } = await req.json()
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
    
    const session = await auth();
    let dynamicSystemPrompt = "Je bent inkmate-scribe, een behulpzame AI co-writer. Je helpt de gebruiker met het schrijven van hun verhaal.";
    
    if (session?.user?.name && session.accessToken && projectId) {
      dynamicSystemPrompt += `\n\nProject ID: ${projectId}`;
      const octokit = await getOctokit(session.accessToken as string);
      
      // Dynamic Context Engine Injection
      if (contextConfig?.chapterSummaries) {
        try {
          const indexStr = await getFileContent(octokit, session.user.name, `${projectId}/index.json`);
          if (indexStr) {
            const index = JSON.parse(indexStr);
            dynamicSystemPrompt += `\n\nBekende hoofdstukken:\n${JSON.stringify(index.chapters || [], null, 2)}`;
          }
        } catch (e) { console.error("Could not load summaries context"); }
      }
    }
    
    dynamicSystemPrompt += `\n\nJe hebt beschikking over tools. Gebruik 'listChapters' om hoofdstukken te vinden, 'readChapter' om hun volledige inhoud te lezen, en 'saveChapter' om ze aan te passen of te creëren (let op, stuur altijd de VOLLEDIGE markdown content terug bij saveChapter, anders wordt het hoofdstuk deels gewist!).`;

    const uiMessages = messages
      .map((m: any) => ({
        id: m.id || crypto.randomUUID(),
        role: m.role,
        parts: (m.parts || (m.content ? [{ type: 'text', text: m.content }] : [])).map((part: any) => {
           return part;
        }),
      }));

    console.log("[Chat API POST] Final uiMessages Sample (last message parts):", JSON.stringify(uiMessages[uiMessages.length - 1]?.parts, null, 2));

    console.log("[Chat API POST] CoreMessages Length:", uiMessages.length);

    const result = streamText({
      model: openai(modelName),
      system: dynamicSystemPrompt,
      messages: await convertToModelMessages(uiMessages),
      tools: createProjectTools(projectId),
      stopWhen: stepCountIs(5),
      onStepFinish: (step) => {
        console.log(`[Chat Step]: Finish: ${step.finishReason}`);
        if (step.toolCalls?.length) {
          console.log(`[Chat Step] Tool Calls: ${step.toolCalls.map(tc => tc.toolName).join(", ")}`);
        }
      }
    })

    return result.toUIMessageStreamResponse();
  } catch (err: any) {
    console.error("[Chat API Error]:", err);
    return new Response(err.message || "Unknown server error during AI response.", { status: 500 })
  }
}
