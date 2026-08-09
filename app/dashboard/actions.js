"use server";

import Stripe from "stripe";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "../../lib/supabaseServer";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Opens Stripe's hosted Billing Portal so a subscriber can update their
// card, change plans, or cancel without emailing us. Requires the client
// to have a stripe_customer_id on file (set by the checkout webhook) and
// requires the Customer Portal to be turned on in the Stripe Dashboard
// (Settings -> Billing -> Customer portal).
export async function manageBilling() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: client } = await supabase
    .from("clients")
    .select("stripe_customer_id")
    .eq("auth_user_id", user.id)
    .single();

  if (!client?.stripe_customer_id) {
    redirect("/dashboard?billing=unavailable");
  }

  const originHeader = (await headers()).get("origin");
  const returnUrl = `${originHeader ?? "https://portal.flowstudiogrfx.com"}/dashboard`;

  let session;
  try {
    session = await stripe.billingPortal.sessions.create({
      customer: client.stripe_customer_id,
      return_url: returnUrl,
    });
  } catch (err) {
    console.error("Failed to create billing portal session:", err.message);
    redirect("/dashboard?billing=error");
  }

  redirect(session.url);
}
