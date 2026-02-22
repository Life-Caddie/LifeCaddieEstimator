-- ============================================================
-- Life Caddie Space Clarity Tool — Full Schema
-- Rebuilt for: anonymous session → lead → customer → job
--              → home → rooms → objects → estimates/services
-- ============================================================

-- Extensions
create extension if not exists pgcrypto;
create extension if not exists citext;


-- Extensions

-- ============================================================
-- UTILITY: updated_at trigger function (shared across tables)
-- ============================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ============================================================
-- 1. LEAD_SESSIONS
--    Anonymous device sessions. Created on first tool load.
--    Linked to a lead once the user completes the intake flow.
--    Client stores the client_token in localStorage.
-- ============================================================
create table if not exists public.lead_sessions (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  last_seen_at        timestamptz not null default now(),

  client_token        text unique not null,        -- short-lived token stored on device
  user_agent          text,
  ip_hash             text,                        -- hashed, never raw IP
  locale              text,
  timezone            text,

  consent_analytics   boolean not null default false,
  consent_marketing   boolean not null default false,

  metadata            jsonb not null default '{}'::jsonb
);

create index if not exists lead_sessions_last_seen_idx
  on public.lead_sessions(last_seen_at);

comment on table public.lead_sessions is
  'Anonymous browser/device session. Entry point before any user identity is known.';

-- ============================================================
-- 2. LEADS
--    One record per tool interaction. Captures the initial
--    photo, intake answers, and the AI-generated Clarity Plan.
--    A lead exists before a customer record is created.
--    Stage progression: new → contacted → qualified → converted → closed_lost
-- ============================================================
create table if not exists public.leads (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  -- identity (fills in as we learn more)
  lead_session_id     uuid references public.lead_sessions(id) on delete set null,
  customer_id         uuid,                        -- FK added after customers table is created

  -- lifecycle
  stage               text not null default 'new',
    -- new / contacted / qualified / converted / closed_lost

  -- intake answers (the two core tool questions)
  intake_intention    text,                        -- "What do you want to do with this space?"
  intake_feeling      text,                        -- "How does this space make you feel?"

  -- identity capture (progressive)
  email               citext,
  first_name          text,
  last_name           text,
  phone               text,

  -- AI Clarity Plan (summary reference; full artifact in ai_artifacts)
  clarity_plan_summary text,

  -- source tracking
  utm_source          text,
  utm_medium          text,
  utm_campaign        text,
  referrer_url        text,

  -- admin
  admin_notes         text,
  assigned_to         text,                        -- staff email or ID

  metadata            jsonb not null default '{}'::jsonb
);

create index if not exists leads_stage_idx        on public.leads(stage);
create index if not exists leads_customer_idx     on public.leads(customer_id);
create index if not exists leads_session_idx      on public.leads(lead_session_id);
create index if not exists leads_email_idx        on public.leads(email);

drop trigger if exists trg_leads_updated_at on public.leads;
create trigger trg_leads_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

comment on table public.leads is
  'One record per tool interaction / intake session. Exists before a customer is identified.';

-- ============================================================
-- 3. CUSTOMERS
--    Created at email capture. Can link back to originating
--    lead and session. One customer can have many leads, jobs,
--    and homes over their lifetime.
--    Stage: identified → qualified → active → inactive
-- ============================================================
create table if not exists public.customers (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  -- lifecycle
  stage               text not null default 'identified',
    -- identified / qualified / active / inactive

  -- identity
  email               citext unique,
  phone               text,
  first_name          text,
  last_name           text,
  full_name           text generated always as (
                        trim(coalesce(first_name, '') || ' ' || coalesce(last_name, ''))
                      ) stored,

  -- originating lead (first touch)
  originating_lead_id uuid references public.leads(id) on delete set null,

  -- preferences / profile
  preferred_contact   text,                        -- email / phone / text
  timezone            text,
  locale              text,

  admin_notes         text,
  assigned_to         text,

  metadata            jsonb not null default '{}'::jsonb
);

create index if not exists customers_stage_idx    on public.customers(stage);
create index if not exists customers_email_idx    on public.customers(email);

drop trigger if exists trg_customers_updated_at on public.customers;
create trigger trg_customers_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

-- Now that customers exists, add the FK on leads
alter table public.leads
  add constraint leads_customer_fk
  foreign key (customer_id) references public.customers(id) on delete set null;

comment on table public.customers is
  'Identified person. Created at email capture, linked to originating lead.';

-- ============================================================
-- 4. HOMES
--    A customer's property. One customer can have multiple
--    homes (e.g. primary, vacation, parent's home for caregiving).
-- ============================================================
create table if not exists public.homes (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  customer_id         uuid not null references public.customers(id) on delete cascade,

  nickname            text,                        -- "Mom's House", "Downtown Condo"
  home_type           text,                        -- primary / secondary / parent / rental
  approx_sqft         int,
  num_bedrooms        int,
  num_bathrooms       numeric(3,1),

  -- address
  address_line1       text,
  address_line2       text,
  city                text,
  region              text,
  postal_code         text,
  country             text not null default 'US',

  metadata            jsonb not null default '{}'::jsonb
);

create index if not exists homes_customer_idx on public.homes(customer_id);

drop trigger if exists trg_homes_updated_at on public.homes;
create trigger trg_homes_updated_at
  before update on public.homes
  for each row execute function public.set_updated_at();

comment on table public.homes is
  'A physical property belonging to a customer. Multiple homes supported (primary, parent, etc.).';

-- ============================================================
-- 5. ROOMS
--    Rooms within a home. The initial tool photo becomes
--    an image for one of these rooms once identity is known.
-- ============================================================
create table if not exists public.rooms (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  home_id             uuid not null references public.homes(id) on delete cascade,

  room_type           text,
    -- kitchen / living_room / bedroom / bathroom / garage /
    -- basement / attic / office / dining_room / laundry / other
  label               text,                        -- "Upstairs Guest Room", "Mom's Bedroom"
  floor_level         int,                         -- 0=basement, 1=ground, 2=upper, etc.
  approx_sqft         int,
  notes               text,

  metadata            jsonb not null default '{}'::jsonb
);

create index if not exists rooms_home_idx on public.rooms(home_id);

drop trigger if exists trg_rooms_updated_at on public.rooms;
create trigger trg_rooms_updated_at
  before update on public.rooms
  for each row execute function public.set_updated_at();

comment on table public.rooms is
  'A room within a home. The initial intake photo maps to a room once identified.';

-- ============================================================
-- 6. FILES
--    Universal Azure Blob Storage pointer table.
--    All four context FKs nullable — set what exists at upload
--    time, backfill the rest as lifecycle progresses.
--
--    Lifecycle example (intake photo):
--      upload      → lead_session_id ✓  lead_id ✓  job_id —   room_id —
--      after convert→ lead_session_id ✓  lead_id ✓  job_id ✓   room_id —
--      after catalog → all four set ✓
--
--    file_type values:
--
--    file_type values:
--      room_image  — photo of a space submitted via the tool
--      transcript  — exported conversation log
--      document    — any other file (PDF, signed estimate, etc.)
--      other       — catch-all
--
--    Type-specific nullable columns:
--      room_image  → is_intake_photo, width_px, height_px, caption
--      transcript  → transcript_format, transcript_version
-- ============================================================
create table if not exists public.files (
  id                    uuid primary key default gen_random_uuid(),
  created_at            timestamptz not null default now(),

  -- context FKs — all nullable, backfilled as lifecycle progresses
  lead_session_id       uuid references public.lead_sessions(id) on delete set null,
  lead_id               uuid references public.leads(id) on delete set null,
  job_id                uuid,                        -- FK added after jobs table is created
  room_id               uuid references public.rooms(id) on delete set null,

  file_type             text not null,               -- room_image / transcript / document / other

  -- Azure Blob pointer
  storage_account       text not null default 'lcclaritydevstor',
  container             text not null,
    -- intake-images      for room_image
    -- intake-transcripts for transcript
    -- lc-documents       for document
  blob_path             text not null,
    -- convention: <file_type>s/<id>.<ext>  (no job_id prefix — job may not exist yet)

  -- common file metadata
  content_type          text,                        -- MIME type e.g. image/jpeg
  byte_size             bigint,
  sha256                text,                        -- integrity + dedup

  -- room_image specific (null for other file_types)
  is_intake_photo       boolean not null default false,
  caption               text,                        -- user-provided or AI-generated
  width_px              int,
  height_px             int,

  -- transcript specific (null for other file_types)
  transcript_format     text,                        -- json / txt / pdf
  transcript_version    int,                         -- increment on re-export

  metadata              jsonb not null default '{}'::jsonb
);

-- unique blob — storage_account + container + blob_path must be globally unique
create unique index if not exists files_unique_blob
  on public.files(storage_account, container, blob_path);

-- remaining FKs and indexes added after jobs table is created (below)

comment on table public.files is
  'Universal Azure Blob pointer. All four context FKs nullable — set what exists at upload '
  'time, backfill as the lead → job → room lifecycle progresses. '
  'file_type = room_image | transcript | document | other.';

-- ============================================================
-- 7. OBJECT_ITEMS
--    Inventory items within a room. Populated by AI analysis
--    of room images or by manual entry.
--    Decision support: keep / donate / trash / sell / unsure
-- ============================================================
create table if not exists public.object_items (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  room_id             uuid not null references public.rooms(id) on delete cascade,
  job_id              uuid,                        -- FK added after jobs table is created
  source_file_id      uuid references public.files(id) on delete set null,
                      -- the room_image file this item was detected from

  -- identification
  name                text not null,               -- "oak dresser", "box of books"
  category            text,                        -- furniture / clothing / appliances / decor / etc.
  quantity            int not null default 1,

  -- condition & decision
  condition           text,                        -- excellent / good / fair / poor
  decision_status     text,                        -- keep / donate / trash / sell / unsure
  decision_notes      text,

  -- physical attributes (for estimates)
  weight_lbs          numeric(8,2),
  volume_cuft         numeric(8,2),
  requires_disassembly boolean not null default false,
  is_fragile          boolean not null default false,
  is_hazmat           boolean not null default false,

  notes               text,
  attributes          jsonb not null default '{}'::jsonb
  -- catch-all for AI-detected attributes (color, material, brand, etc.)
);

create index if not exists object_items_room_idx  on public.object_items(room_id);
create index if not exists object_items_job_idx   on public.object_items(job_id);

drop trigger if exists trg_object_items_updated_at on public.object_items;
create trigger trg_object_items_updated_at
  before update on public.object_items
  for each row execute function public.set_updated_at();

comment on table public.object_items is
  'Inventory items within a room. AI-detected or manually entered. Feeds into estimates.';

-- ============================================================
-- 8. JOBS
--    A committed work engagement. Created when a lead is
--    promoted (manually, by AI, or by user self-booking).
--    Links customer + home + originating lead.
--    Status: new / in_progress / quoted / booked / completed / archived
-- ============================================================
create table if not exists public.jobs (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  -- relationships
  customer_id         uuid not null references public.customers(id) on delete restrict,
  lead_id             uuid references public.leads(id) on delete set null,
  lead_session_id     uuid references public.lead_sessions(id) on delete set null,
  home_id             uuid references public.homes(id) on delete set null,

  -- lifecycle
  status              text not null default 'new',
    -- new / in_progress / quoted / booked / completed / archived

  -- job details
  title               text,
  description         text,
  job_type            text,
    -- space_clarity / full_move / downsizing / estate_clear / home_reset / other

  -- scheduling
  scheduled_start     timestamptz,
  scheduled_end       timestamptz,
  completed_at        timestamptz,

  -- admin
  admin_summary       text,
  assigned_to         text,

  metadata            jsonb not null default '{}'::jsonb
);

create index if not exists jobs_status_idx        on public.jobs(status);
create index if not exists jobs_customer_idx      on public.jobs(customer_id);
create index if not exists jobs_lead_idx          on public.jobs(lead_id);
create index if not exists jobs_home_idx          on public.jobs(home_id);

drop trigger if exists trg_jobs_updated_at on public.jobs;
create trigger trg_jobs_updated_at
  before update on public.jobs
  for each row execute function public.set_updated_at();

comment on table public.jobs is
  'A committed work engagement. Promoted from a lead. Central hub for all work activity.';

-- ============================================================
-- Now that jobs exists: wire the job_id FK on files and
-- object_items, and add all indexes
-- ============================================================
alter table public.files
  add constraint files_job_fk
  foreign key (job_id) references public.jobs(id) on delete set null;
  -- set null (not cascade) so files survive job deletion for audit purposes

create index if not exists files_lead_session_idx on public.files(lead_session_id);
create index if not exists files_lead_idx         on public.files(lead_id);
create index if not exists files_job_idx          on public.files(job_id);
create index if not exists files_room_idx         on public.files(room_id);
create index if not exists files_type_idx         on public.files(file_type);

alter table public.object_items
  add constraint object_items_job_fk
  foreign key (job_id) references public.jobs(id) on delete set null;

-- ============================================================
-- 9. AI_ARTIFACTS
--     Versioned structured AI outputs. All four context FKs
--     follow the same nullable pattern as files.
--     source_file_id links to the files record that was
--     analyzed to produce this artifact (e.g. the intake photo).
-- ============================================================
create table if not exists public.ai_artifacts (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),

  -- context FKs — all nullable, same pattern as files
  lead_session_id     uuid references public.lead_sessions(id) on delete set null,
  lead_id             uuid references public.leads(id) on delete set null,
  job_id              uuid references public.jobs(id) on delete set null,
  room_id             uuid references public.rooms(id) on delete set null,

  -- the file (e.g. room_image) this artifact was generated from
  source_file_id      uuid references public.files(id) on delete set null,

  -- artifact identity
  artifact_type       text not null,
    -- clarity_plan / object_list / room_summary / home_assessment /
    -- estimate_basis / coaching_brief / other
  version             int not null default 1,
  is_current          boolean not null default true,
    -- set false on prior versions when regenerating

  -- content
  title               text,
  text                text,                        -- human-readable output
  data                jsonb not null default '{}'::jsonb, -- structured output

  -- provenance
  provider            text,                        -- openai / anthropic / azure_oai
  model               text,
  prompt_hash         text,                        -- SHA-256 of prompt for reproducibility

  metadata            jsonb not null default '{}'::jsonb
);

create index if not exists ai_artifacts_lead_session_idx on public.ai_artifacts(lead_session_id, created_at);
create index if not exists ai_artifacts_lead_idx         on public.ai_artifacts(lead_id, created_at);
create index if not exists ai_artifacts_job_idx          on public.ai_artifacts(job_id, created_at);
create index if not exists ai_artifacts_type_idx         on public.ai_artifacts(artifact_type);
create index if not exists ai_artifacts_source_file_idx  on public.ai_artifacts(source_file_id);

comment on table public.ai_artifacts is
  'Versioned AI outputs. All four context FKs nullable — same pattern as files. '
  'source_file_id links to the files record analyzed (e.g. intake photo). '
  'is_current=false on prior versions when regenerating.';

-- ============================================================
-- 10. SERVICE_CATALOG
--     What LifeCaddie offers. Static-ish reference data.
--     Drives what can be attached to an engagement.
-- ============================================================
create table if not exists public.service_catalog (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  code                text unique not null,
    -- clarity_plan_free / clarity_plan_saved / full_home_estimate /
    -- coaching_session / concierge_package / move_coordination

  name                text not null,
  description         text,
  category            text,
    -- ai_tool / coaching / estimate / fulfillment

  -- pricing
  pricing_model       text,                        -- free / flat / hourly / custom
  base_price_cents    bigint,
  currency            text not null default 'USD',

  is_active           boolean not null default true,
  is_self_serve       boolean not null default false,

  metadata            jsonb not null default '{}'::jsonb
);

drop trigger if exists trg_service_catalog_updated_at on public.service_catalog;
create trigger trg_service_catalog_updated_at
  before update on public.service_catalog
  for each row execute function public.set_updated_at();

comment on table public.service_catalog is
  'LifeCaddie service offerings. Powers engagement creation and estimate line items.';

-- Seed initial services
insert into public.service_catalog (code, name, category, pricing_model, base_price_cents, is_self_serve)
values
  ('clarity_plan_free',   'Space Clarity Plan (Free)',           'ai_tool',   'free',   0,       true),
  ('clarity_plan_saved',  'Saved Clarity Plan (Premium)',        'ai_tool',   'flat',   999,     true),
  ('full_home_estimate',  'Full Home Estimate',                  'estimate',  'custom', null,    false),
  ('coaching_session',    'Coaching / Concierge Session (1hr)',  'coaching',  'hourly', 15000,   false),
  ('concierge_package',   'Full Concierge Package',              'coaching',  'custom', null,    false)
on conflict (code) do nothing;

-- ============================================================
-- 11. ENGAGEMENTS
--     Tracks which services a customer/job is using.
--     One engagement per service instance (e.g. 3 coaching
--     sessions = 3 engagement rows, or 1 with quantity=3).
--     Status: pending / active / completed / cancelled
-- ============================================================
create table if not exists public.engagements (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  customer_id         uuid not null references public.customers(id) on delete restrict,
  job_id              uuid references public.jobs(id) on delete set null,
  service_id          uuid not null references public.service_catalog(id) on delete restrict,

  status              text not null default 'pending',
    -- pending / active / completed / cancelled

  quantity            int not null default 1,

  -- scheduling
  scheduled_at        timestamptz,
  completed_at        timestamptz,

  -- pricing (can override catalog)
  agreed_price_cents  bigint,
  currency            text not null default 'USD',

  notes               text,
  metadata            jsonb not null default '{}'::jsonb
);

create index if not exists engagements_customer_idx on public.engagements(customer_id);
create index if not exists engagements_job_idx      on public.engagements(job_id);
create index if not exists engagements_status_idx   on public.engagements(status);

drop trigger if exists trg_engagements_updated_at on public.engagements;
create trigger trg_engagements_updated_at
  before update on public.engagements
  for each row execute function public.set_updated_at();

comment on table public.engagements is
  'Customer/job ↔ service instances. Tracks booked, active, and completed services.';

-- ============================================================
-- 12. ESTIMATES
--     Formal price quotes. Attached to a job.
--     Can have multiple line items in estimate_line_items.
--     Status: draft / sent / accepted / rejected / expired
-- ============================================================
create table if not exists public.estimates (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  job_id              uuid not null references public.jobs(id) on delete cascade,
  prepared_by         text,                        -- staff email / ID

  status              text not null default 'draft',
    -- draft / sent / accepted / rejected / expired

  valid_until         date,
  sent_at             timestamptz,
  accepted_at         timestamptz,

  currency            text not null default 'USD',
  subtotal_cents      bigint not null default 0,
  tax_cents           bigint not null default 0,
  discount_cents      bigint not null default 0,
  total_cents         bigint not null default 0,

  notes               text,
  data                jsonb not null default '{}'::jsonb
);

create index if not exists estimates_job_idx    on public.estimates(job_id);
create index if not exists estimates_status_idx on public.estimates(status);

drop trigger if exists trg_estimates_updated_at on public.estimates;
create trigger trg_estimates_updated_at
  before update on public.estimates
  for each row execute function public.set_updated_at();

comment on table public.estimates is
  'Formal price quote for a job. Line items in estimate_line_items.';

-- ============================================================
-- 13. ESTIMATE_LINE_ITEMS
--     Individual line items on an estimate.
--     Can reference a service, a room, or a specific object.
-- ============================================================
create table if not exists public.estimate_line_items (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),

  estimate_id         uuid not null references public.estimates(id) on delete cascade,

  -- optional references for context
  service_id          uuid references public.service_catalog(id) on delete set null,
  room_id             uuid references public.rooms(id) on delete set null,
  object_item_id      uuid references public.object_items(id) on delete set null,

  sort_order          int not null default 0,

  description         text not null,
  quantity            numeric(10,2) not null default 1,
  unit                text,                        -- hours / items / rooms / flat
  unit_price_cents    bigint not null default 0,
  total_cents         bigint not null default 0,

  metadata            jsonb not null default '{}'::jsonb
);

create index if not exists estimate_line_items_estimate_idx
  on public.estimate_line_items(estimate_id);

comment on table public.estimate_line_items is
  'Line items on an estimate. Can reference services, rooms, or individual objects.';

-- ============================================================
-- END OF SCHEMA
-- ============================================================