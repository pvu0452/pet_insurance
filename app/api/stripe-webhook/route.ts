
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
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>

          <body style="
            margin: 0;
            padding: 0;
            background-color: #f4f6f8;
            font-family: Arial, Helvetica, sans-serif;
          ">

            <table
              width="100%"
              cellpadding="0"
              cellspacing="0"
              style="
                padding: 40px 15px;
                background-color: #f4f6f8;
              "
            >
              <tr>
                <td align="center">

                  <!-- Main Email Container -->
                  <table
                    width="600"
                    cellpadding="0"
                    cellspacing="0"
                    style="
                      max-width: 600px;
                      width: 100%;
                      background-color: #ffffff;
                      border-radius: 12px;
                      overflow: hidden;
                    "
                  >

                    <!-- Header -->
                    <tr>
                      <td style="
                        padding: 30px 40px;
                        border-bottom: 1px solid #e5e7eb;
                      ">

                        <h1 style="
                          margin: 0;
                          font-size: 26px;
                          color: #111827;
                        ">
                          WAS Insurance
                        </h1>

                        <p style="
                          margin: 6px 0 0;
                          font-size: 14px;
                          color: #6b7280;
                        ">
                          Pet Insurance
                        </p>

                      </td>
                    </tr>

                    <!-- Success Section -->
                    <tr>
                      <td style="
                        padding: 40px 40px 20px;
                      ">

                        <div style="
                          width: 48px;
                          height: 48px;
                          background-color: #e8f7ee;
                          border-radius: 50%;
                          text-align: center;
                          line-height: 48px;
                          font-size: 24px;
                          color: #15803d;
                          margin-bottom: 20px;
                        ">
                          ✓
                        </div>

                        <h2 style="
                          margin: 0 0 12px;
                          font-size: 24px;
                          color: #111827;
                        ">
                          Payment Successful
                        </h2>

                        <p style="
                          margin: 0;
                          font-size: 15px;
                          line-height: 1.6;
                          color: #4b5563;
                        ">
                          Thank you for purchasing pet insurance with
                          WAS Insurance. Your payment has been successfully
                          processed.
                        </p>

                      </td>
                    </tr>

                    <!-- Policy Number -->
                    <tr>
                      <td style="
                        padding: 10px 40px 30px;
                      ">

                        <table
                          width="100%"
                          cellpadding="0"
                          cellspacing="0"
                          style="
                            background-color: #f8fafc;
                            border: 1px solid #e5e7eb;
                            border-radius: 8px;
                          "
                        >

                          <tr>
                            <td style="
                              padding: 20px;
                            ">

                              <p style="
                                margin: 0 0 8px;
                                font-size: 12px;
                                color: #6b7280;
                                text-transform: uppercase;
                                letter-spacing: 0.5px;
                              ">
                                Policy Number
                              </p>

                              <p style="
                                margin: 0;
                                font-size: 20px;
                                font-weight: bold;
                                color: #111827;
                              ">
                                ${quoteId || "Unavailable"}
                              </p>

                            </td>
                          </tr>

                        </table>

                      </td>
                    </tr>

                    <!-- Confirmation Details -->
                    <tr>
                      <td style="
                        padding: 0 40px 30px;
                      ">

                        <h3 style="
                          margin: 0 0 15px;
                          font-size: 18px;
                          color: #111827;
                        ">
                          Purchase Details
                        </h3>

                        <table
                          width="100%"
                          cellpadding="0"
                          cellspacing="0"
                        >

                          <tr>
                            <td style="
                              padding: 10px 0;
                              border-bottom: 1px solid #eeeeee;
                              color: #6b7280;
                              font-size: 14px;
                            ">
                              Payment Status
                            </td>

                            <td align="right" style="
                              padding: 10px 0;
                              border-bottom: 1px solid #eeeeee;
                              color: #15803d;
                              font-weight: bold;
                              font-size: 14px;
                            ">
                              Successful
                            </td>
                          </tr>

                          <tr>
                            <td style="
                              padding: 10px 0;
                              color: #6b7280;
                              font-size: 14px;
                            ">
                              Policy Number
                            </td>

                            <td align="right" style="
                              padding: 10px 0;
                              color: #111827;
                              font-weight: bold;
                              font-size: 14px;
                            ">
                              ${quoteId || "Unavailable"}
                            </td>
                          </tr>

                        </table>

                      </td>
                    </tr>

                    <!-- Next Steps -->
                    <tr>
                      <td style="
                        padding: 0 40px 35px;
                      ">

                        <div style="
                          background-color: #f9fafb;
                          border-radius: 8px;
                          padding: 20px;
                        ">

                          <h3 style="
                            margin: 0 0 10px;
                            font-size: 16px;
                            color: #111827;
                          ">
                            What's Next?
                          </h3>

                          <p style="
                            margin: 0;
                            font-size: 14px;
                            line-height: 1.6;
                            color: #4b5563;
                          ">
                            Please keep this email for your records.
                            Your policy number may be required when contacting
                            WAS Insurance about your purchase.
                          </p>

                        </div>

                      </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                      <td style="
                        background-color: #111827;
                        padding: 25px 40px;
                        text-align: center;
                      ">

                        <p style="
                          margin: 0 0 8px;
                          color: #ffffff;
                          font-size: 14px;
                          font-weight: bold;
                        ">
                          WAS Insurance
                        </p>

                        <p style="
                          margin: 0;
                          color: #9ca3af;
                          font-size: 12px;
                        ">
                          Thank you for choosing WAS Insurance.
                        </p>

                        <p style="
                          margin: 12px 0 0;
                          color: #6b7280;
                          font-size: 11px;
                        ">
                          This is an automated confirmation email.
                        </p>

                      </td>
                    </tr>

                  </table>

                </td>
              </tr>
            </table>

          </body>
          </html>
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