"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/* -----------------------------
   TYPES
------------------------------*/
type PlanKey = "upgraded" | "gold";

type PetQuote = {
  name: string;
  type: string;
  breed: string;
  age: string;
  price: number;
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
  { label: string; included: number[] }
> = {
  upgraded: { label: "Silver", included: [0, 1, 2, 3] },
  gold: { label: "Gold", included: [0, 1, 2, 3, 4, 5, 6] },
};

/* -----------------------------
   MAIN PAGE
------------------------------*/
export default function PlanComparisonPage() {
  const router = useRouter();
  const [petDetails, setPetDetails] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const getPetAge = (dob: string) => {
    if (!dob) return "";

    const birthDate = new Date(dob + "T00:00:00");
    const today = new Date();

    let years =
      today.getFullYear() - birthDate.getFullYear();

    let months =
      today.getMonth() - birthDate.getMonth();

    let days =
      today.getDate() - birthDate.getDate();

    if (days < 0) {
      months--;
    }

    if (months < 0) {
      years--;
      months += 12;
    }

    // Less than 1 month old
    if (years === 0 && months === 0) {
      const diffTime =
        today.getTime() - birthDate.getTime();

      const totalDays = Math.floor(
        diffTime / (1000 * 60 * 60 * 24)
      );

      return `${totalDays} ${totalDays === 1 ? "day" : "days"
        }`;
    }

    // Less than 1 year old
    if (years === 0) {
      return `${months} ${months === 1 ? "month" : "months"
        }`;
    }

    // 1 year or older
    if (months === 0) {
      return `${years} ${years === 1 ? "year" : "years"
        }`;
    }

    return `${years} ${years === 1 ? "year" : "years"
      }, ${months} ${months === 1 ? "month" : "months"
      }`;
  };


  useEffect(() => {
    const storedPet = sessionStorage.getItem("petDetails");

    if (storedPet) {
      setPetDetails(JSON.parse(storedPet));
    }

    setMounted(true);
  }, []);

  const [excess, setExcess] = useState(250);
  const [limit, setLimit] = useState(20000);
  const [benefit, setBenefit] = useState(80);

  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [prices, setPrices] = useState<Record<PlanKey, number | null>>({
    upgraded: null,
    gold: null,
  });

  const [petQuotes, setPetQuotes] = useState<Record<PlanKey, PetQuote[]>>({
    upgraded: [],
    gold: [],
  });

  const steps = ["Quote", "Plans", "Details"];
  const currentStep = 1;

  const progress = (currentStep / (steps.length - 1)) * 100;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedPlan, setSelectedPlan] = useState<PlanKey | null>(null);
  const [selectedPlans, setSelectedPlans] = useState<Record<number, PlanKey>>({});

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
        suburb: petDetails?.addressDetails?.suburb || "",
        state: petDetails?.addressDetails?.state || "",
        postcode: petDetails?.addressDetails?.postcode || "",
        email: "pet@wiseandsilent.com",
      },


      pets: petDetails?.pets?.map(
        (pet: any, index: number) => ({
          pet_no: String(index),
          pet_name: pet.name,

          pet_type:
            pet.petType === "dog"
              ? "Dog"
              : "Cat",

          pet_sex:
            pet.gender === "male"
              ? "Male"
              : "Female",

          pet_breed: pet.breed,

          pet_dob: pet.dob,

          policy_start_date: today,
        })
      ),

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
          const quotePets = res[apiPlan]?.data?.quote?.pets ?? [];

          const petQuoteData: PetQuote[] = quotePets.map(
            (quotePet: any, index: number) => {
              const originalPet = petDetails?.pets?.[index];

              return {
                name: originalPet?.name,
                type:
                  originalPet?.petType === "dog"
                    ? "Dog"
                    : "Cat",

                breed: originalPet?.breed || "",

                age: getPetAge(originalPet?.dob),

                price: Number(
                  (quotePet.premiums?.installment ?? 0).toFixed(2)
                ),
              };
            }
          );

          const price = petQuoteData.reduce(
            (total, pet) => total + pet.price,
            0
          );

          return {
            plan,
            price: Number(price.toFixed(2)),
            petQuotes: petQuoteData,
          };
        })
      );

      const newPrices: Record<PlanKey, number | null> = {
        upgraded: null,
        gold: null,
      };

      results.forEach(({ plan, price, petQuotes }) => {
        newPrices[plan] = price;

        setPetQuotes((current) => ({
          ...current,
          [plan]: petQuotes,
        }));
      });

      setPrices(newPrices);

    } catch (e) {
      setError("Failed to fetch quote");
    } finally {
      setLoading(false);
    }

  };

  useEffect(() => {
    if (mounted && petDetails) {
      fetchAllPrices();
    }
  }, [mounted, petDetails, excess, limit, benefit]);

  const totalPrice = petQuotes.upgraded.reduce((total, silverPet, index) => {
    const selected = selectedPlans[index];

    if (selected === "gold") {
      return total + (petQuotes.gold[index]?.price ?? 0);
    }

    if (selected === "upgraded") {
      return total + silverPet.price;
    }

    return total;
  }, 0);

  return (
    <div className="min-h-screen">

      {(!mounted || loading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">

          <div className="bg-white rounded-2xl shadow-xl px-8 py-7 text-center mx-4">

            {/* Loading spinner */}
            <div className="w-10 h-10 border-4 border-gray-200 border-t-gray-800 rounded-full animate-spin mx-auto mb-4"></div>

            <h2 className="text-lg font-bold text-gray-900">
              Calculating your quote
            </h2>

            <p className="text-sm text-gray-500 mt-1">
              Please wait while we calculate your premiums.
            </p>

          </div>

        </div>
      )}

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



        {/* COVERAGE */}
        <div className="mt-20 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-visible">

        {/* COVERAGE HEADER AREA */}
        <div className="relative">

          {/* CARD BEHIND SILVER + GOLD */}
          <div
            className="
              absolute
              right-0
              -top-15
              w-[66.66%]
              h-24
              bg-[#0b2347]
              border
              border-[#0b2347]
              rounded-t-2xl
              shadow-md
              z-0
              flex
              items-start
              justify-center
              text-center
              pt-1
            "
>
            <div>
              <div className="text-base font-bold text-white">
                Choose your plan
              </div>

              <div className="text-sm text-white/90 mt-0.5">
                {petDetails?.pets?.length > 1
                  ? "Select a plan for all pets"
                  : "Select a plan to continue"}
              </div>
            </div>
          </div>

          {/* TABLE HEADER IN FRONT */}
          <div
            className="
              relative
              z-10
              grid
              grid-cols-[1.2fr_0.9fr_0.9fr]
              sm:grid-cols-3
              bg-gray-50
              border-b
              border-gray-200
              rounded-tl-2xl
            "
          >

            {/* COVERAGE HEADER */}
            <div className="px-4 py-4 flex items-end">
              <div>
                <div className="text-base font-bold text-gray-900">
                  Coverage
                </div>

                <div className="text-[13px] text-gray-500 mt-0.5">
                  {petDetails?.pets?.length > 1
                    ? "Select a plan for all pets"
                    : "What's included"}
                </div>
              </div>
            </div>

            {/* SILVER / GOLD */}
            {(Object.keys(plans) as PlanKey[]).map((p) => {
              const isSelected = selectedPlan === p;
              const isGold = p === "gold";

              return (
                <div
                  key={p}
                  onClick={() => {
                    setSelectedPlan(p);

                    setSelectedPlans(
                      Object.fromEntries(
                        petDetails?.pets?.map((_: any, index: number) => [
                          index,
                          p,
                        ]) ?? []
                      )
                    );
                  }}
                  className={`
                    relative
                    px-3
                    py-4
                    text-center
                    cursor-pointer
                    border-l
                    border-gray-200
                    transition
                    ${
                      isSelected
                        ? "bg-gray-800 text-white"
                        : isGold
                          ? "bg-amber-100/80 hover:bg-amber-100"
                          : "bg-slate-200/80 hover:bg-slate-200"
                    }
                  `}
                >

                  {isGold && (
                    <div className="absolute -top-0 left-1/2 -translate-x-1/2">
                      <span
                        className={`
                          text-[9px]
                          font-semibold
                          px-2
                          py-0.5
                          rounded-full
                          whitespace-nowrap
                          ${
                            isSelected
                              ? "bg-white text-gray-800"
                              : "bg-gray-800 text-white"
                          }
                        `}
                      >
                        Recommended
                      </span>
                    </div>
                  )}

                  <div className="mt-2">

                    <div
                      className={`text-sm font-bold ${
                        isSelected
                          ? "text-white"
                          : "text-gray-900"
                      }`}
                    >
                      {plans[p].label}
                    </div>

                    <div
                      className={`mt-1 text-lg font-extrabold ${
                        isSelected
                          ? "text-white"
                          : "text-gray-900"
                      }`}
                    >
                      {loading || prices[p] === null
                        ? "..."
                        : `$${prices[p]?.toFixed(2)}`}
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
            ${isOpen
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

                      setSelectedPlans(
                        Object.fromEntries(
                          petDetails?.pets?.map((_: any, index: number) => [
                            index,
                            "upgraded",
                          ]) ?? []
                        )
                      );
                    }}
                    className={`
              flex
              items-center
              justify-center
              border-l
              border-gray-100
              transition
              ${selectedPlan === "upgraded"
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

                      setSelectedPlans(
                        Object.fromEntries(
                          petDetails?.pets?.map((_: any, index: number) => [
                            index,
                            "gold",
                          ]) ?? []
                        )
                      );
                    }}
                    className={`
              flex
              items-center
              justify-center
              border-l
              border-gray-100
              transition
              ${selectedPlan === "gold"
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

                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                        i
                      </div>

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

        {/* OR DIVIDER */}
        {petDetails?.pets?.length > 1 && (
          <div className="my-8">

            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-gray-300"></div>

              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gray-800 shadow-md">
                <span className="text-sm font-extrabold text-white">
                  OR
                </span>
              </div>

              <div className="flex-1 h-px bg-gray-300"></div>
            </div>

            <p className="text-center text-sm font-semibold text-gray-800 mt-3">
              Choose different plans for each pet
            </p>

          </div>
        )}
        {petDetails?.pets?.length > 1 && (
          <>
            {/* TABLE HEADER */}

            <div className="grid grid-cols-[25%_25%_25%_25%] bg-white border-b border-gray-100 last:border-b-0">

              <div className="px-4 py-3 bg-gray-50 text-[10px] font-semibold text-gray-500">
                Pet
              </div>

              <div className="px-4 py-3 bg-gray-50 text-[10px] font-semibold text-gray-500">
                Breed
              </div>

              {/* SILVER HEADER */}
              <div
                onClick={() => {
                  setSelectedPlan("upgraded");

                  setSelectedPlans(
                    Object.fromEntries(
                      petDetails?.pets?.map((_: any, index: number) => [
                        index,
                        "upgraded",
                      ]) ?? []
                    )
                  );
                }}
                className={`
                  px-4 py-3
                  text-[10px]
                  font-semibold
                  text-center
                  cursor-pointer
                  border-l
                  border-gray-200
                  transition
                  ${petDetails?.pets?.some(
                  (_: any, index: number) => selectedPlans[index] === "upgraded"
                )
                    ? "bg-gray-800 text-white"
                    : "bg-slate-200/80 text-gray-700 hover:bg-slate-200"
                  }
                `}
              >
                Silver
              </div>

              {/* GOLD HEADER */}
              <div
                onClick={() => {
                  setSelectedPlan("gold");

                  setSelectedPlans(
                    Object.fromEntries(
                      petDetails?.pets?.map((_: any, index: number) => [
                        index,
                        "gold",
                      ]) ?? []
                    )
                  );
                }}
                className={`
                  px-4 py-3
                  text-[10px]
                  font-semibold
                  text-center
                  cursor-pointer
                  border-l
                  border-gray-200
                  transition
                  ${petDetails?.pets?.some(
                  (_: any, index: number) => selectedPlans[index] === "gold"
                )
                    ? "bg-gray-800 text-white"
                    : "bg-amber-100/80 text-gray-700 hover:bg-amber-100"
                  }
                `}
              >
                Gold
              </div>

            </div>

            {/* PETS */}
            {petQuotes.upgraded.map((silverPet, index) => {
              const goldPet = petQuotes.gold[index];

              return (
                <div
                  key={index}
                  className="grid grid-cols-[25%_25%_25%_25%] bg-white border-b border-gray-100 last:border-b-0"
                >

                  {/* PET */}
                  <div className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900">
                      {silverPet.name}
                    </div>

                    <div className="text-[10px] text-gray-500">
                      {silverPet.type} · {silverPet.age}
                    </div>
                  </div>

                  {/* BREED */}
                  <div className="px-4 py-3 text-xs text-gray-700">
                    {silverPet.breed}
                  </div>

                  {/* SILVER PRICE */}
                  <div
                    onClick={() => {
                      setSelectedPlans((current) => ({
                        ...current,
                        [index]: "upgraded",
                      }));
                    }}
                    className={`
                      px-4 py-3
                      text-center
                      cursor-pointer
                      border-l
                      border-gray-100
                      transition
                      ${selectedPlans[index] === "upgraded"
                        ? "bg-slate-200/70"
                        : "bg-slate-50/20 hover:bg-slate-100"
                      }
                    `}
                  >
                    <div className="text-sm font-bold text-gray-900">
                      ${silverPet.price.toFixed(2)}
                    </div>
                  </div>

                  {/* GOLD PRICE */}
                  <div
                    onClick={() => {
                      setSelectedPlans((current) => ({
                        ...current,
                        [index]: "gold",
                      }));
                    }}
                    className={`
                      px-4 py-3
                      text-center
                      cursor-pointer
                      border-l
                      border-gray-100
                      transition
                      ${selectedPlans[index] === "gold"
                        ? "bg-amber-100/60"
                        : "bg-amber-50/30 hover:bg-amber-100/50"
                      }
                    `}
                  >
                    <div className="text-sm font-bold text-gray-900">
                      ${goldPet?.price.toFixed(2) ?? "..."}
                    </div>
                  </div>

                </div>
              );
            })}

            {/* TOTAL */}
            <div className="px-4 py-5 bg-gray-50 border-t border-gray-200 flex items-center justify-between">

              <div>
                <div className="text-sm font-semibold text-gray-900">
                  Total
                </div>

                <div className="text-[10px] text-gray-500">
                  Monthly premium
                </div>
              </div>

              <div className="text-right">
                <div className="text-xl font-extrabold text-gray-900">
                  ${totalPrice.toFixed(2)}
                </div>

                <div className="text-[10px] text-gray-500">
                  per month
                </div>
              </div>

            </div>
          </>
        )}

        {/* BACK / NEXT BUTTONS */}
        <div className="mt-6 flex gap-3">

          {/* BACK */}
          <button
            onClick={() => {
              sessionStorage.setItem(
                "cover",
                JSON.stringify({
                  plans: selectedPlans,
                  limit,
                  excess,
                  benefit,
                  price: totalPrice,
                })
              );

              router.push("/");
            }}
            className="w-1/3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 py-3 rounded-xl font-semibold transition"
          >
            Back
          </button>

          {/* NEXT */}
          <button
            onClick={() => {
              if (
                !petDetails?.pets?.length ||
                Object.keys(selectedPlans).length !== petDetails.pets.length
              ) {
                return alert("Select a plan for each pet");
              }

              sessionStorage.setItem(
                "cover",
                JSON.stringify({
                  plans: selectedPlans,
                  limit,
                  excess,
                  benefit,
                  price: totalPrice,
                })
              );

              router.push("/details");
            }}
            className="flex-1 bg-amber-400 hover:bg-amber-500 text-gray-900 py-3 rounded-xl font-semibold transition"
          >
            Next
          </button>

        </div>

      </div >
    </div >
  );
}