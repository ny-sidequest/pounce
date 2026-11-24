# Pounce data contract (client ↔ backend)

The game works today on mock data. To go live, set `CONFIG.statsUrl` in `js/config.js` to the API base URL
(no trailing slash). The UI never changes: it only calls `getNightStats`, `getPercentile` (both in `js/stats.js`)
and sends one event through `js/telemetry.js`.

If a GET fails or takes longer than **3 s**, the client shows mock data with a small "Live stats unavailable" note,
so the API should be fast and may be cached (`Cache-Control: max-age=60` is plenty).
CORS: allow `GET` and `POST` with `Content-Type: application/json` from the site origin.

## 1. `GET {statsUrl}/nights/{id}/stats`

Crowd stats for night `{id}` (the puzzle id, an integer).

```json
{
  "players": 1286,
  "scoreHistogram": [
    { "from": 0,    "to": 499,   "count": 12 },
    { "from": 500,  "to": 999,   "count": 31 },
    { "from": 9500, "to": 10000, "count": 4 }
  ],
  "bandShares": { "psychic": 4, "genius": 22, "curious": 27, "sleepy": 18, "stray": 19, "lost": 10 },
  "caughtPct": 64,
  "mostPouncedAfterClue": 3,
  "topWrongGuess": { "text": "iron man", "count": 212 },
  "clues": [
    { "index": 1, "gotItPct": 88, "medianSeconds": 5.2 },
    { "index": 2, "gotItPct": 91, "medianSeconds": 3.4 },
    { "index": 3, "gotItPct": 79, "medianSeconds": 6.0 },
    { "index": 4, "gotItPct": 41, "medianSeconds": 8.8 },
    { "index": 5, "gotItPct": 95, "medianSeconds": 2.1 }
  ]
}
```

| Field | Meaning |
|---|---|
| `players` | Cats who finished the night so far. Shown as "1,286 cats played so far". |
| `scoreHistogram` | Final scores in bins covering 0–10,000, in order, no gaps. The client draws the bell curve from these. 20 bins of 500 is what the mock uses; any bin width works. `to` is inclusive. |
| `bandShares` | Whole-number percent of players per rank band. Keys are fixed: `psychic` (8,500+), `genius` (7,000–8,499), `curious` (6,000–6,999), `sleepy` (5,000–5,999), `stray` (2,000–4,999), `lost` (0–1,999). Should add up to 100. **Count a player by their displayed title, not their raw score**: a player who did not catch the thief is capped at `stray`, whatever their score. |
| `caughtPct` | Percent of players who caught the thief (outcome `caught`). |
| `mostPouncedAfterClue` | The clue number (1–5) after which most catching pounces were made. |
| `topWrongGuess` | The most common wrong *pounce* guess and how many cats typed it. See the normalisation note below. |
| `clues[]` | One per clue, `index` 1–5. `gotItPct`: percent who answered it correctly. `medianSeconds`: median time of the *correct* answers, one decimal. |

## 2. `GET {statsUrl}/nights/{id}/percentile?score={n}`

```json
{ "betterThanPct": 74 }
```

`betterThanPct`: whole-number percent of players on this night whose final score is **strictly lower** than `score`
(0–99). Shown as "Better than 74% of tonight's cats" and in the share text.

## 3. `POST {statsUrl}/rounds`

One event per finished night, sent once from the results flow. `Content-Type: application/json`. Respond `204`; the client ignores the response.

```json
{
  "type": "round",
  "deviceId": "7b0a6c52-4c25-4f0e-8d1b-0a54b6b3f9d1",
  "nightId": 3,
  "finishedAt": "2026-11-24T21:14:05.120Z",
  "totalScore": 7493,
  "speedScore": 3493,
  "pounceScore": 4000,
  "caught": true,
  "outcome": "caught",
  "pouncedAfterClue": 2,
  "pounceGuess": "Robert Downey Jr.",
  "clues": [
    { "index": 1, "correct": true,  "tries": 1, "seconds": 9.4, "guesses": ["chaplin"] },
    { "index": 4, "correct": false, "tries": 3, "seconds": 20,  "guesses": ["columbo", "poirot", "monk"] }
  ]
}
```

| Field | Meaning |
|---|---|
| `deviceId` | Random UUID made on the device and kept in `localStorage` (`pounce:deviceId`). Anonymous: no account, no personal data. Use it only to de-duplicate (one round per `deviceId` + `nightId`). |
| `nightId` | Puzzle id. |
| `finishedAt` | ISO-8601 UTC, the client clock (treat as untrusted). |
| `totalScore` / `speedScore` / `pounceScore` | `totalScore = speedScore + pounceScore`. Speed is 0–5,000; pounce 0–5,000. |
| `caught` | `true` only for a correct pounce. |
| `outcome` | `"caught"` · `"wrong"` (a wrong pounce guess) · `"timeout"` (the pounce box ran out, or the page was reloaded) · `"never"` (never pounced). |
| `pouncedAfterClue` | 1–5, or `null` when `outcome` is `never`. |
| `pounceGuess` | The raw text typed into the pounce box, or `null`. |
| `clues[]` | Only the clues that were played. `tries` 0–3 (a clue that timed out with no guess has 0). `seconds`: time spent on the clue, 0.1 s precision; `20` for a timeout. `guesses`: raw text of every attempt, in order. |

Treat the client as untrusted (the game is a prototype; answers and scoring currently run in the browser).
Validate ranges and reject duplicates. Without `statsUrl` the client keeps the last 20 events in
`localStorage['pounce:outbox']` instead of sending them.

## Important: "Top wrong guess" shows what players typed

`pounceGuess` and `clues[].guesses` are **raw text typed by players**. `topWrongGuess.text` is shown on the results
page to everyone, so before returning it the backend must:

1. **Normalise**: lowercase, trim, collapse spaces, strip punctuation, so "Iron Man", "iron man " and "IRON MAN!" count as one guess. (The client shows it as written in the response, so title-casing for display is fine.)
2. **Filter**: drop anything on a profanity / abuse list, URLs, and anything over ~40 characters.
3. **Threshold**: only return a guess typed by a minimum number of different devices (for example 5), so one person cannot put their own text on everyone's screen.
4. **Exclude the right answer and its aliases.** The client does not filter.
5. If nothing qualifies, return `"topWrongGuess": null`. The client then hides the line.
