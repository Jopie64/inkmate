# inkmate-scribe: Plan & Intentions

## Current Focus
- Testen en finetunen van de **Chapters & Editor** tab na de eerste Oplevering.
- **Context Engine doorkoppen:** De in de UI ingevulde vinkjes meesturen naar de backend (`api/chat/route.ts`) zodat deze geselecteerde GitHub-bestanden ingeladen kunnen worden als context.

## Next Pulse Goals
- **ToolLoopAgent uitbreiding:** De AI agent in de chat-backend voorzien van GitHub Data Tools (de functies in `lib/github.ts`) zodat de AI specifieke bestanden op aanvraag van de gebruiker (of automatisch o.b.v. de Context Engine vinkjes) kan inlezen tijdens inference.
- Lokale `localStorage` implementeren in de Chat tab om onverzonden draft-berichten te bewaren, volgens de vereisten in `SPECS.md`.

## Open Questions
- Werkt de OAuth + Chapter opslaan GitHub flow met grote MD content volledig naar wens of lopen we tegen Vercel payload/rate limits aan?
- Hoe laten we de UUID mapping in `index.json` en de "Delete Chapter" logica vlekkeloos samenwerken met Octokit in de nabije toekomst?

## Future Intentions
- Chat Sessions forking toevoegen aan de frontend.
- Diff Viewer (History tab) bouwen voor de git-commits per bestand.
- PDF Export & TTS (Read Aloud) implementeren vanuit de project description/chapters.
