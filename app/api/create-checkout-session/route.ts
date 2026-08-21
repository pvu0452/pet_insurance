import { NextResponse } from "next/server";
import Stripe from "stripe";

const domain = process.env.NEXT_PUBLIC_BASE_URL

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
export async function POST(requqest: Request) {
  const body = await requqest.json();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: body.customer_email,
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
      }
    ],
    success_url: `${domain}/success`,
    cancel_url: `${domain}/cancel`,
  });
  return NextResponse.json({ url: session.url });
}



