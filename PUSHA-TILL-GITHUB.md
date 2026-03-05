# Så pushar du till GitHub (smidig workflow)

Du behöver **Git** installerat. Om du inte har det: [git-scm.com](https://git-scm.com/) – använd sedan **Git Bash** eller en terminal där `git` fungerar.

---

## Första gången (engångsinställning)

Öppna **Git Bash** eller **PowerShell** (i en terminal där `git` är installerat) och gå till projektmappen:

```bash
cd c:/Dev/reading-main
```

### 1. Om mappen INTE är ett git-repo än

```bash
git init
git remote add origin https://github.com/rarnesson/reading.git
```

### 2. Om repot på GitHub redan har filer (t.ex. från webbredigering)

Hämta dem först så du inte skriver över historiken:

```bash
git fetch origin
git branch -M main
git reset --soft origin/main
```

*(Om din standardgren heter `master` istället för `main`, byt till `origin/master`.)*

### 3. Sätt ditt namn och e-post (engångs per dator)

```bash
git config user.name "Ditt Namn"
git config user.email "din@epost.se"
```

---

## Varje gång du vill “deploya” (pusha senaste versionen)

Kör dessa tre kommandon från `c:/Dev/reading-main`:

```bash
git add .
git commit -m "Uppdatering: beskriv kort vad du ändrat"
git push -u origin main
```

- **`git add .`** – lägger till alla ändringar.
- **`git commit -m "..."`** – sparar en “version” med en kort beskrivning.
- **`git push -u origin main`** – skickar upp till GitHub (sidan på rarnesson.github.io uppdateras om du har GitHub Pages på `main`).

Efter första `git push -u origin main` räcker det sedan med:

```bash
git add .
git commit -m "Kort beskrivning"
git push
```

---

## Kort sammanfattning

| Vad du vill göra | Kommando |
|------------------|----------|
| Alla ändringar med | `git add .` |
| Spara en version | `git commit -m "text"` |
| Skicka till GitHub | `git push` |

Om `git` inte hittas i terminalen: använd **Git Bash** (följer med Git för Windows) eller lägg till Git i PATH efter installation.
