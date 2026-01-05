# Life Caddie Estimator App

An early-stage AI project focused on building a fully-functioning **image-recognition application** capable of generating **organizing estimates** from photos of cluttered rooms. The long-term goal is to use computer vision and AI reasoning to help users quickly evaluate how much time, effort, or professional assistance may be needed to organize a space.

Planned future capabilities:

* Accepting image inputs (JPEG/PNG) --added spaceClarityTool
  -Need to decide on file storade/retention method.
* Detecting clutter types, objects, and layout information
* Estimating organization effort, time, and resource requirements
* Exporting structured summaries or reports
* Providing optional visual overlays or heatmaps for clutter

## 📁 Project Structure (current)

```
LifeCaddieEstimator/
├── ExperimentalEstimator # Experimental Python estimator script
├── .gitignore
├── next-env.d.ts         # Next.js env build
├── next.config.mjs       # Next.js configuration
├── package-lock.json     # Exact installed JS deps
├── package.json          # Frontend deps, scripts
├── README.md             # Project documentation (this file)
├── requirements.txt      # Python dependencies
├── tsconfig.json         # TypeScript config for frontend
└── src/app/
	├── api/
	│   ├── analyze/route.ts   # Server API: receives uploads, calls
	│   └── session/route.ts   # Server API: issues short-lived OpenAI 
	├── layout.tsx             # App layout for Next.js
	├── page.tsx               # Root page
	└── SpaceClarityTool.tsx   # Client UI: upload, intention/feeling inputs
```
## Requirements

* Python 3.12+ for any Python components
* Node.js (LTS, v18+ recommended) and `npm` for the Next.js frontend
* OpenAI API key

## Getting started

1. Clone the repository:

```bash
git clone <REPOSITORY_URL>
cd <REPOSITORY_NAME>
```

2. Python (optional): install Python deps if you plan to use `estimator.py`:

```bash
python -m venv venv
# Windows: venv\Scripts\activate
# macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
```

3. Frontend (Next.js): install and run the dev server

```powershell
npm install
npm run dev
```

The app runs at http://localhost:3000 by default.

## Environment variables

Create a `.env` (do not commit) with at least:

- `API_KEY` — your OpenAI API key (required)
- `LC_SESSION_JWT_SECRET` — 32+ character secret used to sign session tokens (required for `/api/session`/upload)
- `OPENAI_MODEL` — optional model override (defaults to `gpt-4.1-mini` in code)

## Uploads

- Currently, uploaded photos are processed in memory and converted to a base64 data URL; they are NOT written to disk or persisted by default.
