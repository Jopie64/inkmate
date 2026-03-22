# Inkmate: AI-Assisted Story Writing App (SPECS)

Ik wil graag een app (Inkmate) waarmee ik verhalen kan schrijven samen met AI.
De bedoeling is dat hij gehost gaat worden op **Vercel**.

## 1. Tech Stack & Architectuur
* **Framework**: Next.js (App Router) & React
* **Styling**: TailwindCSS
* **AI Integratie**: Vercel AI SDK (voor gestroomlijnde streaming responses en tool-calling)
* **Opslag & "Git Versioning"**: Omdat Vercel serverless is en geen lokaal persistent bestandssysteem heeft, is de beste oplossing voor echte git-versiebeheer het gebruik van de **GitHub API**. Gebruikers loggen in via GitHub OAuth, en Inkmate leest/schrijft de data rechtstreeks naar een private repository op hun GitHub-account. Zo hebben we native file versioning, precies zoals gevraagd.
* **Lokale Status**: Onverzonden chatberichten worden bewaard in de browser (`localStorage` of `IndexedDB`) om dataverlies bij refresh te voorkomen.
* **Lokaal Ontwikkelen**: De app moet lokaal gedraaid kunnen worden via een configuratie (bijv. `.env.local`) met eventueel een test/mock repository, om vrijuit de features te kunnen testen.

## 2. Core Workflow & Features
* **Inloggen**: Aanmelden via GitHub OAuth.
* **Dashboard**: Overzicht met de projecten/verhalen waar als laatst aan gewerkt is.
* **Project View (Tabs)**: In een geopend project zijn er de volgende tabs/secties: 
  * `Description`
  * `Chapters`
  * `Characters` (Inclusief een Personality Editor)
  * `Notes` 
  * `History` (Diff viewer voor versiegeschiedenis)
  * `Chats`
* **Chats (Brainstorming & Generatie)**:
  * In de chat kan de gebruiker ideeën brainstormen en opdrachten geven om delen van het verhaal of actieve personages aan te passen.
  * Verschillende losse chat streams (sessies) zijn naast elkaar mogelijk.
  * Wat in de chatbox geschreven wordt blijft bewaard, ook al is het nog niet verstuurd.
  * **Sessie Forking**: Een sessie kan op een willekeurige plek in de history worden geforkt. Er ontstaan dan 2 sessies (het origineel en de fork). Bij het forken wordt de huidige ingevoerde, onverzonden tekst in de inputbox meegekopieerd.
* **Context Engine (Selectie & Tooling)**:
  * De context van een chatsessie is selecteerbaar. Je kunt de context selection box openklappen en met vinkjes per onderdeel de context selecteren.
  * Bij een nieuwe sessie staat standaard aan:
    - Description
    - Alle chapter summaries
    - Laatste 2 chapters (volledig)
    - Chat history
    - Personages
  * **Dynamic Context Loading**: Als de context-vink in algemene zin aan staat, kan de AI tijdens inference zelf beslissen om specifieke chapters, notes, comments of characters in te laden via tool-calling wanneer er meer detail nodig is.
* **Export & Leesbaarheid**:
  * Optie om het volledige boek te downloaden als PDF.
  * Optie om een specifieke selectie (bijv. h1-h3) te downloaden als PDF.
  * **Text-to-Speech (TTS)**: Optie om de tekst voor te lezen. De afspeelsnelheid is instelbaar. We starten waarschijnlijk met de Web Speech API (gratis/ingebouwd).
  * De app is responsive en **mobile friendly**.
* **Taal & Settings**:
  * **Alle code en documentatie-files zijn in het Engels.**
  * De app interface is meertalig (start in Engels en Nederlands).
  * In de settings kan de gebruiker een eigen Groq of OpenRouter API key invullen en het gewenste AI-model selecteren.

## 3. Hoofdstukken, Versiebeheer & Personalisatie
* **Volgorde & ID's (Directory Structuur)**: Om hoofdstukken soepel te kunnen tussenvoegen of hernoemen zonder dat alle verwijzingen breken, maken we gebruik van UUIDs onder de motorkap. Er is één centraal `index.json` bestand dat de array met de juiste volgorde en de mapping van ID's naar de actuele titel vastlegt. Zo kan "Hoofdstuk 2" later "Hoofdstuk 3" worden in de UI, maar de AI en de backend weten precies over welk stuk tekst (UUID) het gaat.
* **Renderen & Handmatig Editen**:
  * Bij het weergeven van de hoofdstukken wordt de markdown gerenderd. Dit is aan/uit te zetten (een toggle tussen Lees-modus en Edit-modus).
  * Gebruikers kunnen zélf hoofdstukken editen.
* **Versiegeschiedenis & Auto-commits**: 
  * Er is een "Version History" sectie (onder de **History** tab) met een Diff-viewer. Zo kan je per hoofdstuk en bestand de wijzigingen zien.
  * Na elke save (door user óf AI) wordt automatisch een commit gemaakt. Als de AI dit doet, verzint de AI een zinnige commit text.
* **Summaries genereren**: Zodra een gebruiker aangeeft dat een hoofdstuk (voor nu) afgerond is, kan hij de AI triggeren om automatisch de bijbehorende `summary.md` te genereren of updaten.
* **Comments Mechanisme**: 
  * Binnen een hoofdstuk kan je tekst highlighten en voorzien van commentaar. Deze worden per hoofdstuk opgeslagen, bijv. in een `comments.json` of inline.
  * Je kan deze comments vervolgens selecteren en meenemen naar een (bestaande of nieuwe) chatsessie om ze met de AI te bespreken of te laten verwerken.
* **Personality / Character Editor**: 
  * De gebruiker kan personages beheren in een speciale editor.
  * De AI kan personages ook zélf aanpassen direct vanuit een chatsessie (bijv. als er in de chat afgesproken wordt: "Vanaf nu heeft hij een litteken"). Deze characters kunnen geladen worden bij de context selectie.

## 4. Directory Structuur (Backend logica / GitHub Repo structuur)

```text
/
  settings.json
  <project>/
    description.md
    index.json (bevat de array met hoofdstuk-volgorde, mapping UUID -> Titel)
    chats/
      <chat_id>/ (bevat de berichten history)
    chapters/
        <uuid_chapter_1>/
          full.md
          summary.md
          comments.json
        <uuid_chapter_2>/
          ...
    notes/
    characters/
      character_name.md
```
