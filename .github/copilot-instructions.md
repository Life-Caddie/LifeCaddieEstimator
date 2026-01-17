# Copilot / AI Agent Instructions

This file contains concise, actionable guidance for AI coding agents working in this repository.

Product & Business Summary
- The Life Caddie Space Clarity Tool is a mobile-first, AI-powered experience that helps users reduce overwhelm during life transitions (moving, downsizing, caregiving, resetting).
- UX: users upload a photo and answer two quick questions (intention + feeling). The app returns a calm, non-judgmental Clarity Plan focused on decision support and small first steps rather than aesthetics.
- Architecture: web UI embedded in LifeCaddie.org; AI processing on a separate backend API so no AI credentials are exposed to the browser. Images are handled in memory, and short-lived session tokens plus validation mitigate automated abuse.
- Strategic purpose: free, anonymous entry to build trust and surface leads; future paid upgrades may include saved plans, deeper planning, and human services.


Summary
- Tech stack: Next.js (App Router) frontend in `src/app`, serverless API routes under `src/app/api`, and an experimental Python estimator in `ExperimentalEstimator`.
- Primary flow: client (`SpaceClarityTool.tsx`) uploads an image → requests a short-lived session token (`/api/session`) → posts to `/api/analyze` or `/api/conversation` with `Authorization: Bearer <token>`.

Key files and why they matter
- `src/app/SpaceClarityTool.tsx`: main client UI and the source of client-side behavior (file upload, session token retrieval, calls to `/api/analyze` and `/api/conversation`). Use this to understand UX constraints (5MB upload limit, expected JSON shape, allowed intention/feeling values).
- `src/app/api/session/route.ts`: creates short-lived JWTs (10 minutes). Tokens embed `uaHash` and `originHash`; tests/emulation must set `User-Agent` and `Origin` consistently.
- `src/app/api/analyze/route.ts`: converts uploaded image to a base64 data URL and calls the OpenAI Responses API. Expects the model to return STRICT JSON with `messages` and `quick_actions` arrays. Enforces: image MIME check and <= 5,000,000 bytes.
- `src/app/api/conversation/route.ts`: continues a chat based on `chat_history` (array of {who,text}). Similar security/session checks as `analyze`.
- `ExperimentalEstimator/estimator.py` and `ExperimentalEstimator/context.md`: Python-side experiment using OpenAI Python client (note it uses `OPENAI_API_KEY` and `gpt-5` in code). Useful for reference if extending server-side vision/estimation logic.
- `package.json`: frontend scripts: `npm run dev`, `npm run build`, `npm start`.

Environment & secrets
- Frontend/server JS env: `API_KEY` (OpenAI key) and `LC_SESSION_JWT_SECRET` (must be >= 32 chars). See `src/app/api/*` routes for required names and minimum lengths.
- Python experiments use `OPENAI_API_KEY` (see `ExperimentalEstimator/estimator.py`). Be aware both names may be present.
- Local dev: drop secrets into `.env.local` at repo root (do not commit).

Runtime expectations & patterns
- API routes run under `runtime = "nodejs"` and use the `openai` JS client. Models default to `process.env.OPENAI_MODEL || "gpt-4.1-mini"`.
- All model prompts in `analyze` and `conversation` explicitly instruct the model to return STRICT JSON. The server uses a robust `safeJsonParse()` helper (it attempts to slice the first/last brace pair) — prefer returning valid JSON only.
- Session verification: `verifySession()` performs JWT verification and checks hashed `User-Agent` and `Origin`. When writing tests or curl/fetch calls, retrieve `/api/session` first and include that token in `Authorization` header.
- Photo handling: the server converts the uploaded `File` into a base64 `data:<mime>;base64,<...>` string before sending to the model. Keep the 5MB limit in mind for mobile uploads.

Developer workflows & commands
- Install & run frontend locally:
  - `npm install`
  - `npm run dev` (runs Next dev server on port 3000)
- Python experiment (optional):
  - `python -m venv venv`
  - Activate venv and `pip install -r requirements.txt`
  - Run `python ExperimentalEstimator/estimator.py` (ensure `OPENAI_API_KEY` set)
- Env setup example (.env.local):
  - `API_KEY=sk_xxx`
  - `LC_SESSION_JWT_SECRET=<>=32+ chars`
  - `OPENAI_MODEL=gpt-4.1-mini` (optional)

Project-specific conventions and gotchas
- Strict JSON outputs: both `analyze` and `conversation` expect the model to reply with JSON like `{ "messages": [...], "quick_actions": [...] }`. If you update prompts, preserve the requirement and update `safeJsonParse()` only if necessary.
- Allowed enums: `analyze` validates `intention` and `feeling` against fixed arrays. See `isAllowedIntention()` and `isAllowedFeeling()` in `src/app/api/analyze/route.ts` — do not change values client/server mismatch will break validation.
- Session JWT contents: tokens include `uaHash` and optional `originHash`. When debugging auth failures, compare the user-agent and origin used to sign vs verify.
- CORS: `ALLOWED_ORIGINS` is a small allowlist. Local dev origin (`http://localhost:3000`) is included; when deploying, update as needed.

Testing tips for AI agents
- When adjusting prompts or expected JSON fields, include unit-style checks that the server can recover (server has fallback messages if parsing fails).
- Simulate the full client flow during tests: call `GET /api/session` → use returned token → `POST /api/analyze` with a small test image under 5MB and the `photo`, `intention`, `feeling`, and `chat_history` form fields.
- To debug model output, log `resp.output_text` from the Responses API before parsing.

If you need more detail
- Ask for clarification about any specific file or workflow (I can add examples or tests).

---
This file was generated/updated to help AI coding agents get productive quickly. Please review and tell me if any detail is missing or incorrect.
