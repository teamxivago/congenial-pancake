# Studio

Studio is built into Postiz (menu: **Studio**). It turns what is trending in a
niche into a video and schedules it on every connected channel (Instagram,
TikTok, YouTube, X, Facebook, LinkedIn, Threads, Pinterest... every channel
Postiz supports).

```
trend sources ──> best trend ──> script (OpenAI) ──> [approve script?]
      ──> video (cheap FFmpeg or AI generator) ──> [approve video?] ──> scheduled posts
```

## Screens

| Tab | What it does |
| --- | --- |
| Needs approval | Scripts and videos waiting for you: edit, approve, reject |
| All content | Everything Studio made, with status, errors and a retry button |
| Create a video | Any idea or prompt → script → video → posts, without an automation |
| Automations | Niche + keywords + trend sources + video style + channels + schedule, on repeat |
| Trends | The trends the automations found, scored; turn any of them into a video |
| API keys | Each organization's own provider keys, stored encrypted |

## Video styles

- **Cheap** (`ffmpeg-slideshow`): AI voiceover (OpenAI TTS or ElevenLabs) + AI images (OpenAI)
  or free stock photos (Pexels) + slow zoom + burned captions + optional music, rendered with
  FFmpeg on your VPS. Costs a few cents per video.
- **AI video**: pick the generator per automation or per video:
  - **fal.ai**: every text-to-video model on fal.ai (Kling, Veo, Seedance, Hailuo/MiniMax, Wan,
    Luma, Grok Imagine, LTX, PixVerse, Vidu...). The model list is loaded live, so new models show
    up without a code change.
  - **Replicate**: the text-to-video collection, loaded live with your key.
  - **OpenAI Sora**, **Google Gemini Omni**, **Runway** (Gen-4.5 and the partner models it hosts),
    **Luma Dream Machine**: directly with each provider's key.
  - "Extra model inputs (JSON)" passes any model-specific option (resolution, seed, audio...).
- **No video**: text posts only.

## Approval

Each automation (and each manual video) has two switches:

- **Approve the script**: the video is only paid for after you approve the script.
- **Approve the video**: nothing is scheduled until you approve it; you can set the date.

Both off = fully automatic.

## Platform settings

Some platforms need extra settings to publish (YouTube title and privacy, Pinterest board,
TikTok privacy...). Studio fills them from each platform's own settings schema. When they
don't validate (for example a Pinterest board id it can't know), the post is saved as a
**draft** in the calendar and the content shows which channel needs a look.

## Trend sources

| Source | Key | Notes |
| --- | --- | --- |
| Google Trends | none | Daily trending searches of the selected country |
| Google News | none | News of the last day for the niche keywords |
| Hacker News | none | Front page, or the niche keywords |
| RSS feeds | none | Any blog or news feed of the niche |
| Reddit | server `REDDIT_CLIENT_ID`/`SECRET` | Reddit blocks most anonymous server requests |
| YouTube | YouTube Data API key | Most popular videos (by category) or keyword search |
| X trends | X bearer token | Needs a paid X API plan |

Trends matching the automation's keywords get a higher score. Each trend is used once.

## Keys and costs (multi-user)

Every organization adds its own keys in **Studio > API keys**, so each user pays their own
providers. OpenAI is needed for the scripts. If `STUDIO_SHARED_KEYS=true`, organizations
without their own key use the server's env keys (see `deploy/vps/.env.vps.example`); only
turn this on for your own team, the server owner pays for everything generated.

Daily limits per automation (videos per day, check interval) cap the spend.

## Known limits

- Provider APIs change often. Model ids are editable text with live lists for fal.ai and
  Replicate; the direct integrations (Sora, Gemini Omni, Runway, Luma) follow the APIs as
  documented in October 2026 and were not run against real accounts while building them.
- Retrying a content that failed while scheduling can schedule again on channels that already
  got their post.
- Studio API keys don't go through Postiz billing credits yet: with Stripe enabled, Studio
  needs a plan that includes AI features.
