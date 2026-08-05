"use client";

import { stripePromise } from "stripe";

export default function Home() {
  const checkout = async () => {
    const res = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: {
      "Content-Type": "application/json",
      },
      body: JSON.stringify({
        unit_amount: 2500, // $25.00 in cents
        productName: "Pet Insurance Quote",
      }),
    });
    
    const data = await res.json();
    
    window.location.href = data.url;
    const stripe = await stripePromise;

    await stripe.redirectToCheckout({
      sessionId: data.id,
    });
  };

  return (
    <main>
      <h1>Stripe Demo</h1>
      <button onClick={checkout}>Pay $25</button>
    </main>
  );
}