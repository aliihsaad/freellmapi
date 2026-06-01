<div align="center">

<img src="repo-assets/Header.png" alt="FreeLLMAPI Pro Max header showing multimodal capabilities, routing, providers, and token budget" width="100%" />

# FreeLLMAPI Pro Max

**One OpenAI-compatible endpoint. Fifteen provider routes. Multimodal Pro Max dashboard. ~1B+ tokens per month.**

FreeLLMAPI Pro Max is this fork's upgraded personal edition of the original FreeLLMAPI project. It keeps the local free-tier router idea, then layers on multimodal endpoints, capability testing, model quarantine, richer analytics, integrations, and realtime voice UI.

Aggregate free and free-friendly tiers from Google, Groq, Cerebras, SambaNova, NVIDIA, Mistral, OpenRouter, GitHub Models, Cohere, Cloudflare, Z.ai (Zhipu), Ollama Cloud, Kilo Gateway, Pollinations, and LLM7 behind a unified local `/v1` API. Keys are stored encrypted. A router picks the best available model for each request, falls over to the next provider when one is rate-limited, and tracks per-key usage so you stay under every free-tier cap.

[![CI](https://github.com/tashfeenahmed/freellmapi/actions/workflows/ci.yml/badge.svg)](https://github.com/tashfeenahmed/freellmapi/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](#contributing)

</div>

---

## Contents

- [Why this exists](#why-this-exists)
- [Supported providers](#supported-providers)
- [Features](#features)
- [Not yet supported](#not-yet-supported)
- [Quick start](#quick-start)
- [Using the API](#using-the-api)
- [Screenshots](#screenshots)
- [How it works](#how-it-works)
- [Limitations](#limitations)
- [Contributing](#contributing)
- [Terms of Service review](#terms-of-service-review)
- [Disclaimer](#disclaimer)

## Why this exists

Every serious AI lab now offers a free tier — a few million tokens a month, a few thousand requests a day. On its own each tier is a toy. Stacked together, they add up to roughly **1.3 billion tokens per month** of working inference capacity, across dozens of models from small-and-fast to reasonably capable.

The problem is that stacking them by hand is painful: many SDKs, many rate limits, and many places a request can fail. FreeLLMAPI Pro Max collapses that into one OpenAI-compatible endpoint. Point any OpenAI client library at your local server, and it routes transparently across whichever providers you've added keys for.

## Supported providers

<table>
<tr>
<td align="center" width="180"><a href="https://ai.google.dev"><b>Google</b><br/>Gemini 2.5 Flash · 3.x previews</a></td>
<td align="center" width="180"><a href="https://groq.com"><b>Groq</b><br/>Llama 3.3, Llama 4, GPT-OSS, Qwen3</a></td>
<td align="center" width="180"><a href="https://cerebras.ai"><b>Cerebras</b><br/>Qwen3 235B</a></td>
<td align="center" width="180"><a href="https://cloud.sambanova.ai"><b>SambaNova</b><br/>DeepSeek V3.x · Llama 4 · Gemma 3</a></td>
</tr>
<tr>
<td align="center"><a href="https://mistral.ai"><b>Mistral</b><br/>Large 3 · Medium 3.5 · Codestral · Devstral</a></td>
<td align="center"><a href="https://openrouter.ai"><b>OpenRouter</b><br/>19 free-tier models</a></td>
<td align="center"><a href="https://github.com/marketplace/models"><b>GitHub Models</b><br/>GPT-4.1 · GPT-4o</a></td>
<td align="center"><a href="https://developers.cloudflare.com/workers-ai"><b>Cloudflare</b><br/>Kimi K2 · GLM-4.7 · GPT-OSS · Granite 4</a></td>
</tr>
<tr>
<td align="center"><a href="https://cohere.com"><b>Cohere</b><br/>Command R+ · Command-A (trial)</a></td>
<td align="center"><a href="https://docs.z.ai"><b>Z.ai (Zhipu)</b><br/>GLM-4.5 · GLM-4.7 Flash</a></td>
<td align="center"><a href="https://build.nvidia.com"><b>NVIDIA</b><br/>NIM (disabled by default)</a></td>
<td align="center"><a href="https://ollama.com"><b>Ollama Cloud</b><br/>Free cloud models</a></td>
</tr>
<tr>
<td align="center"><a href="https://kilo.ai/docs/gateway"><b>Kilo Gateway</b><br/>OpenAI-compatible gateway</a></td>
<td align="center"><a href="https://pollinations.ai"><b>Pollinations</b><br/>Anonymous OpenAI-compatible text</a></td>
<td align="center"><a href="https://llm7.io"><b>LLM7</b><br/>Anonymous / token gateway</a></td>
<td align="center"><i>Adding another? See <a href="#contributing">Contributing</a>.</i></td>
</tr>
</table>

## Features

- **OpenAI-compatible** — `POST /v1/chat/completions` and `GET /v1/models` work with the official OpenAI SDKs and any OpenAI-compatible client (LangChain, LlamaIndex, Continue, Hermes, etc.). Just change `base_url`.
- **Embeddings** — `POST /v1/embeddings` routes across configured embedding-capable providers and returns OpenAI-compatible embedding responses.
- **Vision chat** — OpenAI-style `content` arrays with `text` and `image_url` parts route to configured vision-capable providers. The first provider path supports Google Gemini with `data:image/...;base64,...` and safe remote `http(s)` image URLs.
- **Image generation, edits, and variations** — `POST /v1/images/generations`, `/v1/images/edits`, and `/v1/images/variations` route to configured image-capable providers and return OpenAI-compatible image data. The first provider path supports Google Gemini image models.
- **Speech generation** — `POST /v1/audio/speech` routes text-to-speech requests to configured audio-capable providers. The first provider path supports Google Gemini TTS and returns WAV or PCM audio.
- **Audio transcription and translation** — `POST /v1/audio/transcriptions` and `/v1/audio/translations` accept OpenAI-style multipart uploads and route to configured audio-capable providers. The first provider path supports Groq Whisper models.
- **Realtime audio sessions (beta)** — `POST /v1/realtime/sessions` mints a short-lived Gemini Live session token and constrained WebSocket URL so trusted clients can run realtime audio without seeing your long-lived Google API key. Accepts OpenAI-style `tools` / `tool_choice` and bakes them into the ephemeral `bidiGenerateContentSetup`, so Gemini Live emits native `functionCall` events for any catalog the client supplies.
- **Streaming and non-streaming** — Server-Sent Events for `stream: true`, JSON response otherwise. Every provider adapter implements both.
- **Tool calling** — OpenAI-style `tools` / `tool_choice` requests are passed through on `/v1/chat/completions` (assistant `tool_calls` + `tool` role follow-up messages round-trip across providers) **and** on `/v1/realtime/sessions` (the tool catalog is embedded in the ephemeral Gemini Live setup so the realtime model can issue native `functionCall` events).
- **Automatic fallover** — If the chosen provider returns a 429, 5xx, or times out, the router skips it, puts the key on a short cooldown, and retries on the next model in your fallback chain (up to 20 attempts).
- **Per-key rate tracking** — RPM, RPD, TPM, and TPD counters per `(platform, model, key)` so the router always picks a key that's under its caps.
- **Sticky sessions** — Multi-turn conversations keep talking to the same model for 30 minutes to avoid the hallucination spike that comes from mid-conversation model switches.
- **Encrypted key storage** — API keys are encrypted with AES-256-GCM before hitting SQLite; decryption happens in-memory just before a request.
- **Unified API key** — Clients authenticate to your proxy with a single `freellmapi-…` bearer token. You never expose upstream provider keys to your apps.
- **Optional dashboard PIN** — If you expose the dashboard online, enable a single-user PIN from **Settings**. It locks the web UI and management APIs while leaving `/v1/*` on the unified bearer key for apps.
- **Health checks** — Periodic probes mark keys as `healthy`, `rate_limited`, `invalid`, or `error` so the router skips dead ones automatically.
- **Admin dashboard** — React + Vite UI to manage keys, reorder the fallback chain, inspect analytics, test every capability from the Playground, and copy SDK snippets from the Integrations page. Dark mode included.
- **Analytics** — Per-request logging with latency, token counts, success rate, and per-provider breakdowns.
- **Capability matrix** — Dashboard lights show which providers can serve chat, embeddings, vision, images, and audio, whether a key is configured, and direct docs/key links for each provider.
- **Integrations guide** — Copy-ready JavaScript, Python, and cURL snippets show how to call every supported endpoint with the local `/v1` base URL and unified API key.
- **Logs diagnostics** — Dedicated dashboard tab for recent API logs, error flags, provider ranking, key health, and actionable routing recommendations.
- **Deploys to a Raspberry Pi** — Runs happily on a Pi 4 under PM2 behind nginx. ~40 MB RSS at idle.

## Not yet supported

The scope is deliberately narrow. If a feature isn't on this list and isn't below, assume it isn't there yet.

- **Server-side realtime WebSocket relay** — the dashboard can mint and use Gemini Live sessions locally, but a provider-agnostic relay with normalized realtime events is not implemented yet
- **Speech formats beyond WAV/PCM** — Gemini TTS returns PCM; this proxy wraps it as WAV by default
- **Legacy completions** (`/v1/completions`) — only the chat endpoint is implemented
- **Moderation** (`/v1/moderations`)
- **`n > 1`** (multiple completions per request)
- **Per-user billing / multi-tenant auth** — single-user by design

PRs that add any of these are very welcome. See [Contributing](#contributing).

## Quick start

**Prerequisites:** Node.js 20+, npm.

```bash
git clone https://github.com/tashfeenahmed/freellmapi.git
cd freellmapi
npm install

# Generate an encryption key for at-rest key storage
cp .env.example .env
echo "ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")" >> .env

# Start server + dashboard together
npm run dev
```

Open http://localhost:5173 (the Vite dev UI), add your provider keys on the **Keys** page, reorder the **Fallback Chain** to taste, and grab your unified API key from the **Keys** page header. That unified key is what you point your OpenAI SDK at. The **Integrations** page shows copyable SDK and cURL snippets for every capability.

For a production build:

```bash
npm run build
node server/dist/index.js     # server + dashboard both served on :3001
```

If you run the dashboard on a public or semi-public server, open **Settings** and enable the **Dashboard PIN**. This protects the browser UI and `/api/*` management routes with an HTTP-only session cookie. Your OpenAI-compatible clients still authenticate to `/v1/*` with the unified `freellmapi-…` bearer key.

## Using the API

Any OpenAI-compatible client works. For copy-button examples in JavaScript, Python, and cURL, open the dashboard's **Integrations** tab. Examples:

**Python**

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:3001/v1",
    api_key="freellmapi-your-unified-key",
)

resp = client.chat.completions.create(
    model="auto",  # let the router pick; or specify e.g. "gemini-2.5-flash"
    messages=[{"role": "user", "content": "Summarise the fall of Rome in one sentence."}],
)
print(resp.choices[0].message.content)
print("Routed via:", resp.headers.get("x-routed-via"))
```

**curl**

```bash
curl http://localhost:3001/v1/chat/completions \
  -H "Authorization: Bearer freellmapi-your-unified-key" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "auto",
    "messages": [{"role": "user", "content": "hi"}]
  }'
```

**Streaming**

```python
stream = client.chat.completions.create(
    model="auto",
    messages=[{"role": "user", "content": "Stream me a haiku about SQLite."}],
    stream=True,
)
for chunk in stream:
    print(chunk.choices[0].delta.content or "", end="", flush=True)
```

**Embeddings**

```python
embedding = client.embeddings.create(
    model="auto",
    input=["FreeLLMAPI routes embeddings too."],
)
print(len(embedding.data[0].embedding))
print("Routed via:", embedding.response.headers.get("x-routed-via"))
```

**Image generation**

```python
image = client.images.generate(
    model="auto",
    prompt="A clean app icon with a white dot on a black background",
    size="1024x1024",
    response_format="b64_json",
)
print(image.data[0].b64_json[:40])
```

**Image edit**

```python
edited = client.images.edit(
    model="auto",
    image=open("source.png", "rb"),
    prompt="Replace the background with a clean white studio backdrop",
    response_format="b64_json",
)
print(edited.data[0].b64_json[:40])
```

**Image variation**

```python
variation = client.images.create_variation(
    model="auto",
    image=open("source.png", "rb"),
    response_format="b64_json",
)
print(variation.data[0].b64_json[:40])
```

**Speech generation**

```python
speech = client.audio.speech.create(
    model="auto",
    voice="alloy",
    input="FreeLLMAPI can route speech generation too.",
    response_format="wav",
)
Path("speech.wav").write_bytes(speech.content)
```

**Audio transcription**

```python
with open("meeting.wav", "rb") as audio:
    transcript = client.audio.transcriptions.create(
        model="auto",
        file=audio,
        response_format="json",
    )
print(transcript.text)
```

**Audio translation**

```python
with open("meeting.wav", "rb") as audio:
    translation = client.audio.translations.create(
        model="auto",
        file=audio,
        response_format="json",
    )
print(translation.text)
```

**Realtime audio session (beta)**

```bash
curl http://localhost:3001/v1/realtime/sessions \
  -H "Authorization: Bearer freellmapi-your-unified-key" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "auto",
    "instructions": "You are concise.",
    "voice": "alloy",
    "response_modalities": ["AUDIO"],
    "input_audio_transcription": true,
    "output_audio_transcription": true,
    "tools": [{
      "type": "function",
      "function": {
        "name": "get_weather",
        "description": "Look up current weather.",
        "parameters": {
          "type": "object",
          "properties": {"city": {"type": "string"}},
          "required": ["city"]
        }
      }
    }],
    "tool_choice": "auto"
  }'
```

Use the returned `client_secret.value` and `connect_url` from a trusted client to open the Gemini Live WebSocket session. The long-lived Google API key stays encrypted in FreeLLMAPI. If you pass `tools`, they are embedded into the ephemeral `bidiGenerateContentSetup` and the live model will emit native `functionCall` frames over the WebSocket — your client just has to execute them and send a `toolResponse` back. The response `config.tools` echoes the names that were registered.

**Tool calling**

Pass OpenAI-style `tools` and `tool_choice`; the assistant response round-trips back through the proxy exactly like the OpenAI API. Multi-step flows (assistant `tool_calls` → `tool` role follow-up → final answer) work across every provider the router can reach.

```python
tools = [{
    "type": "function",
    "function": {
        "name": "get_weather",
        "description": "Get current weather for a city.",
        "parameters": {
            "type": "object",
            "properties": {"city": {"type": "string"}},
            "required": ["city"],
        },
    },
}]

# 1. Model asks for a tool call
first = client.chat.completions.create(
    model="auto",
    messages=[{"role": "user", "content": "What's the weather in Karachi?"}],
    tools=tools,
    tool_choice="required",
)
call = first.choices[0].message.tool_calls[0]

# 2. You execute the tool, feed the result back
final = client.chat.completions.create(
    model="auto",
    messages=[
        {"role": "user", "content": "What's the weather in Karachi?"},
        first.choices[0].message,
        {"role": "tool", "tool_call_id": call.id, "content": '{"temp_c": 32, "cond": "sunny"}'},
    ],
    tools=tools,
)
print(final.choices[0].message.content)
```

Works with `stream=True` as well — you'll get `delta.tool_calls` chunks followed by a `finish_reason: "tool_calls"` close. Under the hood, OpenAI-compatible providers (Groq, Cerebras, SambaNova, Mistral, OpenRouter, GitHub Models, HuggingFace, Cloudflare, Cohere compat) get the request passed through; Gemini requests get translated into Google's `functionDeclarations` / `functionResponse` shape and the response is translated back.

Every response carries an `X-Routed-Via: <platform>/<model>` header so you can see which provider actually served each call. If a request fell over between providers, you'll also see `X-Fallback-Attempts: N`.

## Screenshots

### Keys

Manage provider credentials and grab the unified API key your apps connect with. Each key shows a status dot and when it was last health-checked.

### Settings / dashboard PIN

Enable the optional dashboard PIN before exposing the web UI outside your machine. The PIN protects the dashboard and admin APIs only; your apps keep using the unified API key against `/v1`.

![Dashboard PIN settings](repo-assets/set-pin.png)

When PIN auth is enabled, visitors see the locked dashboard screen until they enter the PIN.

![Dashboard PIN login screen](repo-assets/login.png)

### Playground

Use the **Chat** tab as a live workspace for chat, vision with URL or local image selection, embeddings, image/audio actions, speech playback, and realtime voice sessions. Switch to **Test Lab** for endpoint diagnostics, raw JSON inspection, and the all-model sweep/quarantine flow.

![Playground chat workspace](repo-assets/playground-chat.png)

![Playground speech generation](repo-assets/playground-speech.png)

![Playground realtime listening state](repo-assets/playground-realtime-listening.png)

![Playground realtime talking state](repo-assets/playground-realtime-talking.png)

![Playground Test Lab model sweep](repo-assets/playground-test-lab-sweep.png)

### Integrations

Copy the local `/v1` base URL, unified API key, client bootstrap code, and per-capability snippets for chat, vision, embeddings, images, audio, and realtime sessions.

### Fallback

Review monthly token budgets, model health, system quarantines, and manual fallback disables before routing live traffic.

![Fallback model health and quarantine view](repo-assets/fallback-model-health.png)

### Capabilities

Provider support lights show which configured keys can serve chat, embeddings, vision, images, and audio.

![Capabilities matrix](repo-assets/capabilities-matrix.png)

### Logs

The Logs page combines provider ranking, diagnosis flags, recommendations, and recent API events.

![Logs diagnostics dashboard](repo-assets/logs-diagnostics.png)

![Recent API logs](repo-assets/logs-recent-events.png)

### Analytics

Request volume, success rate, tokens in and out, average latency, estimated savings, and per-provider usage estimates over 24h / 7d / 30d windows.

![Analytics usage estimates](repo-assets/analytics-usage.png)

## How it works

```
┌──────────────────┐   Bearer freellmapi-…   ┌─────────────────────────┐
│  OpenAI SDK /    │ ──────────────────────▶ │  Express proxy (:3001)  │
│  curl / any      │ ◀────────────────────── │  /v1/chat/completions   │
│  OpenAI client   │      streamed tokens    └────────────┬────────────┘
└──────────────────┘                                      │
                                                          ▼
                             ┌────────────────────────────────────────────────┐
                             │  Router                                        │
                             │   1. Pick highest-priority model that          │
                             │      (a) has a healthy key and                 │
                             │      (b) is under all its rate limits.         │
                             │   2. Decrypt key, call provider SDK.           │
                             │   3. On 429/5xx → cooldown + retry next model. │
                             └────────────────────────────────────────────────┘
                                          │
   ┌──────────────┬────────────┬──────────┴─────────┬─────────────┬──────────┐
   ▼              ▼            ▼                    ▼             ▼          ▼
 Google         Groq        Cerebras           OpenRouter        HF       …10 more
```

- **Router** (`server/src/services/router.ts`) — picks a model per request.
- **Rate-limit ledger** (`server/src/services/ratelimit.ts`) — in-memory RPM/RPD/TPM/TPD counters backed by SQLite, with cooldowns on 429s.
- **Provider adapters** (`server/src/providers/*.ts`) — one file per provider, implementing the `Provider` base class: `chatCompletion()` and `streamChatCompletion()`.
- **Health service** (`server/src/services/health.ts`) — periodic probe keeps key status fresh.
- **Dashboard** (`client/`) — React + Vite + shadcn/ui admin surface.
- **Dashboard auth** (`server/src/routes/auth.ts`, `server/src/middleware/adminAuth.ts`) — optional PIN gate for the web UI and `/api/*` management routes. `/v1/*` stays on unified bearer-key auth for clients.
- **Storage** — SQLite (`better-sqlite3`) with AES-256-GCM envelope encryption for keys.

## Limitations

Stacking free tiers has real trade-offs. Be honest with yourself about them:

- **No frontier models.** The free-tier catalog tops out around Llama 3.3 70B, GLM-4.5, Qwen 3 Coder, and Gemini 2.5 Pro. You will not get GPT-5 or Claude Opus class reasoning through this. For hard problems, pay for a real API.
- **Intelligence degrades as the day progresses.** Your top-ranked models (usually Gemini 2.5 Pro, GPT-4o via GitHub Models) have the lowest daily caps. Once they hit their limits, the router falls down your priority chain to smaller/weaker models. Expect the effective intelligence of the endpoint to drop in the late hours of each day — then reset at UTC midnight.
- **Latency is highly variable.** Cerebras and Groq are extremely fast; others are not. You get whichever one is available.
- **Free tiers can change without notice.** Providers regularly tighten, loosen, or remove free tiers. When that happens you'll see 429s or auth errors until you update the catalog. Re-seed scripts live in `server/src/scripts/`.
- **No SLA, by definition.** If you need reliability, use a paid provider with a contract.
- **Single-user by design.** The optional dashboard PIN is a practical guard for your own online deployment, not multi-tenant identity, RBAC, or billing. Use HTTPS/reverse-proxy access controls for anything serious.

## Contributing

Contributors very welcome! Good first PRs:

- **Add a provider** — copy `server/src/providers/openai-compat.ts` as a template, wire it into `server/src/providers/index.ts`, seed its models in `server/src/db/index.ts`, add a test in `server/src/__tests__/providers/`.
- **Add an endpoint** — embeddings, images, moderations. The provider base class can grow new methods; adapters declare which they support.
- **Improve the router** — cost-aware routing (cheapest-healthy-fastest tradeoffs), better latency-weighted priority, regional pinning.
- **Dashboard polish** — charts on the Analytics page, key rotation UX, batch import of keys from `.env`.
- **Docs** — more examples, client library snippets for Go/Rust/etc., a deployment recipe for Docker or Fly.

**Development loop:**

```bash
npm install
npm run dev      # server on :3001, dashboard on :5173, both with HMR
npm test         # vitest — 75 tests across providers, routes, router, ratelimit
```

PRs should include a test, keep the existing test suite green, and match the `.editorconfig` / tsconfig defaults already in the repo. Issues and discussions are open.

### Contributors

Thanks to everyone who's helped improve FreeLLMAPI:

- [@moaaz12-web](https://github.com/moaaz12-web) — tool-calling support across providers (#3)
- [@lukasulc](https://github.com/lukasulc) — better-sqlite3 bump to fix npm install on Node 24+ (#12)
- [@VinhPhamAI](https://github.com/VinhPhamAI) — root `.env` PORT now propagates to server + Vite dev proxy + UI base URL (#27)
- [@deadc](https://github.com/deadc) — preserve Gemini `thoughtSignature` so multi-turn function calling stops 400-ing (#32); router model-first key-exhaustion tests + per-model `limits` hoist (#42)
- [@zhangyu1324](https://github.com/zhangyu1324) — requested Ollama Cloud integration, now V10 catalog (#14 / #41)
- [@jtbrennan-git](https://github.com/jtbrennan-git) — security review (#35) and Phase 1 hardening: parameterized analytics queries, sort-preset whitelist, timing-safe API key compare, mid-stream error sanitization
- [@praveenkumarpranjal](https://github.com/praveenkumarpranjal) — guard Gemini SSE `JSON.parse` so a malformed frame no longer aborts the whole stream, plus first streaming tests for the Google provider (#47)

## Terms of Service review

A self-hosted, single-user, personal-use setup was re-reviewed against each provider's ToS (May 2026). Summary:

| Provider | Verdict | Notes |
|---|---|---|
| Google Gemini | ⚠️ Caution | March 2026 ToS narrows scope to *"professional or business purposes, not for consumer use"* — a self-hosted developer proxy is still defensible, but the clause is new. |
| Groq | ✅ Likely OK | GroqCloud Services Agreement permits Customer Application integration. |
| Cerebras | ✅ Likely OK | Permitted; explicitly forbids selling/transferring API keys. |
| Mistral | ✅ Likely OK | APIs allowed for personal/internal business use. |
| OpenRouter | ✅ Likely OK | April 2026 ToS sharpens the no-resale / no-competing-service clause; private single-user proxy still fine. |
| SambaNova | ⚠️ Ambiguous | EULA §1.5(c) blocks resale and "service bureau" use; single-user with no third-party access is fine. |
| Cloudflare Workers AI | ⚠️ Ambiguous | No anti-proxy clause; covered by general Self-Serve Subscription Agreement. |
| NVIDIA NIM | ⚠️ Caution | Trial ToS §1.2 / §1.4: *"evaluation only, not production."* Disabled in default catalog. |
| GitHub Models | ⚠️ Caution | Free tier explicitly scoped to *"experimentation"* and *"prototyping."* |
| Cohere | ❌ Avoid | Terms §14 still forbids *"personal, family or household purposes."* |
| Zhipu (open.bigmodel.cn) | ✅ Likely OK | Personal/non-commercial research carve-out still in the platform docs. |
| Z.ai (api.z.ai) | ⚠️ Caution | New row — Singapore entity (distinct from Zhipu CN). §III.3(l) anti-traffic-redirect clause could plausibly be read against a proxy; no explicit personal-use carve-out. |
| Ollama Cloud | ✅ Likely OK | New row — Free plan permits cloud-model access (1 concurrent, 5-hour session caps). No anti-proxy / anti-resale clauses found. *(Integration tracked in #14.)* |

Rules of thumb that keep most providers happy: **one account per provider**, **no reselling**, **no sharing your endpoint with other humans**, **don't hammer a free tier as a paid production backend**. This is informational, not legal advice — read each provider's ToS and make your own call.

Removed since the April 2026 review: Hugging Face, Moonshot, and MiniMax direct integrations were dropped from the catalog (HF — tool-call format issues; Moonshot — moved to paid only; MiniMax — superseded by the OpenRouter `minimax/minimax-m2.5:free` route).

## Disclaimer

**This project is for personal experimentation and learning, not production.** Free tiers exist so developers can prototype against them; they aren't a stable, supported inference substrate and shouldn't be treated as one. If you build something real on top of FreeLLMAPI, swap in a paid API before you ship. Your relationship with each upstream provider is governed by the terms you accepted when you created your account — those terms still apply when the traffic is proxied through this project, and you're responsible for complying with them.

## License

[MIT](./LICENSE)
