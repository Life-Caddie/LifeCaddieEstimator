# Life Caddie Estimator App

An AI-powered application designed to help users quickly evaluate organization efforts by analyzing photos of cluttered rooms. The application uses computer vision and AI reasoning to provide personalized organization estimates based on images, user goals, and emotional context.

## Core Features

* **Space Clarity Tool** — Interactive UI for uploading images and capturing user goals/feelings
* **Image Analysis** — AI-powered image recognition to assess clutter types and space layout
* **Organization Estimates** — Generates time, effort, and resource requirement assessments
* **Session Management** — Secure JWT-based session handling for API requests
* **Conversation Flow** — Multi-turn conversation interface for refined estimates
* **CORS Support** — Cross-origin request handling for web integration

## Project Structure

```
LifeCaddieEstimator/
├── ExperimentalEstimator/     # Experimental Python estimator module
├── src/
│   └── app/
│       ├── api/
│       │   ├── toolkit.ts              # Shared API utilities
│       │   ├── analyze/route.ts        # POST /api/analyze - Image analysis endpoint
│       │   ├── conversation/route.ts   # POST /api/conversation - Conversation endpoint
│       │   └── session/route.ts        # POST /api/session - Session token generation
│       ├── layout.tsx                  # Next.js root layout
│       ├── page.tsx                    # Home page
│       └── SpaceClarityTool.tsx        # Main client component (image upload, UI)
├── .gitignore                 # Git ignore rules
├── next-env.d.ts              # Next.js TypeScript definitions
├── next.config.mjs            # Next.js configuration
├── package.json               # Node.js dependencies and scripts
├── package-lock.json          # Locked dependency versions
├── README.md                  # Project documentation
├── requirements.txt           # Python dependencies
└── tsconfig.json              # TypeScript configuration
```
## Technology Stack

* **Frontend**: Next.js 14, React 18, TypeScript
* **Backend**: Next.js API Routes
* **Authentication**: JWT (JSON Web Tokens) via jose
* **AI Integration**: OpenAI API
* **Python**: Optional experimental estimator module
* **Build**: TypeScript, ESM modules

## Requirements

* **Node.js**: v18+ (LTS recommended)
* **npm**: Included with Node.js
* **OpenAI API Key**: Required for AI functionality
* **Python 3.12+** (optional): Only needed for experimental Python estimator

## 🚀 Getting Started

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
OPENAI_MODEL=gpt-4-mini
```

**Required variables:**
- `OPENAI_API_KEY` — Your OpenAI API key for image analysis and conversation
- `LC_SESSION_JWT_SECRET` — 32+ character secret for signing JWT session tokens

**Optional variables:**
- `OPENAI_MODEL` — Override the default model (defaults to `gpt-4-mini`)

### 4. Run the Development Server

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000)

### 5. Python Setup (Optional)

If you want to work with the experimental Python estimator:

```bash
python -m venv venv
# Activate virtual environment:
# Windows: venv\Scripts\activate
# macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
```

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/session` | POST | Generate a JWT session token |
| `/api/analyze` | POST | Submit image and receive clutter analysis |
| `/api/conversation` | POST | Continue multi-turn conversation for refined estimates |

All API endpoints support CORS for the following origins:
- `http://localhost:3000` (development)
- `https://lifecaddie.org` (production)
- `https://www.lifecaddie.org` (production)

## Data Handling

- **Image uploads** are processed in-memory and converted to base64 data URLs
- Images are **not persisted** to disk by default
- All API requests require a valid JWT session token
- Session tokens are short-lived and issued via `/api/session`

## 🏗️ Building for Production

```bash
npm run build
npm start
```

The app will run on port 3000 (configurable via environment).

## Project Dependencies

### Frontend (Node.js)
- **next** (^14.2.0) — React framework
- **react** (^18.2.0) — UI library
- **react-dom** (^18.2.0) — React DOM rendering
- **openai** (^4.0.0) — OpenAI API client
- **jose** (^5.9.0) — JWT token handling
- **typescript** (5.9.3) — Type safety

### Python (Optional)
See `requirements.txt` for experimental estimator dependencies.

## Future Enhancements

* DB integration for user retention and company projects
* Export estimates as structured reports
* Integration with professional organizing services
* Advanced caching and session persistence
* Mobile app version

## 📄 License

See LICENSE file for details.
