# Database Schema

## Table: `ai_artifacts`

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| created_at | timestamp with time zone | NO | now() |
| lead_session_id | uuid | YES | — |
| lead_id | uuid | YES | — |
| job_id | uuid | YES | — |
| room_id | uuid | YES | — |
| source_file_id | uuid | YES | — |
| artifact_type | text | NO | — |
| version | integer | NO | 1 |
| is_current | boolean | NO | true |
| title | text | YES | — |
| text | text | YES | — |
| data | jsonb | NO | '{}'::jsonb |
| provider | text | YES | — |
| model | text | YES | — |
| prompt_hash | text | YES | — |
| metadata | jsonb | NO | '{}'::jsonb |

**Relationships:**
- `job_id` → `jobs.id`
- `lead_id` → `leads.id`
- `lead_session_id` → `lead_sessions.id`
- `room_id` → `rooms.id`
- `source_file_id` → `files.id`

---

## Table: `customers`

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| created_at | timestamp with time zone | NO | now() |
| updated_at | timestamp with time zone | NO | now() |
| stage | text | NO | 'identified'::text |
| email | USER-DEFINED | YES | — |
| phone | text | YES | — |
| first_name | text | YES | — |
| last_name | text | YES | — |
| full_name | text | YES | — |
| originating_lead_id | uuid | YES | — |
| preferred_contact | text | YES | — |
| timezone | text | YES | — |
| locale | text | YES | — |
| admin_notes | text | YES | — |
| assigned_to | text | YES | — |
| metadata | jsonb | NO | '{}'::jsonb |

**Relationships:**
- `originating_lead_id` → `leads.id`

---

## Table: `engagements`

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| created_at | timestamp with time zone | NO | now() |
| updated_at | timestamp with time zone | NO | now() |
| customer_id | uuid | NO | — |
| job_id | uuid | YES | — |
| service_id | uuid | NO | — |
| status | text | NO | 'pending'::text |
| quantity | integer | NO | 1 |
| scheduled_at | timestamp with time zone | YES | — |
| completed_at | timestamp with time zone | YES | — |
| agreed_price_cents | bigint | YES | — |
| currency | text | NO | 'USD'::text |
| notes | text | YES | — |
| metadata | jsonb | NO | '{}'::jsonb |

**Relationships:**
- `customer_id` → `customers.id`
- `job_id` → `jobs.id`
- `service_id` → `service_catalog.id`

---

## Table: `estimate_line_items`

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| created_at | timestamp with time zone | NO | now() |
| estimate_id | uuid | NO | — |
| service_id | uuid | YES | — |
| room_id | uuid | YES | — |
| object_item_id | uuid | YES | — |
| sort_order | integer | NO | 0 |
| description | text | NO | — |
| quantity | numeric | NO | 1 |
| unit | text | YES | — |
| unit_price_cents | bigint | NO | 0 |
| total_cents | bigint | NO | 0 |
| metadata | jsonb | NO | '{}'::jsonb |

**Relationships:**
- `estimate_id` → `estimates.id`
- `object_item_id` → `object_items.id`
- `room_id` → `rooms.id`
- `service_id` → `service_catalog.id`

---

## Table: `estimates`

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| created_at | timestamp with time zone | NO | now() |
| updated_at | timestamp with time zone | NO | now() |
| job_id | uuid | NO | — |
| prepared_by | text | YES | — |
| status | text | NO | 'draft'::text |
| valid_until | date | YES | — |
| sent_at | timestamp with time zone | YES | — |
| accepted_at | timestamp with time zone | YES | — |
| currency | text | NO | 'USD'::text |
| subtotal_cents | bigint | NO | 0 |
| tax_cents | bigint | NO | 0 |
| discount_cents | bigint | NO | 0 |
| total_cents | bigint | NO | 0 |
| notes | text | YES | — |
| data | jsonb | NO | '{}'::jsonb |

**Relationships:**
- `job_id` → `jobs.id`

---

## Table: `files`

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| created_at | timestamp with time zone | NO | now() |
| lead_session_id | uuid | YES | — |
| lead_id | uuid | YES | — |
| job_id | uuid | YES | — |
| room_id | uuid | YES | — |
| file_type | text | NO | — |
| storage_account | text | NO | 'lcclaritydevstor'::text |
| container | text | NO | — |
| blob_path | text | NO | — |
| content_type | text | YES | — |
| byte_size | bigint | YES | — |
| sha256 | text | YES | — |
| is_intake_photo | boolean | NO | false |
| caption | text | YES | — |
| width_px | integer | YES | — |
| height_px | integer | YES | — |
| transcript_format | text | YES | — |
| transcript_version | integer | YES | — |
| metadata | jsonb | NO | '{}'::jsonb |

**Relationships:**
- `job_id` → `jobs.id`
- `lead_id` → `leads.id`
- `lead_session_id` → `lead_sessions.id`
- `room_id` → `rooms.id`

---

## Table: `homes`

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| created_at | timestamp with time zone | NO | now() |
| updated_at | timestamp with time zone | NO | now() |
| customer_id | uuid | NO | — |
| nickname | text | YES | — |
| home_type | text | YES | — |
| approx_sqft | integer | YES | — |
| num_bedrooms | integer | YES | — |
| num_bathrooms | numeric | YES | — |
| address_line1 | text | YES | — |
| address_line2 | text | YES | — |
| city | text | YES | — |
| region | text | YES | — |
| postal_code | text | YES | — |
| country | text | NO | 'US'::text |
| metadata | jsonb | NO | '{}'::jsonb |

**Relationships:**
- `customer_id` → `customers.id`

---

## Table: `job_transcript`

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| created_at | timestamp with time zone | NO | now() |
| job_id | uuid | NO | — |
| storage_account | text | NO | 'lcclaritydevstor'::text |
| container | text | NO | 'intake-transcripts'::text |
| blob_path | text | NO | — |
| format | text | NO | 'json'::text |
| version | integer | NO | 1 |
| byte_size | bigint | YES | — |
| sha256 | text | YES | — |
| metadata | jsonb | NO | '{}'::jsonb |

---

## Table: `jobs`

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| created_at | timestamp with time zone | NO | now() |
| updated_at | timestamp with time zone | NO | now() |
| customer_id | uuid | NO | — |
| lead_id | uuid | YES | — |
| lead_session_id | uuid | YES | — |
| home_id | uuid | YES | — |
| status | text | NO | 'new'::text |
| title | text | YES | — |
| description | text | YES | — |
| job_type | text | YES | — |
| scheduled_start | timestamp with time zone | YES | — |
| scheduled_end | timestamp with time zone | YES | — |
| completed_at | timestamp with time zone | YES | — |
| admin_summary | text | YES | — |
| assigned_to | text | YES | — |
| metadata | jsonb | NO | '{}'::jsonb |

**Relationships:**
- `customer_id` → `customers.id`
- `home_id` → `homes.id`
- `lead_id` → `leads.id`
- `lead_session_id` → `lead_sessions.id`

---

## Table: `lead_sessions`

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| created_at | timestamp with time zone | NO | now() |
| last_seen_at | timestamp with time zone | NO | now() |
| client_token | text | NO | — |
| user_agent | text | YES | — |
| ip_hash | text | YES | — |
| locale | text | YES | — |
| timezone | text | YES | — |
| consent_analytics | boolean | NO | false |
| consent_marketing | boolean | NO | false |
| metadata | jsonb | NO | '{}'::jsonb |

---

## Table: `leads`

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| created_at | timestamp with time zone | NO | now() |
| updated_at | timestamp with time zone | NO | now() |
| lead_session_id | uuid | YES | — |
| customer_id | uuid | YES | — |
| stage | text | NO | 'new'::text |
| intake_intention | text | YES | — |
| intake_feeling | text | YES | — |
| email | USER-DEFINED | YES | — |
| first_name | text | YES | — |
| last_name | text | YES | — |
| phone | text | YES | — |
| clarity_plan_summary | text | YES | — |
| utm_source | text | YES | — |
| utm_medium | text | YES | — |
| utm_campaign | text | YES | — |
| referrer_url | text | YES | — |
| admin_notes | text | YES | — |
| assigned_to | text | YES | — |
| metadata | jsonb | NO | '{}'::jsonb |

**Relationships:**
- `customer_id` → `customers.id`
- `lead_session_id` → `lead_sessions.id`

---

## Table: `object_items`

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| created_at | timestamp with time zone | NO | now() |
| updated_at | timestamp with time zone | NO | now() |
| room_id | uuid | NO | — |
| job_id | uuid | YES | — |
| source_file_id | uuid | YES | — |
| name | text | NO | — |
| category | text | YES | — |
| quantity | integer | NO | 1 |
| condition | text | YES | — |
| decision_status | text | YES | — |
| decision_notes | text | YES | — |
| weight_lbs | numeric | YES | — |
| volume_cuft | numeric | YES | — |
| requires_disassembly | boolean | NO | false |
| is_fragile | boolean | NO | false |
| is_hazmat | boolean | NO | false |
| notes | text | YES | — |
| attributes | jsonb | NO | '{}'::jsonb |

**Relationships:**
- `job_id` → `jobs.id`
- `room_id` → `rooms.id`
- `source_file_id` → `files.id`

---

## Table: `rooms`

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| created_at | timestamp with time zone | NO | now() |
| updated_at | timestamp with time zone | NO | now() |
| home_id | uuid | NO | — |
| room_type | text | YES | — |
| label | text | YES | — |
| floor_level | integer | YES | — |
| approx_sqft | integer | YES | — |
| notes | text | YES | — |
| metadata | jsonb | NO | '{}'::jsonb |

**Relationships:**
- `home_id` → `homes.id`

---

## Table: `service_catalog`

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| created_at | timestamp with time zone | NO | now() |
| updated_at | timestamp with time zone | NO | now() |
| code | text | NO | — |
| name | text | NO | — |
| description | text | YES | — |
| category | text | YES | — |
| pricing_model | text | YES | — |
| base_price_cents | bigint | YES | — |
| currency | text | NO | 'USD'::text |
| is_active | boolean | NO | true |
| is_self_serve | boolean | NO | false |
| metadata | jsonb | NO | '{}'::jsonb |

---

