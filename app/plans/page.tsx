"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/* -----------------------------
   TYPES
------------------------------*/

type PlanKey = "upgraded" | "gold";

type PetPlanSettings = {
  plan: PlanKey | null;
  limit: number;
  benefit: number;
  excess: number;
};

/* -----------------------------
   FEATURES
------------------------------*/

const features = [
  {
    short: "Injury",
    full: "Vet costs if your pet is injured.",
  },
  {
    short: "Illness",
    full: "Vet costs if your pet suffers an illness.",
  },
  {
    short: "Euthanasia",
    full: "Vet costs for euthanasia.",
  },
  {
    short: "Boarding",
    full: "Emergency pet boarding.",
  },
  {
    short: "Therapies",
    full: "Vet costs for Specialised Therapies.",
  },
  {
    short: "Dental",
    full: "Vet costs if your pet suffers a dental illness.",
  },
  {
    short: "Behaviour",
    full: "Vet costs for behavioural conditions.",
  },
];

/* -----------------------------
   PLANS
------------------------------*/

const plans: Record<
  PlanKey,
  {
    label: string;
    included: number[];
  }
> = {
  upgraded: {
    label: "Silver",
    included: [0, 1, 2, 3],
  },
  gold: {
    label: "Gold",
    included: [0, 1, 2, 3, 4, 5, 6],
  },
};

/* -----------------------------
   MAIN PAGE
------------------------------*/

export default function PlanComparisonPage() {
  const router = useRouter();

  const [petDetails, setPetDetails] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  const [error, setError] = useState<string | null>(null);

  /*
   * Each pet has its own:
   * - plan
   * - annual limit
   * - benefit percentage
   * - annual excess
   */
  const [petSettings, setPetSettings] = useState<
    Record<number, PetPlanSettings>
  >({});

  /*
   * Quotes are stored per pet.
   */
  const [petQuotes, setPetQuotes] = useState<
    Record<number, Record<PlanKey, number | null>>
  >({});

  /*
   * Tracks quote loading for each pet.
   */
  const [loadingQuotes, setLoadingQuotes] = useState<
    Record<number, boolean>
  >({});

  /*
   * Coverage comparison is controlled separately
   * for each pet.
   */
  const [showCoverageComparison, setShowCoverageComparison] =
    useState<Record<number, boolean>>({});

  /*
   * Whether the current configuration should
   * be applied to all pets.
   */
  const [applyToAllPets, setApplyToAllPets] = useState(false);

  /*
   * Progress
   */
  const steps = ["Quote", "Plans", "Details"];
  const currentStep = 1;
  const progress = (currentStep / (steps.length - 1)) * 100;

  /* -----------------------------
     PET AGE
  ------------------------------*/

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

    if (years === 0 && months === 0) {
      const diffTime =
        today.getTime() - birthDate.getTime();

      const totalDays = Math.floor(
        diffTime / (1000 * 60 * 60 * 24)
      );

      return `${totalDays} ${
        totalDays === 1 ? "day" : "days"
      }`;
    }

    if (years === 0) {
      return `${months} ${
        months === 1 ? "month" : "months"
      }`;
    }

    if (months === 0) {
      return `${years} ${
        years === 1 ? "year" : "years"
      }`;
    }

    return `${years} ${
      years === 1 ? "year" : "years"
    }, ${months} ${
      months === 1 ? "month" : "months"
    }`;
  };

  /* -----------------------------
     LOAD PET DETAILS
  ------------------------------*/

  useEffect(() => {
    const storedPet =
      sessionStorage.getItem("petDetails");

    if (storedPet) {
      const parsed = JSON.parse(storedPet);

      setPetDetails(parsed);

      const pets = parsed?.pets ?? [];

      const initialSettings: Record<
        number,
        PetPlanSettings
      > = {};

      pets.forEach((_: any, index: number) => {
        initialSettings[index] = {
          plan: null,
          limit: 20000,
          benefit: 80,
          excess: 250,
        };
      });

      setPetSettings(initialSettings);
    }

    setMounted(true);
  }, []);

  /* -----------------------------
     QUOTE API
  ------------------------------*/

  async function getQuote(
    petIndex: number,
    plan: PlanKey,
    settings: PetPlanSettings
  ) {
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
              annual_limit: settings.limit,
              benefit_percentage: settings.benefit,
              annual_excess: settings.excess,
            },
          }
        : {
            upgraded: {
              annual_limit: settings.limit,
              benefit_percentage: settings.benefit,
              annual_excess: settings.excess,
            },
          };

    const pet =
      petDetails?.pets?.[petIndex];

    const payload = {
      payment_frequency: "monthly",

      customer: {
        suburb:
          petDetails?.addressDetails?.suburb || "",
        state:
          petDetails?.addressDetails?.state || "",
        postcode:
          petDetails?.addressDetails?.postcode || "",
        email: "pet@wiseandsilent.com",
      },

      pets: pet
        ? [
            {
              pet_no: String(petIndex),
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
            },
          ]
        : [],

      ...product,
    };

    console.log(
      "SENDING PET QUOTE:",
      JSON.stringify(payload, null, 2)
    );

    const res = await fetch("/api/quote", {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(
        "Quote request failed"
      );
    }

    return res.json();
  }

  /* -----------------------------
     FETCH PRICE FOR ONE PET
  ------------------------------*/

  async function fetchPetPrices(
    petIndex: number,
    settings: PetPlanSettings
  ) {
    setLoadingQuotes((current) => ({
      ...current,
      [petIndex]: true,
    }));

    try {
      const planKeys: PlanKey[] = [
        "upgraded",
        "gold",
      ];

      const results = await Promise.all(
        planKeys.map(async (plan) => {
          const res = await getQuote(
            petIndex,
            plan,
            settings
          );

          console.log(
            `PET ${petIndex} ${plan.toUpperCase()} RESPONSE:`,
            res
          );

          const apiPlan =
            plan === "gold"
              ? "gold"
              : "upgraded";

          const quotePets =
            res?.[apiPlan]?.data?.quote?.pets ?? [];

          const price = Number(
            quotePets?.[0]?.premiums?.installment ?? 0
          );

          return {
            plan,
            price: Number(price.toFixed(2)),
          };
        })
      );

      const newPrices: Record<
        PlanKey,
        number | null
      > = {
        upgraded: null,
        gold: null,
      };

      results.forEach(
        ({ plan, price }) => {
          newPrices[plan] = price;
        }
      );

      setPetQuotes((current) => ({
        ...current,
        [petIndex]: newPrices,
      }));
    } catch (e) {
      console.error(e);

      setError(
        "Failed to update quote. Please try again."
      );
    } finally {
      setLoadingQuotes((current) => ({
        ...current,
        [petIndex]: false,
      }));
    }
  }

  /* -----------------------------
     FETCH ALL PET PRICES
     
     Debounced so changing settings
     quickly does not fire an API call
     for every individual click.
  ------------------------------*/

  useEffect(() => {
    if (
      !mounted ||
      !petDetails?.pets?.length
    ) {
      return;
    }

    setError(null);

    const timeout = setTimeout(() => {
      const fetchPrices = async () => {
        try {
          const pets = petDetails.pets;

          const requests = pets.map(
            (_: any, index: number) => {
              const settings = petSettings[index];

              if (!settings) {
                return Promise.resolve();
              }

              return fetchPetPrices(
                index,
                settings
              );
            }
          );

          await Promise.all(requests);
        } catch (e) {
          console.error(e);

          setError(
            "We couldn't calculate your quote. Please try again."
          );
        }
      };

      fetchPrices();
    }, 400);

    return () => {
      clearTimeout(timeout);
    };
  }, [
    mounted,
    petDetails,
    Object.values(petSettings)
      .map(
        (settings) =>
          `${settings?.limit}-${settings?.benefit}-${settings?.excess}`
      )
      .join("|"),
  ]);
  /* -----------------------------
     SELECT PLAN
  ------------------------------*/

  const selectPlan = (
    petIndex: number,
    plan: PlanKey
  ) => {
    setPetSettings((current) => ({
      ...current,

      [petIndex]: {
        ...current[petIndex],
        plan,
      },
    }));
  };

  /* -----------------------------
     UPDATE PET SETTING
  ------------------------------*/

  const updatePetSetting = (
    petIndex: number,
    field:
      | "limit"
      | "benefit"
      | "excess",
    value: number
  ) => {
    setPetSettings((current) => ({
      ...current,

      [petIndex]: {
        ...current[petIndex],
        [field]: value,
      },
    }));
  };

  /* -----------------------------
     APPLY CURRENT PET TO ALL
  ------------------------------*/

  const applyCurrentPetToAll = (
    petIndex: number
  ) => {
    const source =
      petSettings[petIndex];

    if (!source) return;

    setPetSettings((current) => {
      const updated = {
        ...current,
      };

      petDetails?.pets?.forEach(
        (_: any, index: number) => {
          updated[index] = {
            ...source,
          };
        }
      );

      return updated;
    });

    setApplyToAllPets(true);
  };

  /* -----------------------------
     TOTAL PRICE
  ------------------------------*/

  const totalPrice =
    petDetails?.pets?.reduce(
      (
        total: number,
        _: any,
        index: number
      ) => {
        const settings =
          petSettings[index];

        if (!settings?.plan) {
          return total;
        }

        const price =
          petQuotes[index]?.[
            settings.plan
          ] ?? 0;

        return total + price;
      },
      0
    ) ?? 0;

  /* -----------------------------
     ALL PETS SELECTED
  ------------------------------*/

  const allPetsSelected =
    petDetails?.pets?.length > 0 &&
    petDetails.pets.every(
      (_: any, index: number) =>
        petSettings[index]?.plan
    );

  /* -----------------------------
     SAVE
  ------------------------------*/

  const saveCover = () => {
    sessionStorage.setItem(
      "cover",
      JSON.stringify({
        petSettings,

        plans: Object.fromEntries(
          Object.entries(
            petSettings
          ).map(
            ([index, settings]) => [
              index,
              settings.plan,
            ]
          )
        ),

        price: totalPrice,

        applyToAllPets,
      })
    );
  };

  /* -----------------------------
     CONTINUE
  ------------------------------*/

  const continueToDetails = () => {
    if (!allPetsSelected) {
      alert(
        "Please select a plan for every pet."
      );

      return;
    }

    saveCover();

    router.push("/details");
  };

  /* -----------------------------
     BACK
  ------------------------------*/

  const goBack = () => {
    saveCover();

    router.push("/");
  };

  /* -----------------------------
     PLAN TILE
  ------------------------------*/

  const renderPlanTile = (
    petIndex: number,
    plan: PlanKey,
    quotes: Record<PlanKey, number | null>
  ) => {
    const settings = petSettings[petIndex];

    const selected =
      settings?.plan === plan;

    const loading =
      loadingQuotes[petIndex] ?? false;

    const isGold = plan === "gold";

    return (
      <label
        className={`
          relative
          block
          min-h-[190px]
          rounded-md
          border
          p-5
          cursor-pointer
          transition-all
          duration-150
          text-center

          ${
            isGold
              ? selected
                ? "border-amber-600 bg-amber-200"
                : "border-amber-400 bg-amber-100 hover:bg-amber-200"
              : selected
                ? "border-slate-600 bg-slate-300"
                : "border-slate-400 bg-slate-100 hover:bg-slate-200"
          }
        `}
      >
        <input
          type="radio"
          name={`plan-${petIndex}`}
          value={plan}
          checked={selected}
          onChange={() =>
            selectPlan(
              petIndex,
              plan
            )
          }
          className="sr-only"
        />

        {/* RECOMMENDED */}

        {isGold && (
          <span
            className="
              absolute
              -top-3
              left-1/2
              -translate-x-1/2
              bg-amber-500
              text-white
              text-[10px]
              font-semibold
              px-3
              py-1
              rounded-full
              whitespace-nowrap
              shadow-sm
            "
          >
            Recommended
          </span>
        )}

        <div className="flex flex-col items-center">

          {/* RADIO */}

          <div
            className={`
              w-5
              h-5
              rounded-full
              border-2
              flex
              items-center
              justify-center
              bg-white

              ${
                isGold
                  ? selected
                    ? "border-amber-600"
                    : "border-amber-400"
                  : selected
                    ? "border-slate-600"
                    : "border-slate-400"
              }
            `}
          >
            {selected && (
              <div
                className={`
                  w-2.5
                  h-2.5
                  rounded-full

                  ${
                    isGold
                      ? "bg-amber-600"
                      : "bg-slate-600"
                  }
                `}
              />
            )}
          </div>

          {/* PLAN NAME */}

          <div
            className={`
              mt-4
              text-lg
              font-semibold

              ${
                isGold
                  ? "text-gray-900"
                  : "text-gray-900"
              }
            `}
          >
            {plan === "gold"
              ? "Gold"
              : "Silver"}
          </div>

          {/* PRICE */}

          <div
            className={`
              mt-2
              text-2xl
              font-bold

              ${
                isGold
                  ? "text-gray-900"
                  : "text-gray-900"
              }
            `}
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <span
                  className={`
                    inline-block
                    w-4
                    h-4
                    border-2
                    rounded-full
                    animate-spin

                    ${
                      isGold
                        ? "border-amber-200 border-t-amber-600"
                        : "border-slate-300 border-t-slate-600"
                    }
                  `}
                />

                <span className="text-sm font-medium text-slate-500">
                  Updating
                </span>
              </span>
            ) : quotes[plan] === null ? (
              "..."
            ) : (
              `$${quotes[plan]!.toFixed(2)}`
            )}
          </div>

          {/* PER MONTH */}

          <div
            className={`
              text-xs

              ${
                isGold
                  ? "text-amber-700"
                  : "text-slate-600"
              }
            `}
          >
            per month
          </div>

          {/* SELECTED */}

          {selected && (
            <div
              className={`
                mt-3
                text-xs
                font-semibold

                ${
                  isGold
                    ? "text-amber-700"
                    : "text-slate-600"
                }
              `}
            >
              Selected
            </div>
          )}

        </div>
      </label>
    );
  };
  /* -----------------------------
     COVERAGE COMPARISON
  ------------------------------*/

  const renderCoverageComparison = (
    petIndex: number
  ) => {
    const isOpen =
      showCoverageComparison[
        petIndex
      ] ?? false;

    const toggleComparison = () => {
      setShowCoverageComparison(
        (current) => ({
          ...current,
          [petIndex]: !isOpen,
        })
      );
    };

    return (
      <div className="mt-5">

        {/* EXPAND BUTTON */}

        <button
          type="button"
          onClick={toggleComparison}
          className="
            w-full
            flex
            items-center
            justify-between
            px-4
            py-4
            border
            border-gray-300
            rounded-md
            bg-white
            hover:bg-gray-50
            transition
            text-left
          "
        >
          <div>
            <div className="text-sm font-semibold text-gray-900">
              Compare Silver and Gold cover
            </div>

            <div className="text-xs text-gray-500 mt-1">
              See what's included with each plan
            </div>
          </div>

          <span
            className={`
              text-gray-500
              text-xs
              transition-transform
              duration-200
              ${
                isOpen
                  ? "rotate-180"
                  : ""
              }
            `}
          >
            ▼
          </span>
        </button>

        {/* TABLE */}

        {isOpen && (
          <div
            className="
              mt-3
              border
              border-gray-300
              rounded-md
              overflow-hidden
              bg-white
            "
          >
            {/* TABLE HEADER */}

            <div
              className="
                grid
                grid-cols-3
                bg-gray-50
                border-b
                border-gray-200
              "
            >
              <div className="px-3 py-3 text-xs font-semibold text-gray-600">
                Cover
              </div>

              <div className="px-3 py-3 text-xs font-semibold text-center text-gray-700">
                Silver
              </div>

              <div className="px-3 py-3 text-xs font-semibold text-center text-amber-700">
                Gold
              </div>
            </div>

            {/* TABLE ROWS */}

            {features.map(
              (feature, index) => {
                const silverIncluded =
                  plans.upgraded.included.includes(
                    index
                  );

                const goldIncluded =
                  plans.gold.included.includes(
                    index
                  );

                return (
                  <div
                    key={feature.short}
                    className="
                      grid
                      grid-cols-3
                      border-b
                      border-gray-100
                      last:border-b-0
                    "
                  >
                    {/* FEATURE */}

                    <div className="px-3 py-3">
                      <div className="text-xs font-medium text-gray-800">
                        {feature.short}
                      </div>

                      <div className="text-[10px] leading-4 text-gray-500 mt-0.5">
                        {feature.full}
                      </div>
                    </div>

                    {/* SILVER */}

                    <div className="px-3 py-3 flex items-center justify-center">
                      {silverIncluded ? (
                        <span className="text-sm font-bold text-gray-700">
                          ✓
                        </span>
                      ) : (
                        <span className="text-sm text-gray-300">
                          —
                        </span>
                      )}
                    </div>

                    {/* GOLD */}

                    <div className="px-3 py-3 flex items-center justify-center">
                      {goldIncluded ? (
                        <span className="text-sm font-bold text-amber-600">
                          ✓
                        </span>
                      ) : (
                        <span className="text-sm text-gray-300">
                          —
                        </span>
                      )}
                    </div>
                  </div>
                );
              }
            )}
          </div>
        )}
      </div>
    );
  };

  /* -----------------------------
     PET SECTION
  ------------------------------*/

  const renderPetSection = (
    pet: any,
    petIndex: number
  ) => {
    const settings =
      petSettings[petIndex];

    if (!settings) {
      return null;
    }

    const individualQuotes =
      petQuotes[petIndex] ?? {
        upgraded: null,
        gold: null,
      };

    /*
     * When applying one configuration
     * to all pets, display combined plan
     * prices in the plan tiles.
     */
    const quotes = applyToAllPets
      ? {
          upgraded:
            petDetails?.pets?.reduce(
              (
                total: number,
                _: any,
                index: number
              ) =>
                total +
                (petQuotes[index]
                  ?.upgraded ?? 0),
              0
            ) ?? 0,

          gold:
            petDetails?.pets?.reduce(
              (
                total: number,
                _: any,
                index: number
              ) =>
                total +
                (petQuotes[index]
                  ?.gold ?? 0),
              0
            ) ?? 0,
        }
      : individualQuotes;

    /*
     * Only the first pet section is rendered
     * when Apply to All is active.
     */
    if (
      applyToAllPets &&
      petIndex !== 0
    ) {
      return null;
    }

    return (
      <section
        key={petIndex}
        className="
          mb-6
          bg-white
          border
          border-gray-300
          rounded-md
          shadow-sm
          overflow-visible
        "
      >

        {/* -----------------------------
            HEADER
        ------------------------------ */}

        <div
          className="
            px-6
            py-5
            border-b
            border-gray-200
          "
        >

          {applyToAllPets ? (
            <>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Covering
              </div>

              <h2 className="mt-1 text-xl font-semibold text-gray-900">
                All pets
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                {petDetails?.pets
                  ?.map(
                    (p: any) =>
                      p.name
                  )
                  .join(" · ")}
              </p>
            </>
          ) : (
            <>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Pet {petIndex + 1}
              </div>

              <h2 className="mt-1 text-xl font-semibold text-gray-900">
                {pet.name}
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                {pet.petType === "dog"
                  ? "Dog"
                  : "Cat"}{" "}
                · {pet.breed} ·{" "}
                {getPetAge(pet.dob)}
              </p>
            </>
          )}

        </div>

        {/* -----------------------------
            COVER SETTINGS
        ------------------------------ */}

        <div className="px-6 py-6">

          <h3 className="text-base font-semibold text-gray-900">
            Cover settings
          </h3>

          <p className="mt-1 mb-5 text-sm text-gray-500">
            {applyToAllPets
              ? "These settings will apply to all pets."
              : `Adjust the level of cover you'd like for ${pet.name}.`}
          </p>

          <div className="grid gap-5">

            {/* ANNUAL LIMIT */}

            <div>
              <label
                htmlFor={`limit-${petIndex}`}
                className="
                  block
                  text-sm
                  font-medium
                  text-gray-700
                  mb-1.5
                "
              >
                Annual limit
              </label>

              <select
                id={`limit-${petIndex}`}
                value={settings.limit}
                onChange={(e) =>
                  updatePetSetting(
                    petIndex,
                    "limit",
                    Number(
                      e.target.value
                    )
                  )
                }
                className="
                  w-full
                  h-14
                  px-4
                  border
                  border-gray-400
                  rounded-md
                  bg-white
                  text-gray-900
                  text-base
                  focus:outline-none
                  focus:border-gray-800
                  focus:ring-1
                  focus:ring-gray-800
                  transition
                "
              >
                {Array.from(
                  {
                    length: 26,
                  },
                  (_, i) => {
                    const value =
                      5000 +
                      i * 1000;

                    return (
                      <option
                        key={value}
                        value={value}
                      >
                        $
                        {value.toLocaleString()}
                      </option>
                    );
                  }
                )}
              </select>
            </div>

            {/* BENEFIT */}

            <div>
              <label
                htmlFor={`benefit-${petIndex}`}
                className="
                  block
                  text-sm
                  font-medium
                  text-gray-700
                  mb-1.5
                "
              >
                Benefit percentage
              </label>

              <select
                id={`benefit-${petIndex}`}
                value={settings.benefit}
                onChange={(e) =>
                  updatePetSetting(
                    petIndex,
                    "benefit",
                    Number(
                      e.target.value
                    )
                  )
                }
                className="
                  w-full
                  h-14
                  px-4
                  border
                  border-gray-400
                  rounded-md
                  bg-white
                  text-gray-900
                  text-base
                  focus:outline-none
                  focus:border-gray-800
                  focus:ring-1
                  focus:ring-gray-800
                  transition
                "
              >
                {Array.from(
                  {
                    length: 7,
                  },
                  (_, i) => {
                    const value =
                      60 + i * 5;

                    return (
                      <option
                        key={value}
                        value={value}
                      >
                        {value}%
                      </option>
                    );
                  }
                )}
              </select>
            </div>

            {/* EXCESS */}

            <div>
              <label
                htmlFor={`excess-${petIndex}`}
                className="
                  block
                  text-sm
                  font-medium
                  text-gray-700
                  mb-1.5
                "
              >
                Annual excess
              </label>

              <select
                id={`excess-${petIndex}`}
                value={settings.excess}
                onChange={(e) =>
                  updatePetSetting(
                    petIndex,
                    "excess",
                    Number(
                      e.target.value
                    )
                  )
                }
                className="
                  w-full
                  h-14
                  px-4
                  border
                  border-gray-400
                  rounded-md
                  bg-white
                  text-gray-900
                  text-base
                  focus:outline-none
                  focus:border-gray-800
                  focus:ring-1
                  focus:ring-gray-800
                  transition
                "
              >
                {Array.from(
                  {
                    length: 21,
                  },
                  (_, i) => {
                    const value =
                      i * 50;

                    return (
                      <option
                        key={value}
                        value={value}
                      >
                        $
                        {value.toLocaleString()}
                      </option>
                    );
                  }
                )}
              </select>
            </div>

          </div>

          {/* -----------------------------
              CHOOSE PLAN
          ------------------------------ */}

          <div className="mt-8">

            <h3 className="text-base font-semibold text-gray-900">
              Choose your plan
            </h3>

            <p className="mt-1 mb-5 text-sm text-gray-500">
              {applyToAllPets
                ? "Choose the plan that will apply to all pets."
                : `Select the plan that best suits ${pet.name}.`}
            </p>

            <div className="grid grid-cols-2 gap-4">

              {renderPlanTile(
                petIndex,
                "upgraded",
                quotes
              )}

              {renderPlanTile(
                petIndex,
                "gold",
                quotes
              )}

            </div>

            {/* EXPANDABLE COMPARISON */}

            {renderCoverageComparison(
              petIndex
            )}

          </div>

          {/* -----------------------------
              APPLY TO ALL
          ------------------------------ */}

          {!applyToAllPets &&
            petDetails?.pets?.length >
              1 &&
            petIndex === 0 && (

              <label
                className="
                  mt-5
                  flex
                  items-start
                  gap-3
                  p-4
                  rounded-md
                  border
                  border-gray-300
                  bg-white
                  hover:bg-gray-50
                  cursor-pointer
                  transition
                "
              >

                <input
                  type="checkbox"
                  checked={
                    applyToAllPets
                  }
                  disabled={
                    !settings.plan
                  }
                  onChange={(e) => {
                    const checked =
                      e.target.checked;

                    if (checked) {
                      applyCurrentPetToAll(
                        petIndex
                      );
                    }
                  }}
                  className="
                    mt-1
                    w-4
                    h-4
                    accent-gray-800
                  "
                />

                <div>

                  <div className="text-sm font-semibold text-gray-900">
                    Apply this plan and cover
                    settings to all pets
                  </div>

                  <div className="mt-1 text-xs leading-5 text-gray-500">
                    Use the same plan, annual
                    limit, benefit percentage
                    and annual excess for every
                    pet.
                  </div>

                </div>

              </label>
            )}

          {/* -----------------------------
              ACTIVE ALL-PETS INDICATOR
          ------------------------------ */}

          {applyToAllPets &&
            petIndex === 0 && (

              <label
                className="
                  mt-5
                  flex
                  items-start
                  gap-3
                  p-4
                  rounded-md
                  border
                  border-gray-300
                  bg-gray-50
                  cursor-pointer
                "
              >

                <input
                  type="checkbox"
                  checked={true}
                  onChange={() =>
                    setApplyToAllPets(
                      false
                    )
                  }
                  className="
                    mt-1
                    w-4
                    h-4
                    accent-gray-800
                  "
                />

                <div>

                  <div className="text-sm font-semibold text-gray-900">
                    Apply this plan and cover
                    settings to all pets
                  </div>

                  <div className="mt-1 text-xs leading-5 text-gray-500">
                    All pets are using the same
                    plan and cover settings.
                    Untick this to configure them
                    individually.
                  </div>

                </div>

              </label>
            )}

        </div>
      </section>
    );
  };

  /* -----------------------------
     INITIAL PAGE LOADING
  ------------------------------*/

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">

        <div
          className="
            w-full
            max-w-sm
            bg-white
            rounded-md
            shadow-md
            border
            border-gray-300
            p-8
            text-center
          "
        >

          <div
            className="
              w-10
              h-10
              border-4
              border-gray-200
              border-t-gray-800
              rounded-full
              animate-spin
              mx-auto
              mb-5
            "
          />

          <h2 className="text-lg font-semibold text-gray-900">
            Calculating your quote
          </h2>

          <p className="text-sm text-gray-500 mt-2">
            Please wait while we calculate
            your premiums.
          </p>

        </div>

      </div>
    );
  }

  /* -----------------------------
     RENDER
  ------------------------------*/

  return (
    <div className="min-h-screen">

      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* -----------------------------
            LOGO
        ------------------------------ */}

        <img
          src="/was-logo.min.webp"
          className="
            w-28
            opacity-70
            mb-8
            mx-auto
            block
          "
          alt="WAS Insurance"
        />

        {/* -----------------------------
            PAGE TITLE
        ------------------------------ */}

        <div className="text-center mb-8">

          <h1 className="text-2xl font-semibold text-gray-900">
            Choose your cover
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Select your cover options and
            choose a plan for your pet.
          </p>

        </div>

        {/* -----------------------------
            PROGRESS
        ------------------------------ */}

        <div className="mb-8">

          <div className="flex justify-between text-xs font-medium text-gray-600 mb-2">
            {steps.map((step) => (
              <span key={step}>
                {step}
              </span>
            ))}
          </div>

          <div
            className="
              relative
              w-full
              h-1.5
              bg-gray-200
              rounded-full
              overflow-hidden
            "
          >

            <div
              className="
                absolute
                left-0
                top-0
                h-full
                bg-gray-800
                rounded-full
              "
              style={{
                width: `${progress}%`,
              }}
            />

          </div>

        </div>

        {/* -----------------------------
            PET CONFIGURATION
        ------------------------------ */}

        {petDetails?.pets?.map(
          (
            pet: any,
            index: number
          ) =>
            renderPetSection(
              pet,
              index
            )
        )}

        {/* -----------------------------
              TOTAL
          ------------------------------ */}

          {petDetails?.pets?.length > 1 && (
            <div
              className="
                mb-6
                bg-white
                border
                border-gray-200
                rounded-lg
                shadow-sm
                overflow-hidden
              "
            >

              {/* SUMMARY HEADER */}

              <div className="px-6 py-5">

                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Your cover
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Your monthly premium for all pets
                  </p>
                </div>

              </div>

              {/* PET BREAKDOWN */}

              <div className="px-4 pb-4">

                <div className="space-y-3">

                  {petDetails?.pets?.map(
                    (
                      pet: any,
                      index: number
                    ) => {

                      const selectedPlan =
                        petSettings[index]?.plan;

                      const price =
                        selectedPlan
                          ? petQuotes[index]?.[
                              selectedPlan
                            ] ?? 0
                          : 0;

                      const isLoading =
                        loadingQuotes[index] ?? false;

                      const isGold =
                        selectedPlan === "gold";

                      return (
                        <div
                          key={index}
                          className="
                            rounded-md
                            border
                            border-gray-200
                            bg-gray-50/50
                            px-4
                            py-4
                          "
                        >

                          {/* PET NAME + PRICE */}

                          <div className="flex items-start justify-between gap-4">

                            <div className="min-w-0">

                              <div className="flex items-center gap-2">

                                <div className="text-sm font-semibold text-gray-900">
                                  {pet.name}
                                </div>

                                {selectedPlan && (
                                  <span
                                    className={`
                                      inline-flex
                                      items-center
                                      px-2
                                      py-0.5
                                      rounded
                                      text-[10px]
                                      font-semibold
                                      uppercase
                                      tracking-wide

                                      ${
                                        isGold
                                          ? "bg-amber-100 text-amber-700"
                                          : "bg-slate-100 text-slate-700"
                                      }
                                    `}
                                  >
                                    {isGold
                                      ? "Gold"
                                      : "Silver"}
                                  </span>
                                )}

                              </div>

                              {/* COVER DETAILS */}

                              {selectedPlan && (
                                <div className="mt-2">

                                  <div className="text-xs text-gray-600">
                                    $
                                    {petSettings[
                                      index
                                    ]?.limit.toLocaleString()}{" "}
                                    annual limit
                                  </div>

                                  <div className="mt-0.5 text-xs text-gray-500">
                                    {
                                      petSettings[
                                        index
                                      ]?.benefit
                                    }%
                                    {" "}benefit · $
                                    {petSettings[
                                      index
                                    ]?.excess.toLocaleString()}{" "}
                                    excess
                                  </div>

                                </div>
                              )}

                            </div>

                            {/* PRICE */}

                            <div className="flex-shrink-0 text-right">

                              {isLoading ? (

                                <span className="inline-flex items-center gap-2 text-xs text-gray-500">

                                  <span
                                    className="
                                      w-3.5
                                      h-3.5
                                      border-2
                                      border-gray-300
                                      border-t-gray-700
                                      rounded-full
                                      animate-spin
                                    "
                                  />

                                  Updating

                                </span>

                              ) : (

                                <>
                                  <div className="text-base font-semibold text-gray-900">
                                    ${price.toFixed(2)}
                                  </div>

                                  <div className="text-[10px] text-gray-500">
                                    per month
                                  </div>
                                </>

                              )}

                            </div>

                          </div>

                        </div>
                      );
                    }
                  )}

                </div>

              </div>

              {/* TOTAL FOOTER */}

              <div
                className="
                  border-t
                  border-gray-200
                  bg-gray-50
                  px-6
                  py-5
                "
              >

                <div className="flex items-center justify-between">

                  <div>
                    <div className="text-sm font-semibold text-gray-900">
                      Total monthly premium
                    </div>

                    <div className="mt-0.5 text-xs text-gray-500">
                      For all insured pets
                    </div>
                  </div>

                  <div className="text-2xl font-bold text-gray-900">
                    ${totalPrice.toFixed(2)}
                  </div>

                </div>

              </div>

            </div>
          )}

        {/* -----------------------------
            ERROR
        ------------------------------ */}

        {error && (
          <div
            className="
              mb-6
              px-4
              py-4
              rounded-md
              border
              border-red-200
              bg-red-50
              text-sm
              text-red-700
            "
          >
            {error}
          </div>
        )}

        {/* -----------------------------
            BACK / NEXT
        ------------------------------ */}

        <div className="flex gap-3 pb-8">

          <button
            type="button"
            onClick={goBack}
            className="
              w-1/3
              h-12
              rounded-md
              border
              border-gray-400
              bg-white
              text-gray-800
              text-sm
              font-semibold
              hover:bg-gray-50
              active:bg-gray-100
              transition
            "
          >
            Back
          </button>

          <button
            type="button"
            onClick={
              continueToDetails
            }
            className="
              flex-1
              h-12
              rounded-md
              bg-amber-400
              hover:bg-amber-500
              active:bg-amber-600
              text-gray-900
              text-sm
              font-semibold
              shadow-sm
              transition
            "
          >
            Next
          </button>

        </div>

      </div>
    </div>
  );
}