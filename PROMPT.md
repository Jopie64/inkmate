# Inkmate: AI-Assisted Story Writing App

Ik wil graag een app (Inkmate) waarmee ik verhalen kan schrijven samen met AI.
De bedoeling is dat hij gehost gaat worden op **Vercel**.

## 1. Tech Stack & Architectuur
* **Framework**: Next.js (App Router) & React
* **Styling**: TailwindCSS
* **AI Integratie**: Vercel AI SDK (voor gestroomlijnde streaming responses en tool-calling)
* **Opslag & "Git Versioning"**: Omdat Vercel serverless is en geen lokaal persistent bestandssysteem heeft, is de beste oplossing voor echte git-versiebeheer het gebruik van de **GitHub API**. Gebruikers loggen in via GitHub OAuth, en Inkmate leest/schrijft de data rechtstreeks naar een private repository op hun GitHub-account. Zo hebben we native file versioning, precies zoals gevraagd.
* **Lokale Status**: Onverzonden chatberichten worden bewaard in de browser (`localStorage` of `IndexedDB`) om dataverlies bij refresh te voorkomen.

## 2. Core Workflow & Features
* **Inloggen**: Aanmelden via OAuth (voorkeur GitHub t.b.v. repository opslag, Google als alternatief als we naar een DB-backend gaan).
* **Dashboard**: Overzicht met de projecten/verhalen waar als laatst aan gewerkt is.
* **Project View**: In een geopend project zijn er de volgende tabs/secties: 
  * `Description`
  * `Chapters`
  * `Characters` 
  * `Notes` 
  * `Chats`
* **Chats (Brainstorming & Generatie)**:
  * In de chat kan de gebruiker ideeën brainstormen en opdrachten geven om delen van het verhaal aan te passen of hoofdstukken toe te voegen.
  * Verschillende losse chat streams (sessies) zijn naast elkaar mogelijk.
  * Wat in de chatbox geschreven wordt blijft bewaard, ook al is het nog niet verstuurd.
  * **Sessie Forking**: Een sessie kan op een willekeurige plek in de history worden geforkt. Er ontstaan dan 2 sessies (het origineel en de fork). Bij het forken wordt de huidige ingevoerde, onverzonden tekst in de inputbox meegekopieerd.
* **Context Engine (Selectie & Tooling)**:
  * De context van een chatsessie is selecteerbaar. Je kunt dit openklappen met vinkjes per onderdeel.
  * Bij een nieuwe sessie staat standaard aan:
    - Description
    - Alle chapter summaries
    - Laatste 2 chapters (volledig)
    - Chat history
  * Als de context-vink in algemene zin aan staat, kan de AI tijdens de inference zelf via tool-calling beslissen om specifieke chapters in the laden wanneer meer detail nodig is.
* **Export & Leesbaarheid**:
  * Optie om het volledige boek te downloaden als PDF.
  * Optie om een specifieke selectie (bijv. h1-h3) te downloaden als PDF.
  * **Text-to-Speech (TTS)**: Optie om de tekst voor te lezen. De afspeelsnelheid is instelbaar. We starten waarschijnlijk met de Web Speech API (gratis/ingebouwd).
  * De app is responsive en **mobile friendly**.
* **Taal & Settings**:
  * **Alle code en documentatie-files zijn in het Engels.**
  * De app interface is meertalig (start in Engels en Nederlands).
  * In de settings kan de gebruiker een eigen Groq of OpenRouter API key invullen en het gewenste AI-model selecteren.

## 3. Directory Structuur (Backend logica / GitHub Repo structuur)

```text
/
  settings.json
  <project>/
    description.md
    chats/
      <chat_id>/ (bevat de berichten history)
    chapters/
        h1/
          full.md
          summary.md
          notes.md
    notes/
    characters/
```
