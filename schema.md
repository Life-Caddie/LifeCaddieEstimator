# Database Schema

## Table: `ai_artifacts`

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| created_at | timestamp with time zone | NO | now() |
| job_id | uuid | NO | — |
| room_id | uuid | YES | — |
| room_image_id | uuid | YES | — |
| type | text | NO | — |
| version | integer | NO | 1 |
| text | text | YES | — |
| data | jsonb | NO | '{}'::jsonb |
| provider | text | YES | — |
| model | text | YES | — |
| prompt_hash | text | YES | — |
| metadata | jsonb | NO | '{}'::jsonb |

**Relationships:**
- `job_id` → `jobs.id`
- `room_id` → `rooms.id`

---

## Table: `customers`

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| created_at | timestamp with time zone | NO | now() |
| stage | text | NO | 'identified'::text |
| email | USER-DEFINED | YES | — |
| phone | text | YES | — |
| full_name | text | YES | — |
| metadata | jsonb | NO | '{}'::jsonb |

---

## Table: `estimates`

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| created_at | timestamp with time zone | NO | now() |
| updated_at | timestamp with time zone | NO | now() |
| job_id | uuid | NO | — |
| status | text | NO | 'draft'::text |
| currency | text | NO | 'USD'::text |
| subtotal_cents | bigint | NO | 0 |
| tax_cents | bigint | NO | 0 |
| total_cents | bigint | NO | 0 |
| data | jsonb | NO | '{}'::jsonb |

**Relationships:**
- `job_id` → `jobs.id`

---

## Table: `homes`

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| created_at | timestamp with time zone | NO | now() |
| customer_id | uuid | YES | — |
| nickname | text | YES | — |
| address_line1 | text | YES | — |
| address_line2 | text | YES | — |
| city | text | YES | — |
| region | text | YES | — |
| postal_code | text | YES | — |
| country | text | YES | — |
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

**Relationships:**
- `job_id` → `jobs.id`

---

## Table: `job_transcript_exports`

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

**Relationships:**
- `job_id` → `jobs.id`

---

## Table: `jobs`

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| created_at | timestamp with time zone | NO | now() |
| updated_at | timestamp with time zone | NO | now() |
| status | text | NO | 'new'::text |
| lead_session_id | uuid | YES | — |
| customer_id | uuid | YES | — |
| title | text | YES | — |
| intake_intention | text | YES | — |
| intake_feeling | text | YES | — |
| admin_summary | text | YES | — |
| metadata | jsonb | NO | '{}'::jsonb |

**Relationships:**
- `customer_id` → `customers.id`
- `lead_session_id` → `lead_sessions.id`

---

## Table: `lead_sessions`

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| created_at | timestamp with time zone | NO | now() |
| last_seen_at | timestamp with time zone | NO | now() |
| client_token | text | YES | — |
| user_agent | text | YES | — |
| ip_hash | text | YES | — |
| locale | text | YES | — |
| timezone | text | YES | — |
| consent_analytics | boolean | NO | false |
| consent_marketing | boolean | NO | false |
| metadata | jsonb | NO | '{}'::jsonb |

---

## Table: `messages`

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| created_at | timestamp with time zone | NO | now() |
| job_id | uuid | NO | — |
| role | text | NO | — |
| content_text | text | YES | — |
| content_json | jsonb | NO | '{}'::jsonb |
| provider | text | YES | — |
| model | text | YES | — |
| request_id | text | YES | — |
| token_in | integer | YES | — |
| token_out | integer | YES | — |
| metadata | jsonb | NO | '{}'::jsonb |

**Relationships:**
- `job_id` → `jobs.id`

---

## Table: `object_items`

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| created_at | timestamp with time zone | NO | now() |
| updated_at | timestamp with time zone | NO | now() |
| room_id | uuid | NO | — |
| job_id | uuid | YES | — |
| source_image_id | uuid | YES | — |
| name | text | NO | — |
| category | text | YES | — |
| quantity | integer | YES | — |
| condition | text | YES | — |
| decision_status | text | YES | — |
| notes | text | YES | — |
| attributes | jsonb | NO | '{}'::jsonb |

**Relationships:**
- `job_id` → `jobs.id`
- `room_id` → `rooms.id`

---

## Table: `room_images`

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| created_at | timestamp with time zone | NO | now() |
| job_id | uuid | NO | — |
| room_id | uuid | YES | — |
| storage_account | text | NO | 'lcclaritydevstor'::text |
| container | text | NO | 'intake-images'::text |
| blob_path | text | NO | — |
| content_type | text | YES | — |
| byte_size | bigint | YES | — |
| width_px | integer | YES | — |
| height_px | integer | YES | — |
| sha256 | text | YES | — |
| metadata | jsonb | NO | '{}'::jsonb |

**Relationships:**
- `job_id` → `jobs.id`
- `room_id` → `rooms.id`

---

## Table: `rooms`

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| created_at | timestamp with time zone | NO | now() |
| home_id | uuid | YES | — |
| room_type | text | YES | — |
| label | text | YES | — |
| notes | text | YES | — |
| metadata | jsonb | NO | '{}'::jsonb |

**Relationships:**
- `home_id` → `homes.id`

---

