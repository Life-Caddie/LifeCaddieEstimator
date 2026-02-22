# Life Caddie - Space Clarity Tool

## Project Overview
The Life Caddie Space Clarity Tool is a mobile-first, AI-powered web application 
that helps individuals reduce overwhelm and make confident decisions about their 
living spaces during life transitions (moving, downsizing, caregiving, resetting).

Users upload a photo of a space and answer two questions — their intention and how 
the space makes them feel. The system generates a calm, non-judgmental "Clarity Plan" 
delivered in a conversational format focused on decision support, emotional readiness, 
and small achievable first steps.

**This is not an organizing app — it is a digital front door to life-transition support.**

## Architecture
- Mobile-optimized web app embedded in LifeCaddie.org
- Separate backend API handles all AI processing
- No AI credentials are exposed to the browser
- Short-lived session tokens mitigate automated abuse
- Initial usage is free and anonymous (lead generation)
- Future paid tiers: deeper planning, saved plans, human support services

## Tech Stack
- Frontend: Mobile-first web (embedded in LifeCaddie.org)
- Backend: Python, Node.js
- Database: Supabase (PostgreSQL)
- AI: Claude API (image + text processing)

## Database Schema
- See `schema.md` for a structured overview of tables, columns, types, 
  and relationships
- See `supabase/migrations/` for the original SQL migration scripts — these 
  contain full detail including indexes, constraints, and RLS policies

## Authentication & Security
- Anonymous access is the default entry point (no login required for free tier)
- Supabase Auth is used for authenticated users (future paid tiers)
- Anonymous users transition to authenticated accounts as they upgrade
- Session tokens are short-lived and validated server-side
- Images are handled safely and not permanently stored unless explicitly saved
- RLS policies must support both anonymous and authenticated access patterns
- Sensitive data (PII, session data) should be treated with extra care
- Never expose Supabase service role keys to the browser — backend API only

## File Storage
- User-uploaded space photos are stored in Azure Blob Storage (not Supabase Storage)
- No AI credentials or Azure storage keys should ever be exposed to the browser
- All file upload/retrieval operations go through the backend API
- Images should not be permanently stored unless the user explicitly saves their plan

## Key Business Context
- Primary goal of current phase: lead generation and trust building
- Clarity Plans are the core deliverable — tone should always be calm, 
  non-judgmental, and emotionally aware
- Data collected informs future service offerings and content strategy
- Future monetization: saved plans, deeper planning tools, human support upsells

## Development Notes
- Always use the Supabase client library for DB interactions where possible
- Follow Supabase best practices for RLS policies
- Anonymous sessions are a first-class use case — do not assume authenticated users
- Mobile-first is a hard requirement for all UI decisions
- AI prompts and responses should reflect the emotional tone of the product — 
  calm, supportive, non-judgmental
- Use async/await for all asynchronous operations (no callbacks or raw promises)
- Use camelCase for all variable, function, and property naming conventions