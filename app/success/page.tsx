"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function SuccessPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const quoteId =
    searchParams.get("quoteId") ||
    searchParams.get("policyId");

  return (
    <div
      className="min-h-screen text-gray-900 bg-cover bg-center bg-fixed"
      style={{
        backgroundImage: "url('/background.webp')",
      }}
    >
      <div className="max-w-2xl mx-auto px-4 py-6">

        <button
          type="button"
          onClick={() => router.push("/details")}
          className="block mx-auto mb-10"
          aria-label="Return to details"
        >
          <img
            src="/was-logo.min.webp"
            className="w-28 opacity-70 hover:opacity-100 transition"
            alt="WAS Insurance"
          />
        </button>

        <div
          className="
            bg-white
            border
            border-gray-200
            rounded-2xl
            shadow-sm
            overflow-hidden
          "
        >

          <div
            className="
              px-6
              py-8
              text-center
              bg-gray-50
              border-b
              border-gray-200
            "
          >

            <div
              className="
                mx-auto
                mb-5
                w-16
                h-16
                rounded-full
                bg-green-100
                flex
                items-center
                justify-center
                text-3xl
                text-green-700
              "
            >
              ✓
            </div>

            <h1
              className="
                text-2xl
                font-bold
                text-gray-900
              "
            >
              Payment Successful!
            </h1>

            <p
              className="
                text-sm
                text-gray-500
                mt-2
              "
            >
              Thank you for purchasing your pet insurance with WAS Insurance.
            </p>

          </div>

          <div className="p-6">

            <div
              className="
                border
                border-gray-200
                rounded-xl
                p-6
                text-center
                bg-white
              "
            >

              <p
                className="
                  text-sm
                  font-semibold
                  text-gray-500
                "
              >
                Your Insurance Quote ID
              </p>

              <p
                className="
                  text-3xl
                  font-extrabold
                  text-gray-900
                  mt-3
                  tracking-wide
                "
              >
                {quoteId || "Quote ID unavailable"}
              </p>

              <p
                className="
                  text-sm
                  text-gray-500
                  mt-3
                "
              >
                Please keep this Quote ID for your records.
              </p>

            </div>

            <div
              className="
                mt-6
                rounded-xl
                bg-gray-50
                border
                border-gray-200
                p-5
              "
            >

              <p
                className="
                  text-sm
                  text-gray-700
                  leading-6
                "
              >
                Your payment has been successfully processed and your
                insurance quote has been created.
              </p>

              <p
                className="
                  text-sm
                  text-gray-700
                  leading-6
                  mt-3
                "
              >
                Your Quote ID is shown above. Please keep it for your records.
              </p>

            </div>

          </div>

        </div>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SuccessPageContent />
    </Suspense>
  );
}