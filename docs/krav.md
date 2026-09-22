# Krav — RTF Manuell Komplettering Frontend (RTFKF)

## Bakgrund och syfte

RTF Manuell Komplettering Frontend är en mikrofrontend som implementerar handläggarens
formulär för att komplettera ett ofullständigt yrkande inför en manuell RTF-kontroll. När ett
yrkande saknar personnummer eller avsikt kan den manuella kontrollen inte utföras, och en
kompletteringsuppgift läggs på handläggaren. Mikrofrontenden finns för att handläggaren ska
kunna registrera de saknade uppgifterna och slutföra uppgiften direkt i handläggarportalen,
utan att lämna den.

---

## Intressenter och aktörer

| Aktör | Roll |
|---|---|
| Handläggare | Enda användarrollen; registrerar de kompletterande uppgifterna |
| Handläggarportalen (värdapplikation) | Laddar in denna mikrofrontend och förmedlar uppgiftens identifierare |
| RTF Manuell Komplettering BFF | Enda bakomliggande tjänst denna mikrofrontend anropar |

---

## Funktionella krav

### RTFKF-FR-01 — Visa kompletteringsunderlag

- **RTFKF-FR-01.1** Vid öppning av uppgiften ska gränssnittet hämta och visa de uppgifter som
  redan är registrerade på yrkandet för den angivna handläggningen.
- **RTFKF-FR-01.2** Saknade värden ska visas som tomma fält och inte som ett fel, eftersom
  avsaknaden av värde är själva anledningen till att uppgiften finns.
- **RTFKF-FR-01.3** Om underlaget inte kan hämtas ska ett tydligt felmeddelande visas istället
  för formuläret.
- **RTFKF-FR-01.4** Handläggaren ska kunna öppna en hjälptext som beskriver uppgiftstypen.
- **RTFKF-FR-01.5** Om ingen handläggning anges ska gränssnittet visa ett felmeddelande och
  inte något formulär.

### RTFKF-FR-02 — Registrera kompletterande uppgifter

- **RTFKF-FR-02.1** Handläggaren ska kunna registrera personnummer och avsikt.
- **RTFKF-FR-02.2** Handläggaren ska kunna spara delvis ifyllda uppgifter utan att samtidigt
  slutföra uppgiften, så att arbetet kan återupptas vid ett senare tillfälle.
- **RTFKF-FR-02.3** Sparade uppgifter ska bekräftas i gränssnittet, och bekräftelsen ska
  upphöra så snart något fält ändras igen.
- **RTFKF-FR-02.4** Personnummer ska registreras i det format bakomliggande tjänst använder,
  oavsett i vilket format handläggaren skriver in det.
- **RTFKF-FR-02.5** Minst ett av fälten ska vara ifyllt för att uppgifterna ska kunna sparas,
  eftersom ett sparande skriver om båda fälten på yrkandet och ett tomt formulär därmed skulle
  radera redan registrerade uppgifter.

### RTFKF-FR-03 — Slutföra uppgiften

- **RTFKF-FR-03.1** Båda fälten ska krävas innan uppgiften kan slutföras, och personnumret
  ska vara ett giltigt personnummer.
- **RTFKF-FR-03.2** Vid slutförande ska de ifyllda uppgifterna sparas innan uppgiften
  slutförs, så att slutförandet alltid avser det handläggaren ser i formuläret.
- **RTFKF-FR-03.3** Om sparandet misslyckas ska uppgiften inte slutföras.
- **RTFKF-FR-03.4** Handläggaren ska få skilda besked för slutförd komplettering, fortfarande
  ofullständigt yrkande, och redan utgången korrelationstid.
- **RTFKF-FR-03.5** Om slutförandet misslyckas ska uppgiften förbli öppen för ett nytt försök.
- **RTFKF-FR-03.6** Vid lyckat slutförande ska handläggarportalen meddelas att uppgiften är
  klar, så att den kan tas bort från handläggarens uppgiftslista.

---

## Icke-funktionella krav

### RTFKF-NFR-01 — Integrerbarhet

- **RTFKF-NFR-01.1** Mikrofrontenden ska kunna laddas in dynamiskt i handläggarportalen och ta
  emot uppgiftens identifierare som indata från värdapplikationen.
- **RTFKF-NFR-01.2** Mikrofrontenden ska kunna köras fristående för utveckling, utan
  värdapplikation.
- **RTFKF-NFR-01.3** Mikrofrontenden ska kunna peka mot olika BFF-instanser utan att byggas om.

### RTFKF-NFR-02 — Tillgänglighet

- **RTFKF-NFR-02.1** Gränssnittet ska byggas med FKUI:s komponenter, så att fältformat,
  felmeddelanden och hjälptexter följer Försäkringskassans gemensamma mönster.

---

## API-gränssnitt (översikt)

| API | Målgrupp | Specifikationsartefakt |
|---|---|---|
| RTF Manuell Komplettering BFF REST-API | Denna mikrofrontend | Ingen dedikerad OpenAPI-specifikation för BFF-kontraktet |

---

## Integration med RTF Manuell Komplettering BFF

Mikrofrontenden talar uteslutande med sin dedikerade BFF. Den har ingen kännedom om
bakomliggande regeltjänst eller ramverk — allt sådant döljs av BFF:n.
