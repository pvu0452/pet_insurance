import { NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(request: Request) {
  try {
    console.log("=== CREATE CHECKOUT SESSION ===");

    // Check environment variables
    console.log(
      "STRIPE_SECRET_KEY exists:",
      !!process.env.STRIPE_SECRET_KEY
    );

    console.log(
      "NEXT_PUBLIC_BASE_URL:",
      process.env.NEXT_PUBLIC_BASE_URL
    );

    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is missing");
    }

    if (!process.env.NEXT_PUBLIC_BASE_URL) {
      throw new Error("NEXT_PUBLIC_BASE_URL is missing");
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const body = await request.json();

    console.log("Checkout request:", body);

    // Generate Quote ID
    const randomNumber = Math.floor(
      100000 + Math.random() * 900000
    );

    const quoteId = `WAS-${randomNumber}`;

    console.log("Generated Quote ID:", quoteId);

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: "payment",

      payment_method_types: ["card"],

      customer_email: body.customer_email,

      metadata: {
        quoteId: quoteId,
      },

      line_items: [
        {
          price_data: {
            currency: "usd",

            product_data: {
              name: body.productName || "Pet Insurance Quote",
            },

            unit_amount: Number(body.unit_amount),
          },

          quantity: 1,
        },
      ],

      success_url:
        `${process.env.NEXT_PUBLIC_BASE_URL}` +
        `/success?quoteId=${quoteId}`,

      cancel_url:
        `${process.env.NEXT_PUBLIC_BASE_URL}/cancel`,
    });

    console.log("Stripe session created:", session.id);

    console.log("Success URL:", session.url);

    return NextResponse.json({
      url: session.url,
      quoteId: quoteId,
    });

  } catch (error: any) {

    console.error("=== STRIPE CHECKOUT ERROR ===");

    console.error(error);

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Failed to create Stripe checkout session",
      },
      {
        status: 500,
      }
    );
  }
}