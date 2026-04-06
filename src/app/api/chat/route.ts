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

        // 2. Apply lookup and STRICT fix parts
        const fixedPrompt = params.prompt.map(msg => {
          const role = msg.role;
          let content = msg.content;

          if (Array.isArray(content)) {
            const parts = (content as any[]).map(part => {
              // A. Convert reasoning to text (Groq Harmony Fix)
              if (part.type === 'reasoning') {
                return { type: 'text', text: part.text };
              }

              // B. Clean Text Parts
              if (part.type === 'text') {
                return { type: 'text', text: part.text };
              }

              // C. Clean & Fix Tool Calls
              if (part.type === 'tool-call') {
                return {
                  type: 'tool-call',
                  toolCallId: part.toolCallId,
                  toolName: part.toolName || toolNameLookup.get(part.toolCallId) || 'unknown',
                  input: part.input,
                };
              }

              // D. Clean & Fix Tool Results
              if (part.type === 'tool-result') {
                return {
                  type: 'tool-result',
                  toolCallId: part.toolCallId,
                  toolName: part.toolName || toolNameLookup.get(part.toolCallId) || 'unknown',
                  output: part.output,
                };
              }

              return part;
            });

            // E. Merge consecutive text parts
            const mergedParts: any[] = [];
            parts.forEach(p => {
              const last = mergedParts[mergedParts.length - 1];
              if (p.type === 'text' && last?.type === 'text') {
                last.text += '\n' + p.text;
              } else {
                mergedParts.push(p);
              }
            });
            content = mergedParts;
          }

          // Return strictly cleaned message object
          return { role, content };
        }) as any;

        const finalParams = { ...params, prompt: fixedPrompt };
        
        // Log final payload for debugging
        console.log(`[Middleware] Final Prompt: ${finalParams.prompt.length} messages. Lookup size: ${toolNameLookup.size}`);
        console.log("[Middleware] Final Prompt Structure (Sample roles & parts):", 
          JSON.stringify(finalParams.prompt.map((m: any) => ({ 
            role: m.role, 
            parts: Array.isArray(m.content) ? m.content.map((p: any) => p.type) : 'string' 
          })), null, 2)
        );

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
