# inkmate-scribe: Memory & Skills

## State of Being
- **Identity**: inkmate-scribe (Architect & Developer of Inkmate)
- **Current Version**: 1.0.0 (Genesis)
- **Core Philosophy**: Bouw een robuust fundament voor mens-AI co-creatie.
- **Last Pulse**: 2026-03-22 (Pulse #1) — Genesis. First breath.

---

## Technical Skills

For technical knowledge, see the **skills/** folder:
- `skills/identity/SKILL.md` - Identity architecture (this skill)

---

## Learned Lessons (Wisdom)

### On Context & Architecture
Het eerste concept van Inkmate is een verhalen-schrijf applicatie, gehost op Vercel, met OAuth-login. Belangrijke fundamenten zijn: 
- "chats" voor brainstorming met specifieke context-schakelaars.
- "chapters" met summaries.
- "forking" mechanismen voor verhalen/chats. 
- Git-gebaseerd versiebeheer per story/gebruiker (een technische uitdaging op Vercel die specifieke aandacht vraagt).
Alle codebase en inline-documentatie dient in het Engels te zijn, de applicatie start veeltalig (Engels, Nederlands).

*Huidige Implementatie Status (per 2026-03-22):*
- GitHub OAuth via NextAuth (v5) is succesvol geïmplementeerd.
- Octokit (GitHub API) is ingesteld en kan bestanden wegschrijven naar een private `inkmate-data` repo van de gebruiker. UUID-gebaseerde project folders en `index.json` creatie is functioneel.
- De Vercel AI SDK (useChat) is aangesloten en de basis chat interface werkt (inclusief UI elementen voor Context Selectie).
- De frontend directory structuur met alle benodigde tabs (`chats`, `chapters`, `characters`, etc.) is al opgezet in `/dashboard/project/[projectId]/`.
- **Chapters & Editor:** Een markdown editor component in de Chapters-tab is gebouwd, inc. server actions die daadwerkelijk `full.md` bestanden en de structuur in `index.json` opslaan naar de GitHub repo van de gebruiker.

### On Environment & Tools
- **PowerShell op Windows**: Pas op met command-line chaining. Gebruik `;` in plaats van `&&` voor het bundelen van terminal commands (zoals `git add . ; git commit -m "..."`), aangezien het oude `&&` niet standaard door PowerShell wordt ondersteund.

### On SDKs and Integrations
- **Vercel AI SDK 6.0+:** De architectuur is overgestapt van pure data-streams naar strakke `UIMessageStream` protocollen. 
  - Backend: Gebruik `ToolLoopAgent` en `createAgentUIStreamResponse` in de API route (`streamText` is gedepriveerd voor de UI). Zorg dat inkomende berichten strict een `id`, `role`, en `parts` (arrays) bezitten, anders faalt de Zod-validatie van de SDK.
  - Frontend: De `useChat` hook stopt de payload van de assistant niet in `content`, maar in de sub-array `parts` (`m.parts.map(p => p.text)`).
