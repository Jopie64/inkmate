import { createOpenAI } from '@ai-sdk/openai'
import { streamText, convertToModelMessages, stepCountIs, wrapLanguageModel, LanguageModelMiddleware } from 'ai'
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

    // Custom middleware to fix "Tools should have a name!" error on Groq
    const groqMiddleware: LanguageModelMiddleware = {
      specificationVersion: 'v3',
      transformParams: async ({ params }) => {
        const toolNameLookup = new Map<string, string>();
        
        // 1. Build lookup table from any part that HAS a toolName
        params.prompt.forEach(msg => {
          if (Array.isArray(msg.content)) {
            msg.content.forEach(part => {
              if ((part.type === 'tool-call' || part.type === 'tool-result') && part.toolName) {
                toolNameLookup.set(part.toolCallId, part.toolName);
              }
            });
          }
        });

        // 2. Apply lookup and fix parts
        const fixedPrompt = params.prompt.map(msg => {
          // A. Normalize assistant and user messages (Merge text parts, simplify to string)
          if ((msg.role === 'assistant' || msg.role === 'user') && Array.isArray(msg.content)) {
            const parts = (msg.content as any[]).map(part => {
              if (part.type === 'reasoning') return { type: 'text', text: part.text };
              return part;
            });

            const mergedParts: any[] = [];
            parts.forEach(part => {
              const last = mergedParts[mergedParts.length - 1];
              if (part.type === 'text' && last?.type === 'text') {
                last.text += '\n' + part.text;
              } else {
                // Apply toolName fix for tool-calls while mapping
                if (part.type === 'tool-call' && !part.toolName) {
                  part.toolName = toolNameLookup.get(part.toolCallId) || 'unknown';
                }
                mergedParts.push(part);
              }
            });

            // fused mergedParts array (don't simplify to string to avoid SDK TypeErrors)
            return { ...msg, content: mergedParts };
          }

          // B. Fix tool-result messages
          if (msg.role === 'tool' && Array.isArray(msg.content)) {
            return {
              ...msg,
              content: msg.content.map(part => {
                if (part.type === 'tool-result' && !part.toolName) {
                  const inferredName = toolNameLookup.get(part.toolCallId) || 'unknown';
                  return { ...part, toolName: inferredName };
                }
                return part;
              })
            };
          }
          return msg;
        }) as any;

        const finalParams = { ...params, prompt: fixedPrompt };
        
        // LOG FULL PARAMS AS REQUESTED
        console.log(`[Middleware] Final Params (Pre-v3-send): ${JSON.stringify(finalParams, null, 2)}`);

        return finalParams;
      }
    };

    const model = wrapLanguageModel({
      model: openai(modelName),
      middleware: groqMiddleware,
    });

    console.log("[Chat API POST] Final uiMessages Sample (last message parts):", JSON.stringify(uiMessages[uiMessages.length - 1]?.parts, null, 2));

    console.log("[Chat API POST] CoreMessages Length:", uiMessages.length);

    const result = streamText({
      model,
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
