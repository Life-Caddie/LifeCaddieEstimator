import { NextResponse } from "next/server";
import { supabaseServer } from "../../../../lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const authHeader = req.headers.get("Authorization") ?? "";
  const accessToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { leadId?: string | null } = {};
  try {
    body = await req.json();
  } catch {
    // body is optional
  }
  const leadId = body.leadId ?? null;

  const db = supabaseServer();

  // Verify the Supabase access token and retrieve the authenticated user
  const { data: { user }, error: authError } = await db.auth.getUser(accessToken);
  if (authError || !user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = user.email;
  const meta = user.user_metadata ?? {};

  // Parse first/last name from Google OAuth metadata
  const firstName = (
    meta.given_name ||
    (meta.full_name ?? meta.name ?? "").split(" ")[0] ||
    ""
  ).trim();
  const lastName = (
    meta.family_name ||
    (meta.full_name ?? meta.name ?? "").split(" ").slice(1).join(" ") ||
    ""
  ).trim();

  // Check whether this customer already exists
  const { data: existing } = await db
    .from("customers")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  let customerId: string | null = null;

  if (existing?.id) {
    // Customer already exists — use their ID; preserve originating_lead_id as-is
    customerId = existing.id;
  } else {
    // Create new customer record
    const { data: newCustomer, error: insertError } = await db
      .from("customers")
      .insert({
        email,
        first_name: firstName || null,
        last_name: lastName || null,
        originating_lead_id: leadId ?? null,
        stage: "identified",
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("customers insert error:", insertError);
      return NextResponse.json({ error: "Customer creation failed" }, { status: 500 });
    }

    customerId = newCustomer?.id ?? null;
  }

  // Link the lead to this customer and advance its stage
  if (leadId && customerId) {
    const { error: leadUpdateError } = await db
      .from("leads")
      .update({ customer_id: customerId, stage: "contacted" })
      .eq("id", leadId);

    if (leadUpdateError) {
      console.error("leads update error:", leadUpdateError);
    }
  }

  return NextResponse.json({ customerId });
}
