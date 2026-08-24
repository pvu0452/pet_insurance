import { NextResponse } from "next/server";
import Stripe from "stripe";
import { Resend } from "resend";

export async function POST(request: Request) {
  console.log("=== STRIPE WEBHOOK STARTED ===");

  console.log("Stripe key exists:", !!process.env.STRIPE_SECRET_KEY);
  console.log("Webhook secret exists:", !!process.env.STRIPE_WEBHOOK_SECRET);
  console.log("Resend key exists:", !!process.env.RESEND_API_KEY);

  const body = await request.text();

  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    console.error("Missing Stripe signature");

    return new NextResponse("Missing Stripe signature", {
      status: 400,
    });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  const resend = new Resend(process.env.RESEND_API_KEY!);

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error) {
    console.error("Webhook signature verification failed:", error);

    return new NextResponse("Invalid signature", {
      status: 400,
    });
  }

  console.log("Stripe webhook verified:", event.type);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const customerEmail = session.customer_email;
    const quoteId = session.metadata?.quoteId;

    console.log("Customer email:", customerEmail);
    console.log("Quote ID:", quoteId);

    if (!customerEmail) {
      console.error("No customer email found");
      return NextResponse.json({ received: true });
    }

    try {
      await resend.emails.send({
        from: "onboarding@resend.dev",
        to: customerEmail,
        subject: "Your WAS Insurance Purchase Confirmation",
        html: `
          <h1>Payment Successful</h1>

          <p>
            Thank you for purchasing pet insurance with WAS Insurance.
          </p>

          <p>
            Your insurance quote ID is:
            <strong>${quoteId}</strong>
          </p>

          <p>
            Please keep this quote ID for your records.
          </p>
        `,
      });

      console.log("=== EMAIL SENT SUCCESSFULLY ===");

    } catch (error) {
      console.error("Failed to send email:", error);

      return new NextResponse("Failed to send email", {
        status: 500,
      });
    }
  }

  return NextResponse.json({ received: true });
}