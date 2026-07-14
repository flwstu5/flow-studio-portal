import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createAdminClient } from "../../../lib/supabaseAdmin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Map each Stripe Price ID to the matching subscription tier.
// Find these under Stripe Dashboard -> Product catalog -> (each product)
// -> the Price's ID, looks like "price_1AbC2DeFgHiJkLmN".
const PRICE_TO_TIER = {
  "price_1TsgrhBPdp8igzHUw2Cz6Opa": "starter",
  "price_1TsgttBPdp8igzHUARp5Q9ir": "growth",
  "price_1TsguOBPdp8igzHUkFD27MoW": "premium",
};

export async function POST(request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  console.log("Stripe webhook received:", event.type);

  if (event.type !== "checkout.session.completed") {
    // Not a new-subscription event — acknowledge and ignore.
    return NextResponse.json({ received: true });
  }

  const session = event.data.object;
  console.log("Checkout session id:", session.id);

  const email = session.customer_details?.email;
  console.log("Customer email:", email);

  if (!email) {
    console.error("Checkout session had no customer email:", session.id);
    return NextResponse.json({ received: true });
  }

  // The webhook payload doesn't include line item details by default —
  // fetch them explicitly to find which Price was purchased.
  let priceId = null;
  try {
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
    priceId = lineItems.data?.[0]?.price?.id ?? null;
  } catch (err) {
    console.error("Failed to fetch line items:", err.message);
  }
  console.log("Price ID:", priceId);

  const tier = PRICE_TO_TIER[priceId] ?? null;
  console.log("Resolved tier:", tier);

  // Custom fields you added on the Payment Link (business name, logo link)
  // come back here as an array. Grab the first text field as the business
  // name regardless of its exact key, since the key naming can vary.
  const customFields = session.custom_fields ?? [];
  console.log("Custom fields raw:", JSON.stringify(customFields));
  const businessNameField = customFields.find((f) => f.type === "text" && f.text?.value);
  const businessName = businessNameField?.text?.value ?? "Unknown business";
  console.log("Business name:", businessName);

  const supabase = createAdminClient();

  // Does a client with this email already exist? (e.g. re-subscribing)
  const { data: existing, error: lookupError } = await supabase
    .from("clients")
    .select("id, auth_user_id")
    .eq("email", email)
    .maybeSingle();

  if (lookupError) {
    console.error("Error looking up existing client:", lookupError.message);
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }

  let authUserId = existing?.auth_user_id;

  if (!authUserId) {
    // Create their login — they'll use the same one-time-code sign-in,
    // no password to set up.
    const { data: created, error: createError } =
      await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
      });

    if (createError) {
      console.error("Failed to create auth user:", createError.message);
      return NextResponse.json({ error: "User creation failed" }, { status: 500 });
    }

    authUserId = created.user.id;
    console.log("Created auth user:", authUserId);
  }

  const renewsAt = new Date();
  renewsAt.setMonth(renewsAt.getMonth() + 1);

  if (existing) {
    const { error: updateError } = await supabase
      .from("clients")
      .update({
        tier,
        business_name: businessName,
        renews_at: renewsAt.toISOString().split("T")[0],
      })
      .eq("id", existing.id);

    if (updateError) {
      console.error("Failed to update client row:", updateError.message);
      return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }
    console.log("Updated existing client:", existing.id);
  } else {
    const { error: insertError } = await supabase.from("clients").insert({
      auth_user_id: authUserId,
      email,
      business_name: businessName,
      tier,
      client_type: "subscriber",
      renews_at: renewsAt.toISOString().split("T")[0],
    });

    if (insertError) {
      console.error("Failed to insert client row:", insertError.message);
      return NextResponse.json({ error: "Insert failed" }, { status: 500 });
    }
    console.log("Inserted new client for:", email);
  }

  return NextResponse.json({ received: true });
}
