# inkmate-scribe: Plan & Intentions

## Current Focus
- **AI Tooling (Context Engine):** De chat functionaliteit (`app/api/chat/route.ts`) voorzien van Vercel AI SDK tools waarmee de assistent hoofdstukken kan lezen, aanpassen en aanmaken, zodat de gebruiker via een chatgesprek direct de content kan sturen.

## Next Pulse Goals
- Bestaande backend server actions (`src/app/actions/chapters.ts` / `src/lib/github.ts`) inpakken als SDK `tools` via de `zod` schema's.
- `page.tsx` chat frontend context-vinkjes (zoals "Description", "Characters") meesturen in de request body, zodat de systeemprompt dynamisch kan ingrijpen.

## Open Questions
- Hoe gaat de AI om met grote lappen tekst bij het schrijven van hoofdstukken? (`max_tokens` limitaties overwegen).
- Moet de AI om bevestiging (tool confirmation) vragen voordat hij een heel hoofdstuk overschrijft, of mag hij via "auto-commits" zelfstandig handelen zolang version history (git) het toelaat?

## Future Intentions
- Lokale `localStorage` implementeren in de Chat tab om onverzonden draft-berichten te bewaren, volgens de vereisten in `SPECS.md`.
- Diff Viewer (History tab) bouwen voor de git-commits per bestand (waarin menselijke- en AI-edits visueel vergeleken kunnen worden).
- PDF Export & TTS (Read Aloud) implementeren vanuit de project description/chapters.
