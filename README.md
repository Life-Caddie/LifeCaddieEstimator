# Life Caddie Estimator App

An AI-powered application designed to help users evaluate their organizing needs by analyzing photos of their spaces. The app uses computer vision and conversational AI to align users with specific Life Caddie service offerings, then guides them to schedule a consultation.

## Core Features

* **Space Clarity Tool** — Interactive UI for uploading images and capturing user goals/feelings
* **Image Analysis** — AI-powered image recognition to assess spaces and validate user emotions
* **Service Alignment** — Conversational flow that narrows down which Life Caddie services best fit the user's needs
* **Calendly Scheduling** — All recommended service pill buttons open Calendly to book a consultation
* **Session Management** — Secure JWT-based session handling for API requests
* **Authentication** — Google OAuth via Supabase
* **Azure Storage** — Optional photo upload to Azure Blob Storage

## Conversation Flow

1. **Upload + Context**: User uploads a photo, selects a goal, and picks a feeling
2. **First Response**: Bot validates feelings, acknowledges the photo, and asks ONE clarifying question to align toward services
3. **Service Confirmation**: After the user answers, bot recommends 2-3 matching Life Caddie services with pill buttons (each opens Calendly)
4. **Refinement**: Further conversation narrows recommendations to 1-2 services; pill buttons continue targeting Calendly

## Project Structure

```
LifeCaddieEstimator/
├── ExperimentalEstimator/        # Experimental Python estimator module
│   └── context.md                # LLM context for experimental estimator
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── toolkit.ts              # Shared API utilities: CORS, JWT, services list, JSON parsing
│   │   │   ├── analyze/route.ts        # POST /api/analyze — image analysis endpoint
│   │   │   ├── conversation/
│   │   │   │   ├── route.ts            # POST /api/conversation — conversation endpoint (JSON body)
│   │   │   │   └── toneBuilder.ts      # Prompt builder for conversation stages
│   │   │   └── session/route.ts        # GET /api/session — session token generation
│   │   ├── auth/callback/page.tsx      # OAuth callback handler
│   │   ├── layout.tsx                  # Next.js root layout
│   │   ├── page.tsx                    # Home page
│   │   └── SpaceClarityTool.tsx        # Orchestrator — state management, renders IntakeForm or ChatView
│   ├── components/
│   │   ├── IntakeForm.tsx              # Photo upload form with goal/feeling selects
│   │   ├── ChatView.tsx                # Chat log, pill buttons, and message input bar
│   │   ├── CalendarButton.tsx          # Calendly popup button component
│   │   └── auth/
│   │       ├── GoogleSignInButton.tsx  # Google OAuth sign-in button
│   │       └── UserMenu.tsx            # Authenticated user menu
│   ├── constants/
│   │   └── intake.ts                   # Shared GOALS, FEELINGS, allowed values, welcome message
│   ├── hooks/
│   │   └── useAuthEmail.ts             # Shared hook for tracking Supabase auth email state
│   ├── lib/
│   │   ├── api.ts                      # Client-side API functions: getSessionToken, analyzeSpace, sendConversation
│   │   ├── azureStorage.ts             # Azure Blob Storage upload helper
│   │   └── supabase/
│   │       └── browser.ts              # Browser-side Supabase client
│   ├── styles/
│   │   ├── SpaceClarityTool.css        # Main UI styles
│   │   ├── GoogleSignInButton.css      # Sign-in button styles
│   │   └── UserMenu.css               # User menu styles
│   └── types/
│       └── react-input.d.ts            # Type declaration for input capture attribute
├── .gitignore
├── next.config.mjs
├── package.json
├── README.md
├── requirements.txt
└── tsconfig.json
```

## Technology Stack

* **Frontend**: Next.js, React, TypeScript
* **Backend**: Next.js API Routes
* **Authentication**: Supabase (Google OAuth) + JWT session tokens (jose)
* **AI Integration**: OpenAI API (gpt-4.1-mini with vision)
* **Scheduling**: Calendly (react-calendly)
* **Storage**: Azure Blob Storage (optional)
* **Python**: Optional experimental estimator module

## Requirements

* **Node.js**: v18+ (LTS recommended)
* **npm**: Included with Node.js
* **OpenAI API Key**: Required for AI functionality
* **Supabase Project**: Required for Google OAuth authentication
* **Python 3.12+** (optional): Only needed for experimental Python estimator

## Getting Started

### 1. Clone the Repository

```bash
git clone <REPOSITORY_URL>
cd LifeCaddieEstimator
```

### 2. Install Frontend Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env.local` file in the project root (do not commit):

```env
OPENAI_API_KEY=your_openai_api_key_here
LC_SESSION_JWT_SECRET=your_32_character_secret_key_here
OPENAI_MODEL=gpt-4.1-mini

NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional: Azure Blob Storage for photo persistence
AZURE_STORAGE_CONTAINER_IMAGES=your_container_name
AZURE_STORAGE_CONNECTION_STRING=your_connection_string
```

**Required variables:**
- `OPENAI_API_KEY` — Your OpenAI API key for image analysis and conversation
- `LC_SESSION_JWT_SECRET` — 32+ character secret for signing JWT session tokens
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anonymous key

**Optional variables:**
- `OPENAI_MODEL` — Override the default model (defaults to `gpt-4.1-mini`)
- `AZURE_STORAGE_CONTAINER_IMAGES` — Azure container name for photo uploads
- `AZURE_STORAGE_CONNECTION_STRING` — Azure connection string

### 4. Run the Development Server

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000)

### 5. Python Setup (Optional)

If you want to work with the experimental Python estimator:

```bash
python -m venv venv
# Windows: venv\Scripts\activate
# macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
```

## API Endpoints

| Endpoint | Method | Body Format | Purpose |
|----------|--------|-------------|---------|
| `/api/session` | GET | — | Generate a JWT session token |
| `/api/analyze` | POST | FormData | Submit image + goal/feeling, receive validation and clarifying question |
| `/api/conversation` | POST | JSON | Continue conversation to align and refine service recommendations |

All API endpoints support CORS for the following origins:
- `http://localhost:3000` (development)
- `https://lifecaddie.org` (production)
- `https://www.lifecaddie.org` (production)

## Key Architecture Details

### Component Structure
- **`SpaceClarityTool`** — Orchestrator component that manages all state and renders either `IntakeForm` or `ChatView`
- **`IntakeForm`** — Handles photo upload, goal/feeling selection, honeypot, and form submission
- **`ChatView`** — Renders the chat log, pill buttons (conversational or Calendly), and the message input bar
- **`CalendarButton`** — Wraps react-calendly's `PopupModal` for scheduling

### Shared Modules
- **`constants/intake.ts`** — Single source of truth for goals, feelings, and allowed values (used by both client and server)
- **`hooks/useAuthEmail.ts`** — Shared hook for Supabase auth state (used by `SpaceClarityTool` and `UserMenu`)
- **`lib/api.ts`** — Client-side API layer with typed request/response functions and the shared `ChatMessage` type
- **`api/toolkit.ts`** — Server-side shared utilities: CORS headers, JWT verification, services list, safe JSON parsing

### Services List
The 29 Life Caddie services are defined once in `src/app/api/toolkit.ts` as `SERVICES_LIST` and imported by both the analyze and conversation routes.

### Prompt Stages (toneBuilder.ts)
- **Initial**: Asks clarifying questions with quick-answer pill buttons
- **Service Confirmation**: Recommends 2-3 services with exact service names as pills (all open Calendly)
- **Refinement**: Narrows to 1-2 services based on continued conversation

### Pill Button Behavior
- Before `context_gathered` is true: pills are conversational answer options that continue the chat
- After `context_gathered` is true: pills display service names and each opens the Calendly scheduling modal

## Data Handling

- **Image uploads** are processed in-memory and converted to base64 data URLs
- Images are optionally persisted to Azure Blob Storage if configured
- All API requests require a valid JWT session token
- Session tokens are short-lived (10 minutes) and issued via `/api/session`

## Building for Production

```bash
npm run build
npm start
```

The app will run on port 3000 (configurable via environment).

## License

See LICENSE file for details.
