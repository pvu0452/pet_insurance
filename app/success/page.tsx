"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function PlanComparisonPage() {
  const router = useRouter();
  const [PolicyNum, setPolicyNum] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Generate a random 6-digit insurance PolicyNum
    const randomNumber = Math.floor(100000 + Math.random() * 900000);

    const generatedPolicyNum = `WAS-${randomNumber}`;

    setPolicyNum(generatedPolicyNum);

    // Clear ALL session storage
    sessionStorage.clear();
  }, []);

  // Copy Policy Number to clipboard
  const handleCopy = async () => {
    if (!PolicyNum) return;

    try {
      await navigator.clipboard.writeText(PolicyNum);
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error("Failed to copy Policy Number:", error);
    }
  };

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

        {/* SUCCESS CARD */}
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

            {/* SUCCESS ICON */}
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

            {/* SUCCESS MESSAGE */}
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

          {/* CONTENT */}
          <div className="p-6">

            {/* Policy Number CARD */}
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
                Your Insurance Policy Number
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
                {PolicyNum || "Generating..."}
              </p>

              <p
                className="
                  text-sm
                  text-gray-500
                  mt-3
                "
              >
                Please keep this Policy Number for your records.
              </p>

              {/* COPY BUTTON */}
              <button
                type="button"
                onClick={handleCopy}
                disabled={!PolicyNum}
                className={`
                  mt-4
                  px-6
                  py-2.5
                  rounded-full
                  font-semibold
                  text-sm
                  transition
                  duration-200
                  ${
                    copied
                      ? "bg-green-600 text-white"
                      : "bg-gray-900 text-white hover:bg-gray-700"
                  }
                  ${
                    !PolicyNum
                      ? "opacity-50 cursor-not-allowed"
                      : "cursor-pointer"
                  }
                `}
              >
                {copied ? "✓ Copied!" : "Copy Policy Number"}
              </button>

            </div>

            {/* CONFIRMATION MESSAGE */}
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
                Your Policy Number is shown above. Please keep it for your records.
              </p>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}