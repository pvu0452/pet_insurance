import { NextResponse } from "next/server";
import Stripe from "stripe";
import { Resend } from "resend";
const apiKey = process.env.RESEND_API_KEY;

if (!apiKey) {
    throw new Error("RESEND_API_KEY is missing from the Vercel runtime");
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  const body = await request.text();

  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return new NextResponse("Missing Stripe signature", {
      status: 400,
    });
  }

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

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const customerEmail = session.customer_email;
    const quoteId = session.metadata?.quoteId;

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

      console.log(`Confirmation email sent to ${customerEmail}`);
    } catch (error) {
      console.error("Failed to send email:", error);

      return new NextResponse("Failed to send email", {
        status: 500,
      });
    }
  }

  return NextResponse.json({ received: true });
}