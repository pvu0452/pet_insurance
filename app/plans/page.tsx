"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/* -----------------------------
   TYPES
------------------------------*/
type PlanKey = "upgraded" | "gold";

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
  { label: string; included: number[] }
> = {
  upgraded: { label: "Silver", included: [0,1,2,3] },
  gold: { label: "Gold", included: [0,1,2,3,4,5,6] },
};

/* -----------------------------
   MAIN PAGE
------------------------------*/
export default function PlanComparisonPage() {
  const router = useRouter();
  const [petDetails, setPetDetails] = useState<any>(null);


  useEffect(() => {

    const storedPet =
      sessionStorage.getItem("petDetails");


    if(storedPet){
      setPetDetails(JSON.parse(storedPet));
    }

  }, []);

  const [excess, setExcess] = useState(250);
  const [limit, setLimit] = useState(20000);
  const [benefit, setBenefit] = useState(80);

  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [prices, setPrices] = useState<Record<PlanKey, number | null>>({
  upgraded: null,
  gold: null,
});

  const steps = ["Quote", "Plans", "Details"];
  const currentStep = 1;

  const progress = (currentStep / (steps.length - 1)) * 100;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanKey | null>(null);

  async function getQuote(plan: PlanKey) {

    const today = new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone: "Australia/Brisbane",
      }
    ).format(new Date());

    const product =
      plan === "gold"
        ? {
            gold: {
              annual_limit: limit,
              benefit_percentage: benefit,
              annual_excess: excess,
            },
          }
        : {
            [plan]: {
              annual_limit: limit,
              benefit_percentage: benefit,
              annual_excess: excess,
            },
          };


    const payload = {

      payment_frequency: "monthly",

      customer: {
        suburb: "Lalor",
        state: "VIC",
        postcode: "3075",
        email: "pet@wiseandsilent.com",
      },


      pets: [
        {
          pet_no: "0",
          pet_name: "Pet",

          pet_type:
            petDetails?.petType === "dog"
              ? "Dog"
              : "Cat",

          pet_sex:
            petDetails?.gender === "male"
              ? "Male"
              : petDetails?.gender === "female"
              ? "Female"
              : "Male",

          pet_breed:
            petDetails?.breed || "",

          pet_dob:
            petDetails?.dob,

          policy_start_date:
            today,
        },
      ],

      ...product,
    };

    console.log(
      "SENDING PAYLOAD:",
      JSON.stringify(payload, null, 2)
    );
    const res = await fetch("/api/quote", {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify(payload),
    });


    return res.json();
  }
  
  const fetchAllPrices = async () => {
    try {
      setLoading(true);
      setError(null);

      const planKeys: PlanKey[] = ["upgraded", "gold"];

      const results = await Promise.all(
        planKeys.map(async (plan) => {

          const res = await getQuote(plan);

          console.log("PLAN:", plan);
          console.log("API RESPONSE:", res);


          const apiPlan = plan;

            console.log(
              "PRICE OBJECT:",
              JSON.stringify(res[apiPlan], null, 2)
            );

            const price =
            res[apiPlan]
              ?.data
              ?.quote
              ?.pets?.[0]
              ?.premiums
              ?.installment ?? null;


          return {
            plan,
            price,
          };

        })
      );

      const newPrices: Record<PlanKey, number | null> = {
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

    if (petDetails) {
      fetchAllPrices();
    }

  }, [petDetails, excess, limit, benefit]);

  return (
    <div className="min-h-screen">
      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* LOGO */}
        <img
          src="/was-logo.min.webp"
          className="w-28 opacity-70 mb-4"
        />

        {/* PROGRESS BAR */}
        <div className="relative mb-6">
          {/* Progress content */}
          <div className="relative pt-3">
            <div className="flex justify-between text-xs font-medium text-gray-600 mb-2">
              {steps.map((s) => (
                <span key={s}>{s}</span>
              ))}
            </div>

            <div className="relative w-full h-2 bg-gray-200 rounded-full">
              <div
                className="absolute h-2 bg-gray-800 rounded-full"
                style={{ width: `${progress}%` }}
              />
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
              {Array.from({ length: 26 }, (_, i) => {
              const value = 5000 + i * 1000;

              return (
                <option key={value} value={value}>
                  ${value.toLocaleString()}
                </option>
              );
            })}
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
              {Array.from({ length: 7 }, (_, i) => {
                const value = 60 + i * 5;

                return (
                  <option key={value} value={value}>
                    {value}%
                  </option>
                );
              })}
          
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
              {Array.from({ length: 21 }, (_, i) => {
                const value = i * 50;

                return (
                  <option key={value} value={value}>
                    ${value.toLocaleString()}
                  </option>
                );
              })}
            </select>
          </div>

        </div>

        {/* TABLE HEADER */}
        <div className="grid grid-cols-3 bg-gray-100 rounded-xl overflow-hidden text-sm border border-gray-200">
          <div className="p-3 font-semibold text-gray-900 border-r border-gray-200">
            Coverage
          </div>


          {/* COVERAGE */}
          <div className="mt-5 bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">

            {/* TABLE HEADER */}
            <div className="grid grid-cols-[1.2fr_0.9fr_0.9fr] sm:grid-cols-3 bg-gray-50 border-b border-gray-200">

              {/* COVERAGE HEADER */}
              <div className="px-4 py-4 flex items-end">
                <div>
                  <div className="text-sm font-bold text-gray-900">
                    Coverage
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5">
                    What's included
                  </div>
                </div>
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
                  className="grid grid-cols-3 bg-white border border-gray-200 rounded-lg overflow-hidden cursor-pointer"
                >
                  {/* LABEL */}
                  <div className="p-3 text-sm font-medium text-gray-900 border-r border-gray-200 flex items-center gap-1">
                    {f.short}
                    <span className="text-gray-400 text-xs">ⓘ</span>
                  </div>

                    <div className="mt-2">
                      <div
                        className={`text-sm font-bold ${
                          isSelected ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {plans[p].label}
                      </div>

                      <div
                        className={`mt-1 text-lg font-extrabold ${
                          isSelected ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {loading || prices[p] === null
                          ? "..."
                          : `$${prices[p]}`}
                      </div>

                      <div
                        className={`text-[10px] ${
                          isSelected
                            ? "text-white/70"
                            : "text-gray-500"
                        }`}
                      >
                        per month
                      </div>
                    </div>

                  </div>
                );
              })}

            </div>

            {/* COVERAGE ROWS */}
            {features.map((f, i) => {

              const isOpen = expandedRow === i;

              return (
                <div key={i}>

                  {/* ROW */}
                  <div
                    onClick={() =>
                      setExpandedRow(isOpen ? null : i)
                    }
                    className={`
                      grid
                      grid-cols-[1.2fr_0.9fr_0.9fr]
                      sm:grid-cols-3
                      items-stretch
                      border-b
                      border-gray-100
                      last:border-b-0
                      cursor-pointer
                      transition
                      ${
                        isOpen
                          ? "bg-gray-200"
                          : "hover:bg-gray-50"
                      }
                    `}
                  >

                    {/* FEATURE NAME */}
                    <div className="px-4 py-4 flex items-center">
                      <div className="flex items-center justify-between w-full">

                        <span className="text-sm font-medium text-gray-900">
                          {f.short}
                        </span>

                        <span
                          className={`
                            flex items-center justify-center
                            w-5 h-5
                            rounded-full
                            bg-gray-100
                            text-gray-500
                            flex-shrink-0
                            transition-transform
                            duration-200
                            ${isOpen ? "rotate-180" : ""}
                          `}
                        >
                          <svg
                            className="w-3 h-3"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="2.5"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M6 9l6 6 6-6"
                            />
                          </svg>
                        </span>

                      </div>
                    </div>


                    {/* SILVER */}
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPlan("upgraded");
                      }}
                      className={`
                        flex
                        items-center
                        justify-center
                        border-l
                        border-gray-100
                        transition
                        ${
                          selectedPlan === "upgraded"
                            ? "bg-slate-200/70"
                            : "bg-slate-50/20"
                        }
                      `}
                    >

                      {plans.upgraded.included.includes(i) ? (
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                          ✓
                        </span>
                      ) : (
                        <span className="text-gray-300">
                          —
                        </span>
                      )}

                    </div>


                    {/* GOLD */}
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPlan("gold");
                      }}
                      className={`
                        flex
                        items-center
                        justify-center
                        border-l
                        border-gray-100
                        transition
                        ${
                          selectedPlan === "gold"
                            ? "bg-amber-100/60"
                            : "bg-amber-50/30"
                        }
                      `}
                    >

                      {plans.gold.included.includes(i) ? (
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                          ✓
                        </span>
                      ) : (
                        <span className="text-gray-300">
                          —
                        </span>
                      )}

                    </div>

                  </div>


                  {/* DESCRIPTION */}
                  {isOpen && (
                    <div className="px-4 py-4 bg-blue-50 border-b border-blue-100">
                      <div className="flex items-start gap-3">

                        {/* INFO ICON */}
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                          i
                        </div>

                        {/* DESCRIPTION */}
                        <div>
                          <p className="text-xs font-semibold text-blue-900 mb-1">
                            About {f.short} coverage
                          </p>

                          <p className="text-xs leading-relaxed text-blue-800">
                            {f.full}
                          </p>
                        </div>

                      </div>
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

              sessionStorage.setItem(
                "cover",
                JSON.stringify({
                  plan: selectedPlan,
                  limit,
                  excess,
                  benefit,
                  price: prices[selectedPlan],
                })
              );

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