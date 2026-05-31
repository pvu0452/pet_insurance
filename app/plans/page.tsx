"use client";
import React from "react";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/* -----------------------------
   TYPES
------------------------------*/
type PetType = "dog" | "cat";
type PlanKey = "basic" | "upgraded" | "gold";

type QuoteRequest = {
  petType: PetType;
  plan: PlanKey;
  excess: number;
  limit: number;
  benefit: number;

  breed: string;
  dob: string;
  gender: string;
  address: string;
};

/* -----------------------------
   FEATURES
------------------------------*/
const features = [
  { short: "Injury", full: "Vet costs if your pet is injured." },
  { short: "Illness", full: "Vet costs if your pet suffers an illness." },
  { short: "Euthanasia", full: "Vet costs for euthanasia." },
  { short: "Boarding", full: "Emergency pet boarding." },
  { short: "Therapies", full: "Vet costs for Specialised Therapies." },
  { short: "Dental", full: "Vet costs if your pet suffers a dental illness." },
  { short: "Behaviour", full: "Vet costs for behavioural conditions." },
];

/* -----------------------------
   PLANS
------------------------------*/
const plans: Record<
  PlanKey,
  { label: string; base: number; included: number[] }
> = {
  basic: { label: "Basic", base: 30, included: [0, 1, 2] },
  upgraded: { label: "Upgraded", base: 45, included: [0, 1, 2, 3] },
  gold: { label: "Gold", base: 60, included: [0, 1, 2, 3, 4, 5, 6] },
};

/* -----------------------------
   MAIN PAGE
------------------------------*/
export default function PlanComparisonPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const petType = (searchParams.get("petType") as PetType) || "cat";
  const breed = searchParams.get("breed") || "";
  const dob = searchParams.get("dob") || "";
  const gender = searchParams.get("gender") || "";
  const [address, setAddress] = useState<string | null>(null);

  useEffect(() => {
    setAddress(sessionStorage.getItem("petAddress"));
  }, []);

  const [excess, setExcess] = useState(250);
  const [limit, setLimit] = useState(20000);
  const [benefit, setBenefit] = useState(80);

  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [prices, setPrices] = useState<Record<PlanKey, number | null>>({
  basic: null,
  upgraded: null,
  gold: null,
});

  const steps = ["Quote", "Plans", "Details", "Payment"];
  const currentStep = 1;

  const progress = (currentStep / (steps.length - 1)) * 100;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanKey | null>(null);

  async function getQuote(data: QuoteRequest) {
  const res = await fetch("/api/quote", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
    });

    return res.json();
  }
  
  const fetchAllPrices = async () => {
    try {
      setLoading(true);
      setError(null);

      const planKeys: PlanKey[] = ["basic", "upgraded", "gold"];

      const results = await Promise.all(
        planKeys.map(async (plan) => {
          const res = await getQuote({
            petType,
            plan,
            excess,
            limit,
            benefit,
            breed: breed ?? "",
            dob: dob ?? "",
            gender: gender ?? "",
            address: address ?? "",
          });

          return { plan, price: res.price };
        })
      );

      const newPrices: Record<PlanKey, number | null> = {
        basic: null,
        upgraded: null,
        gold: null,
      };

      results.forEach(({ plan, price }) => {
        newPrices[plan] = price;
      });

      setPrices(newPrices);
    } catch (e) {
      setError("Failed to fetch quote");
    } finally {
      setLoading(false);
    }
  };

useEffect(() => {
  fetchAllPrices();
}, [petType, excess, limit, benefit]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* LOGO */}
        <img
          src="/was-logo.min.webp"
          className="w-28 opacity-70 mb-4"
        />

        {/* PROGRESS BAR */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-gray-500 mb-2">
            {steps.map((s) => (
              <span key={s}>{s}</span>
            ))}
          </div>

          <div className="relative w-full h-2 bg-gray-200 rounded-full">
            <div
              className="absolute h-2 bg-gray-800 rounded-full"
              style={{ width: `${progress}%` }}
            />

            <div
              className="absolute -top-3"
              style={{
                left: `${progress}%`,
                transform: "translateX(-50%)",
              }}
            >
              <div className="text-2xl">
                {petType === "dog" ? "🐕" : "🐈"}
              </div>
            </div>
          </div>
        </div>

        {/* DROPDOWNS */}
        <div className="space-y-4 mb-6">

          <div>
            <label className="text-sm font-medium text-gray-800">
              Annual limit
            </label>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="mt-1 w-full p-2 border rounded-lg bg-white text-gray-900"
            >
              <option value={10000}>$10,000</option>
              <option value={20000}>$20,000</option>
              <option value={30000}>$30,000</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-800">
              Benefit percentage
            </label>
            <select
              value={benefit}
              onChange={(e) => setBenefit(Number(e.target.value))}
              className="mt-1 w-full p-2 border rounded-lg bg-white text-gray-900"
            >
              <option value={70}>70%</option>
              <option value={80}>80%</option>
              <option value={90}>90%</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-800">
              Annual excess
            </label>
            <select
              value={excess}
              onChange={(e) => setExcess(Number(e.target.value))}
              className="mt-1 w-full p-2 border rounded-lg bg-white text-gray-900"
            >
              <option value={100}>$100</option>
              <option value={250}>$250</option>
              <option value={500}>$500</option>
            </select>
          </div>

        </div>

        {/* TABLE HEADER */}
        <div className="grid grid-cols-4 bg-gray-100 rounded-xl overflow-hidden text-sm border border-gray-200">
          <div className="p-3 font-semibold text-gray-900 border-r border-gray-200">
            Coverage
          </div>

          {(Object.keys(plans) as PlanKey[]).map((p) => {
            const isSelected = selectedPlan === p;

            return (
              <div
                key={p}
                onClick={() => setSelectedPlan(p)}
                className={`p-3 text-center cursor-pointer transition border-r border-gray-200 last:border-r-0 ${
                  isSelected ? "bg-gray-700" : ""
                }`}
              >
                <div className={`font-semibold ${isSelected ? "text-white" : "text-gray-900"}`}>
                  {plans[p].label}
                </div>

                <div className={`text-2xl font-extrabold ${isSelected ? "text-white" : "text-gray-900"}`}>
                  {loading || prices[p] === null ? "..." : `$${prices[p]}`}
                </div>

                <div className={`text-xs ${isSelected ? "text-white/80" : "text-gray-600"}`}>
                  per month
                </div>
              </div>
            );
          })}
        </div>

        {/* FEATURES */}
        <div className="mt-2 space-y-2">

          {features.map((f, i) => {
            const isOpen = expandedRow === i;

            return (
              <div key={i}>
                {/* ROW */}
                <div
                  onClick={() => setExpandedRow(isOpen ? null : i)}
                  className="grid grid-cols-4 bg-white border border-gray-200 rounded-lg overflow-hidden cursor-pointer"
                >
                  {/* LABEL */}
                  <div className="p-3 text-sm font-medium text-gray-900 border-r border-gray-200 flex items-center gap-1">
                    {f.short}
                    <span className="text-gray-400 text-xs">ⓘ</span>
                  </div>

                  {(Object.keys(plans) as PlanKey[]).map((p) => {
                    const included = plans[p].included.includes(i);
                    const isSelected = selectedPlan === p;

                    return (
                      <div
                        key={p}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPlan(p);
                        }}
                        className={`p-3 text-center border-r border-gray-200 last:border-r-0 ${
                          isSelected ? "bg-gray-700" : ""
                        }`}
                      >
                        {included ? (
                          <span className="text-green-700 font-bold">
                            ✔
                          </span>
                        ) : (
                          <span className="text-red-600 font-bold">
                            ✕
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* EXPANDED TEXT */}
                {isOpen && (
                  <div className="bg-gray-50 text-sm text-gray-700 px-3 py-2 border border-t-0 border-gray-200 rounded-b-lg">
                    {f.full}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* NEXT BUTTON */}
        <div className="mt-6">
          <button
            onClick={() => {
              if (!selectedPlan) return alert("Select a plan first");
              router.push("/details");
            }}
            className="w-full bg-gray-800 text-white py-3 rounded-xl font-semibold"
          >
            Next → Details
          </button>
        </div>

      </div>
    </div>
  );
}