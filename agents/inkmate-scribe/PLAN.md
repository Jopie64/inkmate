# inkmate-scribe: Plan & Intentions

## Current Focus
- **AI Tooling (Context Engine):** Provide the chat functionality (`app/api/chat/route.ts`) with Vercel AI SDK tools, enabling the assistant to autonomously read, update, and create chapters directly governed by user chat input.

## Next Pulse Goals
- Wrap existing backend server actions (`src/app/actions/chapters.ts` / `src/lib/github.ts`) into SDK `tools` via zod schemas.
- Ensure the `page.tsx` chat frontend context checkboxes (like "Description", "Characters") are passed in the request body to dynamically alter the system prompt.

## Open Questions
- How does the AI handle writing massive blocks of text? (Review `max_tokens` limitations).
- Should the AI ask for explicit tool confirmation before overwriting an entire chapter, or can it act freely since version history (Git) provides a safety net?

## Future Intentions
- Implement local `localStorage` in the Chat tab to retain unsent draft messages (see `SPECS.md`).
- Build a Diff Viewer (History tab) for file-specific Git commits (to visually compare human and AI edits).
- Implement PDF Export & TTS (Read Aloud) functionalities for project descriptions and chapters.
