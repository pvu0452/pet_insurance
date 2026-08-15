"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/* -----------------------------
   TYPES
------------------------------*/
type PlanKey = "basic" | "upgraded" | "gold";

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
  basic: { label: "Basic", included: [0,1,2] },
  upgraded: { label: "Upgraded", included: [0,1,2,3] },
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
  basic: null,
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

      const planKeys: PlanKey[] = ["basic", "upgraded", "gold"];

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