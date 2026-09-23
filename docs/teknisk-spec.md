# Teknisk spec — RTF Manuell Komplettering Frontend (RTFKF)

## Översikt

Enskild inbäddad vy (Vue 3 + TypeScript, Pinia), exponerad som en module federation-komponent
till handläggarportalen. Ingen egen routing. All data hämtas via `fetch` mot en dedikerad BFF,
ingen websocket/polling.

## Komponentstruktur

```text
src/
├── App.vue                          # Rotkomponent, tar emot handlaggningId som prop
├── index.ts                         # init() för värdapplikationen
├── main.ts                          # Fristående utvecklingsläge
├── components/
│   └── RtfKomplettering.vue         # Formulär: personnummer och avsikt
├── config/env.ts                    # Bygg- och körtidskonfiguration
├── stores/KompletteringStore.ts     # Pinia: fel-, ladd- och sparstatus
├── types.ts                         # Domänmodell speglad från regeltjänstens OpenAPI
└── utils/
    ├── bffClient.ts                 # Bas-url, körtidskonfiguration och JSON-kontrakt
    ├── slutforKomplettering.ts      # Sekvensen spara → slutför
    └── …                            # Ett anrop per fil i övrigt
```

Formulärets fältvärden ägs av komponenten, inte av storen: det är komponenten som redigerar
dem. Storen bär bara det som anropshjälparna och vyn delar — ladd-, spar- och felstatus.

## Module federation

| Egenskap | Värde |
|---|---|
| Scope (`name`) | `remoteKompletteringApp` |
| Exponerad modul | `./RtfKomplettering` |
| Manifest | `mf-manifest.json` |
| Delade singletons | `vue`, `@fkui/vue`, `@fkui/logic`, `pinia` |

Scopet måste vara unikt bland portalens remotes — `rimfrost-regel-rtf-manuell-fe` använder
`remoteApp`, och två remotes med samma scope skriver över varandra i portalens container.

### Validering och delat `@fkui/logic`

FKUI:s validerare ligger i ett register på `ValidationService`, en modulglobal i `@fkui/logic`
som fylls när en app kör `app.use(ValidationPlugin)`. Remoten exponerar bara komponenten och
aldrig någon app, så installationen sker i portalen — mot portalens egen kopia av
`@fkui/logic`. Får remoten en andra kopia läser fälten ett tomt register, varje fält kastar
`Validator 'x' does not exist or is not registered` när det monteras, och `Klarmarkera` gör
till synes ingenting alls eftersom formuläret aldrig blir validerbart.

Därför delas `@fkui/logic` som singleton, precis som `@fkui/vue`. Som bälte till de hängslena
registrerar `src/config/validation.ts` dessutom `availableValidators` när komponenten sätts
upp, så remoten fungerar även mot en värd som inte delar `@fkui/logic`.

`v-validation`-direktivet kommer fortfarande från värdens `ValidationPlugin`-installation —
`ValidationDirective` exporteras inte publikt och kan inte registreras lokalt.

Med registret på plats stoppar `FValidationForm` inskickning av ett ofullständigt formulär och
visar både en sammanfattning ("Du har glömt fylla i något") och meddelanden per fält. Fältet
validerar personnumret med FKUI:s `personnummerLuhn`, och `valideraForKlarmarkering` gör om
samma kontroll med `parsePersonnummerLuhn` innan något når BFF:n, så knappen och fältet
underkänner samma nummer.

## API-specifikationer

Ingen dedikerad OpenAPI-specifikation för BFF-kontraktet. BFF:ns typer kommer i sin tur från
`rimfrost-regel-rtf-manuell-komplettering-openapi` (`RtfKompletteringData`) och
`rimfrost-framework-regel-oul-openapi` (`GetUtokadUppgiftsbeskrivningResponse`); `types.ts`
speglar dem.

| Metod | Sökväg | Beskrivning |
|---|---|---|
| GET | `/api/{handlaggningId}/komplettering` | Hämta registrerade uppgifter |
| PATCH | `/api/{handlaggningId}/komplettering` | Registrera personnummer och avsikt |
| POST | `/api/{handlaggningId}/komplettering/done` | Slutför uppgiften, avslutar OUL-uppgiften |
| GET | `/api/uppgiftsbeskrivning/{uppgiftstyp}` | Hämta hjälptext |

### Spara och slutför som två anrop

`Spara` gör enbart `PATCH`. `Klarmarkera` gör `PATCH` följt av `POST .../done`, och avbryter om
sparandet misslyckas — annars skulle slutförandet avse annat än det handläggaren ser i
formuläret. Att hålla anropen isär är vad som gör det möjligt att spara halvfärdigt arbete.

Sekvensen ligger i `slutforKomplettering.ts` och inte i komponenten, eftersom den är ett krav
(RTFKF-FR-03.2/03.3) snarare än vylogik — och därmed testbar utan monterad komponent. Har
formuläret redan sparats hoppas `PATCH` över, så den vanliga vägen Spara → Klarmarkera inte
skriver samma data två gånger.

### Tomma fält skickas som tom sträng

Den genererade `RtfKompletteringData` bär `@NotNull` på båda fälten, så `null` avvisas av BFF:n
med 400. Ett tomt fält skickas därför som `""`. Regeltjänsten räknar ändå ett blankt värde som
saknat, vilket är precis det som gör ett delvis ifyllt sparande möjligt: `PATCH` svarar 204
medan `done` svarar 422 tills båda fälten har innehåll.

### Ofullständiga uppgifter rapporteras i två lager

`FValidationForm` sväljer inskickningen när valideringen misslyckas, så ingenting som hänger på
`@submit` kan garantera ett besked. Och om värdens validerare hamnat i en annan
`@fkui/logic`-instans ritar FKUI inget eget meddelande heller. Tillsammans ger det en
`Klarmarkera` som synbart inte gör någonting.

Därför rapporteras tomma fält från två håll, och exakt ett av dem svarar i varje läge:

| Läge | Vad som stoppar | Vad som visar meddelandet |
|---|---|---|
| Värdens `ValidationPlugin` fungerar | FKUI blockerar inskickningen | Knappens egen `@click`-hanterare |
| Validerarna saknas i remotens instans | Ingenting — inskickningen går igenom | Kontrollen i `slutforKomplettering` |

Båda använder samma text som regeltjänstens 422, hämtad från `src/meddelanden.ts`, så en
handläggare inte kan se vilket lager som svarade. Ofullständiga uppgifter når aldrig BFF:n.

### Meddelanden på skärmen

`Spara` lyckas och `Klarmarkera` misslyckas är ett normalt förlopp, och då är både "sparade"
och felet sanna samtidigt. Visade tillsammans läser de som en motsägelse, så
sparbekräftelsen viker för felet — felet är dessutom det som behöver åtgärdas. Av samma skäl
säger 422-meddelandet ingenting om att spara: det kan nås direkt efter ett lyckat sparande.

### Statuskoder från slutförandet

BFF:n vidarebefordrar regeltjänstens statuskod oförändrad, och 409 och 422 är meningsfulla
utfall snarare än rena fel. De översätts därför till egna meddelanden:

| Status | Utfall | Meddelande till handläggaren |
|---|---|---|
| 204 | `KLAR` | Kompletteringen är registrerad och uppgiften klarmarkerad |
| 422 | `OFULLSTANDIG` | Uppgifterna är ofullständiga |
| 409 | `UTGANGEN` | Tiden för komplettering har gått ut |
| Övrigt | `FEL` | Generellt felmeddelande, uppgiften förblir öppen |

### Personnummerformat

`FPersonnummerTextField` visar personnumret tiosiffrigt (`ååmmdd-nnnn`) men binder det
tolvsiffriga värdet (`ååååmmdd-nnnn`), vilket är det som skickas till BFF:n. Ett tiosiffrigt
inmatat personnummer får sitt sekel härlett relativt dagens datum.

### Besked till värdapplikationen

Vid lyckat slutförande skickas ett `task-done`-event på `window` med `handlaggningId` i
`detail`, så att portalen kan ta bort uppgiften ur listan.

### CSS och module federation

`cssCodeSplit` är påslaget. Med en enda sammanslagen stylesheet hamnar det fristående
utvecklingslägets `@fkui/design`-reset och `main.scss` typsnittsimport bland remotens
*synkrona* assets, och skriver då om typografi och `box-sizing` på den värdsida som laddar
remoten. Uppdelat levererar remoten bara sina egna scopade regler (~0,2 kB) medan
`@fkui/design` stannar på `index.html`-ingången. Värdapplikationen förutsätts tillhandahålla
`@fkui/design` själv, vilket den gör redan genom att dela `@fkui/vue` som singleton.

## Kafka-integration

Ingen. Mikrofrontenden har ingen meddelandeintegration.

## Konfiguration

| Egenskap | Beskrivning | Standardvärde |
|---|---|---|
| `VITE_BFF_URL` | BFF-url vid lokal utveckling. Tom sträng ger relativa `/api`-anrop via Vites dev-proxy | tom |
| `RUNTIME_BFF_URL` (`window.__RTF_MANUELL_KOMPLETTERING_FE_ENV__`) | BFF-url vid körning i container; går före byggtidsvärdet | — |
| `VITE_DEV_HANDLAGGNING_ID` | Fallback-id vid fristående utvecklingsläge | — |

Globalen är namnrymdad per app. Som module federation-remote delar mikrofrontenden `window`
med värdapplikationen, så en gemensam `window._env_` skulle låta apparnas konfiguration skriva
över varandras.

`ensureEnvLoaded()` laddar `runtime-config.js` från appens egen origin, härledd ur
`import.meta.url`. Som remote laddas aldrig appens egen `index.html`, så `<script>`-taggen där
körs inte och globalen skulle annars aldrig sättas.

## Testning

Vitest med happy-dom. Enhetstester för varje anrop och för storen, samt komponenttester som
monterar `RtfKomplettering` med `@vue/test-utils`. Inga e2e-tester.

`src/test-setup.ts` sätter körtidsglobalen så att `ensureEnvLoaded()` kortsluter i stället för
att injicera en `<script>`-tagg, vilken happy-dom vägrar ladda.

## Liveness

Ingen egen hälsokontroll — statisk frontend, hälsa avgörs av webbservern som serverar den.

## Kända begränsningar och framtida arbete

| Begränsning | Föreslagen åtgärd |
|---|---|
| `/utokadUppgiftsbeskrivning` exponeras ännu inte av `RegelKompletteringController`, så hjälptexten faller tillbaka på "Ingen beskrivning tillgänglig" mot dagens backend | Åtgärdas i kompletteringsramverket, se BFF:ns kända begränsningar |
| `{uppgiftstyp}` i beskrivningsändpunkten används inte av bakomliggande tjänst | Klargör om typspecifika beskrivningar behövs |
| Remoten exponerar bara `.vue`-komponenten, så värdapplikationen måste installera `ValidationPlugin` (för `v-validation`-direktivet) och tillhandahålla Pinia. Validerarregistret hanteras numera av remoten själv, men direktivet gör det inte | Verifiera mot portalen; exponera annars `init()` vid sidan av komponenten |
| `ensureEnvLoaded()` härleder `runtime-config.js` ur `new URL(import.meta.url).origin`, vilket tappar en eventuell underkatalog i deployen och då hämtar värdens fil i stället. Ärvt från mallen | Härled sökvägen relativt modulen i stället för bara origin, i mallen och samtliga mikrofrontends |
| Ett redan registrerat personnummer normaliseras till `ååååmmdd-nnnn` när formuläret sparas, även om det låg lagrat i annat format | Bedöm om regeltjänsten bör normalisera vid mottagandet i stället |
| Avsikt är ett fritextfält utan validering mot kända avsiktsvärden | Klargör om avsikt ska väljas ur en lista |
| `Authorization` skickas inte vidare från mikrofrontenden, trots att BFF:n vidarebefordrar headern | Koppla in portalens token när dess mekanism är fastställd |
| FKUI:s valideringsregister är modulglobalt och ackumulerar fält mellan monteringar, så fältnivåvalidering blir opålitlig efter många monteringar i samma testfil. Testerna täcker därför att ett tomt formulär stoppas, men inte varje enskild fältregel. `@fkui/logic` 6.58 exponerar ingen återställningsmetod för registret | Bedöm om e2e-test behövs för att täcka fältreglerna |
| Frontenden förutsätter att blankt värde betyder "ännu inte registrerat". BFF:ns teknisk-spec föreslår tvärtom `minLength: 1` i `rimfrost-regel-rtf-manuell-komplettering-openapi`, vilket skulle göra att `PATCH` svarar 400 på ett halvifyllt formulär och tyst bryta RTFKF-FR-02.2 | Bestäm saken i specen — gör blankt till den uttryckliga representationen av "inte registrerat", eller inför ett separat utkastläge i frontenden |
| Mellan `PATCH` och `POST .../done` finns ett fönster där uppgifterna är sparade men uppgiften inte slutförd. Handläggaren får ett felmeddelande och uppgiften förblir öppen, men tillståndet är delvis tillämpat | Bedöm om ramverket bör erbjuda ett kombinerat anrop; hör hemma i `rimfrost-framework-regel-komplettering` |
