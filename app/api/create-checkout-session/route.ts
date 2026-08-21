import { NextResponse } from "next/server";
import Stripe from "stripe";

const domain = process.env.NEXT_PUBLIC_BASE_URL;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  const body = await request.json();

  const randomNumber = Math.floor(100000 + Math.random() * 900000);
  const quoteId = `WAS-${randomNumber}`;

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
            name: body.productName,
          },
          unit_amount: body.unit_amount,
        },
        quantity: 1,
      },
    ],

    success_url: `${domain}/success?quoteId=${quoteId}`,
    cancel_url: `${domain}/cancel`,
  });

  return NextResponse.json({
    url: session.url,
    quoteId: quoteId,
  });
}