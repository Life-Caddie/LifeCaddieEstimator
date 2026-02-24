# Life Caddie — Space Clarity Tool

An AI-powered, mobile-first web application that helps individuals reduce overwhelm and make confident decisions about their living spaces during life transitions. Users upload a photo of a space, select their goal and emotional state, and receive a personalized "Clarity Plan" delivered through a conversational interface — ultimately guiding them to schedule a Life Caddie consultation.

**This is not an organizing app — it is a digital front door to life-transition support.**

---

## Conversation Flow

1. **Intake**: User uploads a photo, selects a goal (moving, downsizing, reset, staging, caregiving, other), and picks a feeling (overwhelmed, excited, sad, motivated, other)
2. **Space Analysis**: AI validates feelings, acknowledges what it sees in the photo, and asks ONE clarifying question to align toward services
3. **Context Gathering**: User answers via pill buttons or free text; AI may ask one follow-up question
4. **Service Confirmation**: AI recommends 2–3 matching Life Caddie services with explanation; pill buttons now represent service names
5. **Refinement** *(optional)*: Continued conversation narrows to 1–2 best-fit services
6. **Scheduling**: User taps a service pill → Google sign-in (if not authenticated) → Calendly consultation booking
7. **Post-Booking**: After closing Calendly, the AI suggests one simple, specific action to prepare for the consultation and links to the full services catalog at LifeCaddie.org

---

## Project Structure

```
LifeCaddieEstimator/
├── docs/
│   └── azure-blob.md                       # Azure Blob Storage setup guide
├── scripts/
│   └── test_analyze_upload.js              # Manual test script for /api/analyze
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── toolkit.ts                  # Shared: CORS, JWT verify, services list, JSON parse
│   │   │   ├── analyze/
│   │   │   │   └── route.ts                # POST /api/analyze — image analysis + lead creation
│   │   │   ├── conversation/
│   │   │   │   ├── route.ts                # POST /api/conversation — chat continuation
│   │   │   │   └── toneBuilder.ts          # Prompt builders for each conversation stage
│   │   │   ├── session/
│   │   │   │   └── route.ts                # GET /api/session — JWT session token
│   │   │   └── transcript/
│   │   │       └── route.ts                # POST /api/transcript — save transcript to Azure
│   │   ├── auth/
│   │   │   └── callback/
│   │   │       └── page.tsx                # Google OAuth callback handler
│   │   ├── layout.tsx                      # Root HTML layout
│   │   ├── page.tsx                        # Home page entry point
│   │   └── SpaceClarityTool.tsx            # Orchestrator — all state, renders IntakeForm or ChatView
│   ├── components/
│   │   ├── IntakeForm.tsx                  # Photo upload + goal/feeling form
│   │   ├── ChatView.tsx                    # Chat log, pill buttons, message input
│   │   ├── CalendarButton.tsx              # Calendly popup wrapper
│   │   └── auth/
│   │       ├── AuthModal.tsx               # Sign-in modal (shown before Calendly if not authenticated)
│   │       ├── GoogleSignInButton.tsx      # Google OAuth sign-in button
│   │       └── UserMenu.tsx                # Authenticated user email + logout
│   ├── constants/
│   │   └── intake.ts                       # GOALS, FEELINGS, allowed values, welcome message
│   ├── hooks/
│   │   ├── useAuthEmail.ts                 # Track Supabase auth user email
│   │   └── useClientToken.ts               # Generate/persist client device UUID token
│   ├── lib/
│   │   ├── api.ts                          # Client API functions + ChatMessage type
│   │   ├── azureStorage.ts                 # Azure Blob Storage upload helper
│   │   ├── conversationStorage.ts          # localStorage: save/restore conversation state across auth redirect
│   │   └── supabase/
│   │       ├── browser.ts                  # Supabase client (browser-side)
│   │       └── server.ts                   # Supabase client (server-side, uses service role key)
│   ├── styles/
│   │   ├── SpaceClarityTool.css
│   │   ├── GoogleSignInButton.css
│   │   ├── UserMenu.css
│   │   └── AuthModal.css
│   └── types/
│       └── react-input.d.ts                # Type declaration for input capture attribute
├── supabase/
│   └── migrations/
│       └── core_db_and_schema_build.sql    # Full DB schema (tables, indexes, RLS policies)
├── ExperimentalEstimator/                  # Experimental Python estimator module
├── CLAUDE.md                               # Project instructions for Claude Code
├── schema.md                               # Human-readable DB schema reference
├── next.config.mjs
├── package.json
├── requirements.txt                        # Python dependencies (experimental module only)
└── tsconfig.json
```

---

## Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js | ^16.1.6 |
| UI | React + TypeScript | 18.2.0 / 5.9.3 |
| Database + Auth | Supabase (PostgreSQL) | ^2.90.1 |
| AI | OpenAI API (GPT-4.1-mini with vision) | ^4.0.0 |
| File Storage | Azure Blob Storage | ^12.29.1 |
| Azure Auth | @azure/identity | ^4.13.0 |
| JWT | jose | ^5.9.0 |
| Scheduling | react-calendly | ^4.4.0 |
| Data Fetching | swr | ^2.4.0 |

---

## Environment Variables

Create a `.env.local` file in the project root (never commit this file).

### Required

```env
OPENAI_API_KEY=your_openai_api_key
LC_SESSION_JWT_SECRET=your_32_plus_character_secret
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### Optional — AI Model

```env
OPENAI_MODEL=gpt-4.1-mini   # Default; override with any compatible model
```

### Optional — Azure Blob Storage

Photos and transcripts are stored in Azure if these are configured. Without them the app still works; files are processed in-memory only.

Choose one authentication method:

```env
# Option 1: Connection string (simplest)
AZURE_STORAGE_CONNECTION_STRING=your_connection_string

# Option 2: Account name + key
AZURE_STORAGE_ACCOUNT_NAME=your_account_name
AZURE_STORAGE_ACCOUNT_KEY=your_account_key

# Option 3: Azure AD (DefaultAzureCredential)
AZURE_STORAGE_ACCOUNT_NAME=your_account_name
AZURE_CLIENT_ID=your_client_id
AZURE_TENANT_ID=your_tenant_id
AZURE_CLIENT_SECRET=your_client_secret
```

Container names:

```env
AZURE_STORAGE_CONTAINER_IMAGES=your_images_container
AZURE_STORAGE_CONTAINER_TRANSCRIPTS=your_transcripts_container
```

See `docs/azure-blob.md` for full setup details and authentication precedence.

---

## Getting Started

### 1. Clone and install

```bash
git clone <REPOSITORY_URL>
cd LifeCaddieEstimator
npm install
```

### 2. Configure environment variables

Create `.env.local` with the variables listed above.

### 3. Run the development server

```bash
npm run dev
```

The app runs at [http://localhost:3000](http://localhost:3000).

### 4. Build for production

```bash
npm run build
npm start
```

### 5. Python (optional)

Only needed for the experimental Python estimator module:

```bash
python -m venv venv
# Windows: venv\Scripts\activate  |  macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
```

---

## API Endpoints

| Endpoint | Method | Format | Purpose |
|----------|--------|--------|---------|
| `/api/session` | GET | — | Issue a short-lived JWT session token (10 min) |
| `/api/analyze` | POST | FormData | Submit photo + goal/feeling; receive Clarity Plan and follow-up question |
| `/api/conversation` | POST | JSON | Continue conversation; receive next messages and pill options |
| `/api/transcript` | POST | JSON | Save full chat history to Azure Blob Storage |

All endpoints enforce CORS for:
- `http://localhost:3000` (development)
- `https://lifecaddie.org`
- `https://www.lifecaddie.org`

All endpoints (except OPTIONS preflight) require a valid `Authorization: Bearer <token>` header using a session token from `/api/session`.

---

## Architecture Details

### SpaceClarityTool — State Orchestrator

`SpaceClarityTool.tsx` owns all application state and coordinates the full user journey:

- Renders `IntakeForm` (pre-submission) or `ChatView` (post-submission)
- Manages: `messages`, `pills`, `contextGathered`, `busy`, `leadId`, `sessionId`, `calendlyOpen`, `showAuthModal`
- On Calendly close, automatically triggers a post-booking AI message with a personalized preparation tip
- On auth return (`?calendly=1`), restores full conversation state from `localStorage` and auto-opens Calendly

### IntakeForm

- Photo upload (image files only, 5 MB max) with client-side size warning
- Goal dropdown: Moving, Prepping to Downsize, Reset, Staging, Caregiving, Other
- Feeling dropdown: Overwhelmed, Excited, Sad, Motivated, Other (Mixed)
- Honeypot field for bot prevention

### ChatView

- Auto-scrolling chat log rendering bot and user messages
- `renderText()` helper: converts `\n` to line breaks and `[label](url)` markdown to clickable `<a>` links
- Pill buttons: conversational answer options before `context_gathered`; service names (opening Calendly) after
- Chat input bar for free-text responses
- Connection status badge: Ready / Working… / Check connection

### Prompt Stages (toneBuilder.ts)

| Stage | Trigger | AI Output |
|-------|---------|-----------|
| **Initial** | `userMessageCount < 2` | Validates feelings + asks ONE clarifying question; quick_actions are short answer options |
| **Service Confirmation** | `userMessageCount >= 2` | Bullet-formatted list of 2–3 matching services with reasons; quick_actions are exact service names |
| **Refinement** | `contextGathered === true` | Narrows to 1–2 best-fit services; quick_actions remain service names |
| **Post-Calendly** | `isPostCalendly === true` | Congratulates booking + one specific prep action + link to services catalog |

Chat response rules enforced by prompts:
- Max 2 sentences per message bubble
- No padding phrases or long preambles
- Questions with "or" split at `, or ` with a blank line between clauses (also enforced server-side via regex)
- Service listings formatted as bullet points: `• Life Caddie's [Name] – [one-sentence reason]`

### Authentication + Calendly Flow

1. User taps a service pill (after `contextGathered = true`)
2. If not signed in → `AuthModal` with Google sign-in button
3. `saveConversationForAuth()` persists full conversation state to `localStorage` before OAuth redirect
4. After Google OAuth, `/auth/callback` redirects to `/?calendly=1`
5. `SpaceClarityTool` detects `?calendly=1`, restores conversation from `localStorage`, and auto-opens Calendly
6. On Calendly close, `handleCalendlyClose()` fires the post-booking AI prompt

### Conversation State Persistence

`conversationStorage.ts` manages `localStorage` keys for the auth redirect round-trip:
- `lc_conversation_state` — Full snapshot: messages, pills, contextGathered, leadId, sessionId
- `lc_calendly_pending` — Flag to trigger Calendly auto-open after auth
- `lc_client_token` — Persistent device UUID for returning user identification

### Azure Blob Storage

`azureStorage.ts` exports a single `uploadBlob(containerName, blobName, data, contentType)` function. Auth method is resolved at runtime in priority order: connection string → account key → Azure AD (`DefaultAzureCredential`).

Two containers are used:
- **Images**: Uploaded room photos from the intake form
- **Transcripts**: JSON conversation transcripts (saved on pill selection and after booking)

---

## Database Schema

14 tables in Supabase PostgreSQL. See `schema.md` for full column-level detail and `supabase/migrations/core_db_and_schema_build.sql` for DDL with indexes and RLS policies.

| Table | Purpose |
|-------|---------|
| `lead_sessions` | Anonymous device session — entry point for all users |
| `leads` | One record per tool interaction; captures intake data and AI plan summary |
| `ai_artifacts` | Versioned AI-generated Clarity Plans; linked to leads |
| `files` | Records for all uploaded images and transcript JSON blobs |
| `customers` | Converted leads with contact information |
| `jobs` | Work orders linking customers to services |
| `homes` | Property records associated with customers |
| `rooms` | Individual spaces within a home |
| `object_items` | Physical items identified in space photos |
| `engagements` | Service bookings |
| `estimates` | Cost estimates for service work |
| `estimate_line_items` | Line items within estimates |
| `job_transcript` | Chat transcripts linked to jobs |
| `service_catalog` | Available Life Caddie services |

**Key relationship chain:**
`lead_sessions` → `leads` → `customers` → `jobs` → `homes` → `rooms`

RLS policies support both anonymous and authenticated access patterns.

---

## Life Caddie Services

29 services are defined in `src/app/api/toolkit.ts` (`SERVICES_LIST`) and injected into every AI prompt. The AI selects from this list when making recommendations; pill button labels must match exact service names.

**Categories:**
- Assessments (in-home, virtual, automated)
- Roadmaps and action plans
- Documentation and paper organization
- Hands-on physical organizing and decluttering
- Coaching (phone, real-time, side-by-side)
- Emotional support and family mediation
- Move-related services (pre-move sorting, staging, post-move setup)

---

## Security

| Concern | Implementation |
|---------|---------------|
| Session abuse | Short-lived JWT tokens (10 min), user-agent + origin hash validation |
| CORS | Restricted to `localhost:3000`, `lifecaddie.org`, `www.lifecaddie.org` |
| Service role key | Never exposed to browser; only used in server-side Supabase client |
| Photo size | 5 MB enforced client and server-side |
| Input validation | Goal and feeling values validated against allowlists before processing |
| Spam prevention | Honeypot field on intake form |
| RLS | Row-Level Security policies on all Supabase tables |
| Azure credentials | Never exposed to browser; all storage operations server-side only |

---

## Data Flow

```
IntakeForm submit
  → GET /api/session  →  JWT token
  → POST /api/analyze (FormData + JWT)
      ↳ Validate inputs
      ↳ Upload photo → Azure Blob Storage (images container)
      ↳ OpenAI vision: analyze space, validate feelings, ask clarifying question
      ↳ Upsert lead_session, insert lead, insert files record → Supabase
      ↳ Return: task, follow_up_question, leadId, sessionId

ChatView: user answers via pill or text
  → POST /api/conversation (JSON + JWT)
      ↳ toneBuilder selects prompt stage
      ↳ OpenAI: generate messages + quick_actions
      ↳ Post-process: split ", or " questions, parse markdown links
      ↳ On pill selection: insert ai_artifact, update lead summary → Supabase
      ↳ Return: messages[], quick_actions[], context_gathered

context_gathered = true: service pills shown
  → User taps pill
      ↳ Not signed in? → AuthModal → Google OAuth → /auth/callback → /?calendly=1
      ↳ Signed in? → Calendly PopupModal opens directly

Calendly closed
  → POST /api/conversation (isPostCalendly=true)
      ↳ OpenAI: personalized prep tip + services link
      ↳ Return: 3 messages (congratulations, action, LifeCaddie.org link)
```

---

## License

See LICENSE file for details.
