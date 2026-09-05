# SAATHI — Antigravity Session Handoff

> **Date:** September 4, 2026  
> **Agent:** Antigravity (Google DeepMind)  
> **Repo:** `thecoadingmonk496/saathi` (now public on GitHub)  
> **Live Frontend:** https://saathi-umber.vercel.app (Vercel)  
> **Live Backend:** https://saathi-backend-7t91.onrender.com (Render, free tier)

---

## 1. Project Overview

SAATHI is a full-stack agricultural SaaS platform for Indian farmers. It includes:

- **Frontend:** React + Vite + TailwindCSS, deployed on Vercel.
- **Backend:** Python FastAPI, deployed on Render (free tier).
- **AI Voice Assistant:** A modal component (`AIVoiceModal.jsx`) that lets users speak to an AI assistant powered by Google Gemini, with text-to-speech responses via Sarvam AI.
- **Key Features:** Mandi (market) price lookup, buyer discovery, supply chain tracking, multilingual support (Hindi, English, Tamil, Telugu, Punjabi, etc.).

---

## 2. What Was Done This Session

### 2.1 Gemini Model Migration

- **Problem:** The user was on `gemini-3.6-flash` (Google AI Studio free tier), which has a hard limit of **20 requests/day**, causing constant "server is busy" errors.
- **Fix:** Switched the backend to `gemini-3.1-flash-lite`, which has **500 requests/day** on the free tier.
- **Files changed:**
  - `ai_pipeline.py` — Changed the default `MODEL_NAME` from `gemini-3.5-flash-lite` to `gemini-3.1-flash-lite`.
  - The user also added `MODEL_NAME=gemini-3.1-flash-lite` as an environment variable on Render.

### 2.2 Voice Assistant — Complete Overhaul of `AIVoiceModal.jsx`

This was the bulk of the work. The voice assistant had multiple critical bugs.

#### Architecture (Hybrid Model)
The modal uses:
- **Browser Web Speech API** (`webkitSpeechRecognition`) for speech-to-text (STT) — runs entirely in the browser.
- **WebSocket connection** to the Render backend (`wss://saathi-backend-7t91.onrender.com/ws/voice`) for AI processing (Gemini) and text-to-speech (Sarvam AI).
- **Local React state** (`chatHistory`) for the conversation thread — intentionally NOT persisted. Wiped on modal close.

#### Bugs Fixed

| Bug | Root Cause | Fix |
|-----|-----------|-----|
| **Mic kept turning on/off while speaking** | `continuous` was set to `false`, so Chrome's Web Speech API would auto-stop on every tiny pause between words. | Set `recognition.continuous = true`. |
| **No live transcript visible while speaking** | The live transcript div was only rendered when `status === 'listening'`, but speaking changed status to `user_speaking`, hiding the text. | Changed render condition to `status === 'listening' \|\| status === 'user_speaking'`. |
| **Sentences got chopped and auto-submitted mid-speech** | Every `isFinal` result from the Web Speech API immediately called `handleFinalSpeech()`, which sent it to the backend. | Removed the instant submit. Added a custom **Voice Activity Detection (VAD)** timer: 1.5 seconds of silence triggers `recognition.stop()`, which fires `onend`, which submits the full accumulated transcript. |
| **"Speak Again" button crashed / didn't work** | Clicking "Speak Again" destroyed the WebSocket and created a new one via `wsTrigger` state. The new WS took 2-3s to connect on Render's free tier, but the send buffer only waited 1s. | Removed the WS teardown on "Speak Again". Now the WebSocket stays alive for the entire modal session. "Speak Again" just resets the speech recognition state and restarts the mic. |
| **User's spoken queries not showing in chat UI** | `handleFinalSpeech()` sent the query to the backend but never appended `{ role: 'user', content: queryText }` to `chatHistory`. | Added `setChatHistory(prev => [...prev, { role: 'user', content: queryText }])` at the top of `handleFinalSpeech()`. |
| **Chat history persisted across modal opens (unwanted)** | A previous dev had added `sessionStorage` persistence for `chatHistory`. | Reverted to plain `useState([])`. Chat now wipes clean when modal closes. |
| **Chrome blocked microphone on "Speak Again"** | `recognition.start()` was called inside an async `ws.onopen` callback, which Chrome considers a non-user-gesture context. | Moved `startRecognition()` to fire synchronously on mount/click. |
| **WebSocket send failed when connection was still CONNECTING** | `handleFinalSpeech` checked `ws.readyState === WebSocket.OPEN` but didn't handle `CONNECTING`. | Added a retry loop (`trySend`) that waits up to 5 seconds (50 retries × 100ms) for the WS to finish connecting. |

#### Key State Machine

```
idle → listening → user_speaking → processing → ai_speaking → done
                                                              ↓
                                                         (Speak Again → listening)
                                                              ↓
                                                         (Close → destroyed, chat wiped)
```

#### File: `src/components/AIVoiceModal.jsx`

Key refs/state:
- `wsRef` — single WebSocket connection, created on mount, stays alive until modal closes.
- `recognitionRef` — Web Speech API instance.
- `silenceTimerRef` — the 1.5s VAD timer (cleared on every new speech event, set on every result).
- `statusRef` — mirrors `status` state to avoid stale closures in callbacks.
- `chatHistory` — `[{ role: 'user' | 'assistant', content: string }]`, local state only.
- `transcript` — accumulated final recognized text for the current turn.
- `interimTranscript` — live partial text being spoken right now.
- `displayTranscript = transcript || interimTranscript` — what's shown in the UI.

### 2.3 Environment & Deployment

- **`.env` (local only, gitignored):**
  ```
  VITE_FASTAPI_URL=https://saathi-backend-7t91.onrender.com
  VITE_FASTAPI_WS_URL=wss://saathi-backend-7t91.onrender.com/ws/voice
  ```

- **Vercel Environment Variables (must be set manually in Vercel dashboard → Settings → Environment Variables):**
  - `VITE_FASTAPI_URL` = `https://saathi-backend-7t91.onrender.com`
  - `VITE_FASTAPI_WS_URL` = `wss://saathi-backend-7t91.onrender.com/ws/voice`
  - **Without these, the live Vercel site falls back to `localhost:8000` and fails silently.**

- **Render Environment Variables:**
  - `MODEL_NAME` = `gemini-3.1-flash-lite`
  - Auto-deploy is **DISABLED**. Must manually deploy from Render dashboard.

- **CORS (in `main.py`):**
  ```python
  allow_origins=[
      "https://saathi-umber.vercel.app",
      "http://localhost:5173",
      "http://localhost:5175",
      "http://localhost:3000",
      "http://127.0.0.1:5173"
  ],
  allow_origin_regex=r"https://.*\.vercel\.app",
  ```

### 2.4 Git Operations

- All work was done on branch `feature/landing-page-improvements`.
- At the end of the session, `main` was hard-reset to match `feature/landing-page-improvements` and force-pushed to GitHub.
- The repo was made **public** (previously private) to allow Vercel deployments without contributor access issues.
- Current HEAD on `main`: commit `a6035c6` — "fix: keep websocket alive on Speak Again, extend buffer to 5s, clear transcript onend"

---

## 3. Known Issues / Remaining Work

### 3.1 Voice Assistant Polish
- **Ghost "hello" on first open:** Chrome's Web Speech API sometimes hallucinates "hello" from the mic hardware pop when first initialized. The 1.5s VAD timer auto-submits it. A potential fix: ignore the first `isFinal` result if it's a single common greeting word and arrives within the first 500ms.
- **Live transcript should also show during `processing` status** so the user can see what they said while SAATHI is thinking.

### 3.2 SaaS Production Upgrade — Phase 2 (Not Started)
- Real-time WebSockets for live data updates (`socket.io`).
- Skeleton loaders (`react-loading-skeleton`) for better perceived performance.

### 3.3 Untracked Scratch Files in Repo Root
These are leftover debugging artifacts and can be safely deleted:
- `form_main.txt`
- `remote_modal.jsx`
- `temp_profile_main.jsx`

---

## 4. Tech Stack Reference

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite 5, TailwindCSS, Heroicons |
| Backend | Python 3.11+, FastAPI, Uvicorn |
| AI Model | Google Gemini 3.1 Flash Lite (via `google-genai` SDK) |
| TTS | Sarvam AI API |
| STT | Browser Web Speech API (Chrome `webkitSpeechRecognition`) |
| Database | MongoDB (via Motor async driver) |
| Frontend Hosting | Vercel |
| Backend Hosting | Render (free tier) |
| PWA | vite-plugin-pwa (Workbox) |

---

## 5. Important Constraints

1. **Render Free Tier:** Backend sleeps after 15 min of inactivity. First request after sleep takes ~30-60s to cold-start.
2. **Gemini Free Tier:** 500 requests/day limit with `gemini-3.1-flash-lite`.
3. **Chrome Only for Voice:** The Web Speech API (`webkitSpeechRecognition`) only works reliably in Google Chrome. Firefox/Safari will show a "not supported" message.
4. **No `recognition.start()` in async callbacks:** Chrome silently blocks mic access if `start()` is called outside a synchronous user gesture handler or the initial render effect.
5. **Do NOT use `setStatus('ended')` in React `useEffect` cleanup:** It poisons `statusRef` and instantly aborts the subsequent WebSocket connection when effects re-run.
