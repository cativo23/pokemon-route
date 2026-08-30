# Contributing

Thanks for looking. This is a small, opinionated project — here is what is useful and what is not.

## What I want most

**Factual corrections.** Release years, mechanics, which generation introduced what, how a feature actually unlocks. I have already shipped two errors and had to fix them: I claimed Sword was the first mainline game on a home console (Let's Go beat it by a year), and I described Challenge Mode as a selectable option when it is exclusive to Black 2 and only unlocks after you beat the Champion.

If a stated fact is wrong, open a [correction issue](../../issues/new?template=correction.yml) with a source. Bulbapedia and Serebii are ideal.

**Route arguments.** You think Ultra Sun belongs over Sun, or HeartGold over Crystal? Make the case in a [route issue](../../issues/new?template=route.yml). These are opinions and I will defend mine, but a good argument may change the page — or earn a line acknowledging the other side, which several stops already carry.

**Bugs.** Anything broken, especially on a screen size or browser I did not test.

## Ground rules for code

These are not negotiable, because they are the point of the project:

- **No dependencies. No build step. No framework.** `index.html` is the deployable artifact. If a change needs npm, it is the wrong change.
- **No tracking, no analytics, no third-party embeds.** The page must work offline after first load.
- **Colours and fonts come from tokens.** Nothing literal in `styles.css` — add a token in `tokens.css` and reference it. The validator enforces this.
- **Stay inside the weight budget.** ~172 KB today, 400 KB hard ceiling in CI.
- **Accessibility is not optional.** Real alt text, visible focus, reduced motion honoured, keyboard operable.
- **No invented data.** No made-up statistics, no fabricated difficulty scores, no filler numbers. Hour counts are estimates and are labelled as such.

## Before you open a PR

```bash
python3 tools/validate.py     # 26 checks, all must pass
node --check assets/app.js
python3 -m http.server 8000   # then look at it, including at 320px wide
```

CI runs the first two on every push.

## Style

The prose is plain and direct. No marketing voice, no exclamation marks, no "unleash" or "elevate". If a sentence could sit on any website, it probably should not be on this one.

Headings are roman, never italic. Emphasis comes from weight or the accent colour.
