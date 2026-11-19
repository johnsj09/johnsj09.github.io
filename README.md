# Jefri Thimoathi Johnson — portfolio

Static site: no build step. Upload the whole folder to a GitHub repository named
`jefrithimoathijohnson.github.io`, then Settings → Pages → Deploy from branch → `main` / root.

## What's where
- `index.html` — the main page (light mode = lab informatics, dark mode = research; pull the cord to switch)
- `rooms/` — the page behind each orb in the "My work" orrery (lab, freelance, memory, vision, bench), with `room.css` and `room.js`
- `assets/hero-photo.webp` / `hero-photo-bw.webp` — your cut-out photo (colour, and the black-and-white base); keep 801×1033 with a transparent background if you replace them
- `assets/Jefri-Thimoathi-Johnson-CV.pdf` — **add your CV here with exactly this name.** Every "Download CV" button points to it.
  Until it's there, those buttons open the CV request form instead.
- `edit.js` — edit mode (see below). Only loads when you open a page with `?edit` on your own computer.
- Contact form posts to FormSubmit. The first message triggers a confirmation email to you: click it once to activate.

## Changing the wording
Open a page with `?edit` at the end, in Chrome or Edge: `index.html?edit`, or `rooms/lab.html?edit`.
Click any outlined text and type; Shift+Enter for a line break; "+ line / remove" for list lines;
Alt+click to use a button normally. Save (or Ctrl/Cmd+S) and pick the same file the first time.

Text written by the code (not outlined in edit mode) is edited in the file itself:
- the rotating roles under "I am a": search `index.html` for `const SETS`
- the orrery's room details: search `index.html` for `INFO = [`
- the periodic table ("Me, in 21 elements"): search `index.html` for `EL = [`
- room captions that change when you click a tab: `rooms/room.js`, search for `SAY`
