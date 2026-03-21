Hoi

Ik wil graag een app waarmee ik verhalen kan schrijven samen met AI.

De bedoeling is dat hij gehost gaat worden op vercel.

Ik wil graag de volgende workflow hanteren:

* Ik meld me aan via oauth, b.v. google
* Ik zie de losse projecten/verhalen waar ik als laatst aan bezig ben geweest.
* Als ik open, zie ik tabs of secties: description, chapters, chats
* In chat kan de user ideeen brainstormen
* Er zijn verschillende losse chat streams
* Context van de chat sessie is selecteerbaar. Bij nieuwe sessie is dat by default:
  - description
  - alle chapter summaries
  - laatste 2 chapters
  - history
* Je kunt context openklappen. Je ziet dan vinkjes bij wat in de context zit van die chat sessie
* Wat in de chatbox geschreven wordt blijft bewaard, ookal is het nog niet gesubmit.
* Je kunt een sessie forken op een willekeurige plek in de history. Er ontstaan dan 2 sessies: het orgineel en de fork.
* Bij een fork wordt de huidig ingevoerde chat meegekopieerd (die is dan bij beide chats hetzelfde, totdat in 1 van de 2 wordt getypt)
* Alle files worden geversioned in git. (Is dat mogelijk bij vercel?)
* Met chats kan je opdrachten geven om delen van het verhaal aan te passen of om nieuwe hoofdstukken toe te voegen.
* Wanneer een bepaald vinkje aanstaat bij de context selectie (default aan)kan de ai tijdens inference kiezen om een bepaalde chapter in te laden
* Alle code en documentatie files in het engels
* De app is multilingual, in eerste instantie in het engels en nederlands
* Er is een optie om het boek te downloaden als pdf
* Er is een optie om een deel van het boek te downloaden als pdf (h1-h3, h4-h6, etc)
* Er is een optie om dingen voor te lezen (text to speech). De speed is instelbaar.
* De app is mobile friendly

* In de settings kan de user de groq of openrouter api key invullen en het model kiezen


Directory structuur is als volgt:

<oauth-provider+userid>/
  settings.json
  <project>/
    description.md
    chats/
    chapters/
        h1/
          full.md
          summary.md
          notes.md
    notes/
    characters/

   
