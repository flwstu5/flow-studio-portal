import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createAdminClient } from "../../../lib/supabaseAdmin";
import { sendEmail } from "../../../lib/email";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const ADMIN_EMAIL = "admin@flowstudiogrfx.com";

// Fire-and-forget alert so a webhook failure doesn't go unnoticed — sendEmail
// already never throws, so this is safe to call from any error branch below
// without risking a second failure on top of the first.
async function alertWebhookFailure(context, detail) {
  console.error(`Stripe webhook failure [${context}]:`, detail);
  await sendEmail({
    to: ADMIN_EMAIL,
    subject: `Stripe webhook failure — ${context}`,
    html: `<p>The Stripe webhook hit an error and may not have finished processing.</p><p><strong>Context:</strong> ${context}</p><p><strong>Detail:</strong> ${detail}</p><p>Check the Vercel function logs for the full trace, and check Stripe Dashboard → Developers → Webhooks for the retry status.</p>`,
  });
}

// Records that this event id has been fully handled, so a Stripe redelivery
// of the same event (retries, duplicate sends) short-circuits instead of
// re-running client creation or subscription sync a second time.
async function markProcessed(supabase, event) {
  const { error } = await supabase
    .from("stripe_webhook_events")
    .insert({ id: event.id, type: event.type });
  if (error) {
    // Not fatal — worst case a redelivery gets reprocessed, which the
    // existing email-lookup/upsert logic already tolerates reasonably well.
    console.error("Failed to record processed webhook event:", error.message);
  }
}

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

  console.log("Stripe webhook received:", event.type, event.id);

  const supabase = createAdminClient();

  // Dedup: Stripe redelivers events (retries, duplicate sends). If we've
  // already fully processed this event id, acknowledge and stop instead of
  // re-running client creation or subscription sync a second time.
  const { data: alreadyProcessed } = await supabase
    .from("stripe_webhook_events")
    .select("id")
    .eq("id", event.id)
    .maybeSingle();

  if (alreadyProcessed) {
    console.log("Webhook event already processed, skipping:", event.id);
    return NextResponse.json({ received: true, deduped: true });
  }

  try {
    if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      await syncSubscription(supabase, event.data.object);
      await markProcessed(supabase, event);
      return NextResponse.json({ received: true });
    }

    if (event.type !== "checkout.session.completed") {
      // Not an event we handle — acknowledge and ignore.
      await markProcessed(supabase, event);
      return NextResponse.json({ received: true });
    }

    const session = event.data.object;
    console.log("Checkout session id:", session.id);

    const email = session.customer_details?.email;
    console.log("Customer email:", email);

    const stripeCustomerId = typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;
    console.log("Stripe customer ID:", stripeCustomerId);

    if (!email) {
      console.error("Checkout session had no customer email:", session.id);
      await alertWebhookFailure("checkout.session.completed", `Session ${session.id} had no customer email — no account was created.`);
      await markProcessed(supabase, event);
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

    // Does a client with this email already exist? (e.g. re-subscribing)
    const { data: existing, error: lookupError } = await supabase
      .from("clients")
      .select("id, auth_user_id")
      .eq("email", email)
      .maybeSingle();

    if (lookupError) {
      console.error("Error looking up existing client:", lookupError.message);
      await alertWebhookFailure("checkout.session.completed — client lookup", `${lookupError.message} (session ${session.id}, email ${email})`);
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
        await alertWebhookFailure("checkout.session.completed — auth user creation", `${createError.message} (session ${session.id}, email ${email})`);
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
          ...(stripeCustomerId ? { stripe_customer_id: stripeCustomerId } : {}),
        })
        .eq("id", existing.id);

      if (updateError) {
        console.error("Failed to update client row:", updateError.message);
        await alertWebhookFailure("checkout.session.completed — client update", `${updateError.message} (session ${session.id}, email ${email})`);
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
        stripe_customer_id: stripeCustomerId,
      });

      if (insertError) {
        console.error("Failed to insert client row:", insertError.message);
        await alertWebhookFailure("checkout.session.completed — client insert", `${insertError.message} (session ${session.id}, email ${email}) — a paying customer may not have portal access.`);
        return NextResponse.json({ error: "Insert failed" }, { status: 500 });
      }
      console.log("Inserted new client for:", email);
    }

    await markProcessed(supabase, event);
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Unhandled Stripe webhook error:", err.message);
    await alertWebhookFailure(`unhandled — ${event.type}`, `${err.message} (event ${event.id})`);
    return NextResponse.json({ error: "Unhandled error" }, { status: 500 });
  }
}

// Fires on customer.subscription.updated (plan change, or cancellation
// scheduled/reactivated) and customer.subscription.deleted (subscription
// actually ended). Keeps the client's tier in sync with what they're
// really paying for, since these can now happen outside of a checkout
// (e.g. through the self-service billing portal).
async function syncSubscription(supabase, subscription) {
  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id ?? null;

  if (!customerId) {
    console.error("Subscription event had no customer id:", subscription.id);
    return;
  }

  const { data: client, error: lookupError } = await supabase
    .from("clients")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (lookupError) {
    console.error("Error looking up client for subscription sync:", lookupError.message);
    return;
  }

  if (!client) {
    // Most likely a customer that predates stripe_customer_id being
    // captured — nothing to sync until they next touch Stripe checkout.
    console.error("No client found for Stripe customer:", customerId);
    return;
  }

  const isActive = subscription.status === "active" || subscription.status === "trialing";
  const priceId = subscription.items?.data?.[0]?.price?.id ?? null;
  const tier = isActive ? PRICE_TO_TIER[priceId] ?? null : null;

  const updates = {
    tier,
    subscription_status: subscription.status,
    cancel_at_period_end: !!subscription.cancel_at_period_end,
  };

  if (subscription.current_period_end) {
    updates.renews_at = new Date(subscription.current_period_end * 1000).toISOString().split("T")[0];
  }

  const { error: updateError } = await supabase.from("clients").update(updates).eq("id", client.id);

  if (updateError) {
    console.error("Failed to sync subscription:", updateError.message);
  } else {
    console.log("Synced subscription for client:", client.id, updates);
  }
}
