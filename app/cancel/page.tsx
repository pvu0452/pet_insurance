"use client";

import { useRouter } from "next/navigation";

export default function PaymentCancelledPage() {
  const router = useRouter();

  return (
    <div
      className="min-h-screen text-gray-900 bg-cover bg-center bg-fixed"
      style={{
        backgroundImage: "url('/background.webp')",
      }}
    >
      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* WAS LOGO */}
        <button
          type="button"
          onClick={() => router.push("/")}
          className="block mx-auto mb-10"
          aria-label="Return to details"
        >
          <img
            src="/was-logo.min.webp"
            className="w-28 opacity-70 hover:opacity-100 transition"
            alt="WAS Insurance"
          />
        </button>

        {/* PAYMENT FAILED CARD */}
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

          {/* HEADER */}
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

            {/* FAILED ICON */}
            <div
              className="
                mx-auto
                mb-5
                w-16
                h-16
                rounded-full
                bg-red-100
                flex
                items-center
                justify-center
                text-3xl
                text-red-700
              "
            >
              ✕
            </div>

            {/* PAYMENT FAILED MESSAGE */}
            <h1
              className="
                text-2xl
                font-bold
                text-gray-900
              "
            >
              Payment Cancelled
            </h1>

            <p
              className="
                text-sm
                text-gray-500
                mt-2
              "
            >
              Your payment was not completed and your insurance policy
              has not been created.
            </p>

          </div>

          {/* CONTENT */}
          <div className="p-6">

            {/* INFORMATION CARD */}
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
                  text-gray-700
                "
              >
                Payment Not Completed
              </p>

              <p
                className="
                  text-sm
                  text-gray-500
                  mt-3
                  leading-6
                "
              >
                Your payment was cancelled or could not be completed.
                No insurance policy has been issued.
              </p>

              <p
                className="
                  text-sm
                  text-gray-500
                  mt-3
                  leading-6
                "
              >
                If you would still like to purchase pet insurance,
                please return to the quote page and try again.
              </p>

            </div>

            {/* TRY AGAIN BUTTON */}
            <div className="mt-6 text-center">

              <button
                type="button"
                onClick={() => router.push("/")}
                className="
                  px-6
                  py-3
                  rounded-full
                  bg-gray-900
                  text-white
                  font-semibold
                  text-sm
                  hover:bg-gray-700
                  transition
                  duration-200
                "
              >
                Return to Quote
              </button>

            </div>

            {/* SUPPORT MESSAGE */}
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
                  text-center
                "
              >
                If you believe this was an error, please try your
                payment again or contact WAS Insurance for assistance.
              </p>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
}