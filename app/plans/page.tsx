"use client";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams, } from "next/navigation";
/**
 * HANDOVER — Plans page (app/plans/page.tsx)
 *
 * Step 2 of the pet insurance purchase flow. Restores pets and their address
 * from the URL (preferred) or sessionStorage ("petDetails"). Customers then
 * choose Silver (API key "upgraded") or Gold, with per-pet cover settings.
 *
 * The pricing integration POSTs one pet at a time to /api/quote and requests
 * both plans. Prices shown are monthly instalments from the WAS quote API.
 * Before navigating to /details, selections are saved to sessionStorage
 * ("cover") and serialized into the next page's URL. Those field names are
 * consumed by the Details/payment flow; change them only across all pages.
 *
 * A 400 ms debounce avoids excessive repricing while settings change.
 * AbortController prevents old HTTP responses from overwriting newer prices.
 */
type PlanKey = "upgraded" | "gold";
type PetPlanSettings = {
  plan: PlanKey | null;
  limit: number;
  benefit: number;
  excess: number;
};
type Pet = {
  name: string;
  petType: "dog" | "cat" | null;
  gender: "male" | "female" | null;
  breed: string;
  dob: string;
};
type AddressDetails = {
  address?: string;
  fullAddress?: string;
  streetAddress?: string;
  suburb?: string;
  state?: string;
  postcode?: string;
};
type PetDetails = {
  pets: Pet[];
  addressDetails?: AddressDetails;
  firstName?: string;
  first_name?: string;
  lastName?: string;
  last_name?: string;
  email?: string;
  customerEmail?: string;
  mobile?: string;
  phone?: string;
  mobileNumber?: string;
};
type StoredCover = {
  petSettings?: Record<string, PetPlanSettings>;
  plans?: Record<string, PlanKey | null>;
  price?: number;
  applyToAllPets?: boolean;
};
type UrlPet = {
  pet_name?: string;
  pet_type?: string;
  pet_sex?: string;
  pet_breed?: string;
  pet_dob?: string;
  selectedPlan?: string | null;
  annual_limit?: number | string | null;
  benefit_percentage?: number | string | null;
  annual_excess?: number | string | null;
};
type QuoteResponse = Partial<Record<PlanKey, {
  data?: {
    quote?: {
      pets?: Array<{
        premiums?: {
          installment?: number | string;
        };
      }>;
    };
  };
}>>;
// NOTE: "upgraded" is the WAS API's name for the Silver product.
const PLAN_KEYS: PlanKey[] = ["upgraded", "gold"];
const DEFAULT_COVER: PetPlanSettings = {
  plan: null,
  limit: 20000,
  benefit: 80,
  excess: 250,
};
const STEPS = ["Quote", "Plans", "Details"];
const PLAN_PROGRESS = 50; // The second of three steps.
// These ranges match the existing dropdown values and are not API-generated.
const ANNUAL_LIMIT_OPTIONS = Array.from({ length: 26 }, (_, i) => 5000 + i * 1000);
const BENEFIT_OPTIONS = Array.from({ length: 7 }, (_, i) => 60 + i * 5);
const EXCESS_OPTIONS = Array.from({ length: 21 }, (_, i) => i * 50);
/**
 * HANDOVER — UI consistency: match Details/Quote (48px controls, rounded-xl,
 * grey borders, amber primary actions and inline red errors). Keep the
 * Silver/Gold colours separate because they communicate cover tiers.
 */
const COVER_SELECT_CLASS = `
  w-full h-12 pl-4 pr-[45px] border border-gray-300
  rounded-xl bg-white text-gray-900 text-sm
  appearance-none focus:outline-none focus:ring-2 focus:ring-gray-800
  focus:border-transparent cursor-pointer
`;
function SelectChevron() {
  return (<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute right-[15px] top-1/2 -translate-y-1/2 pointer-events-none text-[#555]">
    <polyline points="6 9 12 15 18 9" />
  </svg>);
}
/** Policy start dates must use the Australia/Brisbane calendar date. */
function brisbaneToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Brisbane" }).format(new Date());
}
function getPetAge(dob: string): string {
  if (!dob)
    return "";
  const birthDate = new Date(dob + "T00:00:00");
  const today = new Date();
  let years = today.getFullYear() - birthDate.getFullYear();
  let months = today.getMonth() - birthDate.getMonth();
  const days = today.getDate() - birthDate.getDate();
  if (days < 0)
    months--;
  if (months < 0) {
    years--;
    months += 12;
  }
  if (years === 0 && months === 0) {
    const totalDays = Math.floor((today.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24));
    return `${totalDays} ${totalDays === 1 ? "day" : "days"}`;
  }
  if (years === 0)
    return `${months} ${months === 1 ? "month" : "months"}`;
  if (months === 0)
    return `${years} ${years === 1 ? "year" : "years"}`;
  return `${years} ${years === 1 ? "year" : "years"}, ${months} ${months === 1 ? "month" : "months"}`;
}
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
const plans: Record<PlanKey, {
  label: string;
  included: number[];
}> = {
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
function PlanComparisonContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [petDetails, setPetDetails] = useState<PetDetails | null>(null);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // HANDOVER: Show inline validation only after the customer tries to continue.
  // Missing-plan errors automatically disappear as each pet gets a plan.
  const [showPlanErrors, setShowPlanErrors] = useState(false);
  /*
   * Each pet has its own:
   * - plan
   * - annual limit
   * - benefit percentage
   * - annual excess
   */
  const [petSettings, setPetSettings] = useState<Record<number, PetPlanSettings>>({});
  /*
   * Quotes are stored per pet.
   */
  const [petQuotes, setPetQuotes] = useState<Record<number, Record<PlanKey, number | null>>>({});
  /*
   * Tracks quote loading for each pet.
   */
  const [loadingQuotes, setLoadingQuotes] = useState<Record<number, boolean>>({});
  /*
   * Coverage comparison is controlled separately
   * for each pet.
   */
  const [showCoverageComparison, setShowCoverageComparison,] = useState<Record<number, boolean>>({});
  /*
   * Whether the current configuration should
   * be applied to all pets.
   */
  const [applyToAllPets, setApplyToAllPets] = useState(false);
  /* -----------------------------
     LOAD PET DETAILS + COVER
     
     URL is preferred when present.
     sessionStorage remains the fallback.
------------------------------*/
  useEffect(() => {
    try {
      const storedPet = sessionStorage.getItem("petDetails");
      const storedCover = sessionStorage.getItem("cover");
      /*
       * Start with sessionStorage.
       */
      let parsedPet: PetDetails | null = storedPet ? JSON.parse(storedPet) : null;
      let savedCover: StoredCover | null = storedCover ? JSON.parse(storedCover) : null;
      /*
       * If the URL contains pets,
       * use that as the source of truth.
       */
      const urlPets = searchParams.get("pets");
      if (urlPets) {
        try {
          const parsedUrlPets: UrlPet[] = JSON.parse(urlPets);
          if (!Array.isArray(parsedUrlPets))
            throw new Error("Invalid pets in quote URL");
          /*
           * Keep the URL pet information,
           * but convert it back into the
           * structure used by this application.
           */
          const restoredPets: Pet[] = parsedUrlPets.map((pet) => ({
            name: pet.pet_name ?? "",
            petType: (pet.pet_type ?? "").toLowerCase() === "dog"
              ? "dog"
              : (pet.pet_type ?? "").toLowerCase() === "cat" ? "cat" : null,
            gender: (pet.pet_sex ?? "").toLowerCase() === "male"
              ? "male"
              : (pet.pet_sex ?? "").toLowerCase() === "female" ? "female" : null,
            breed: pet.pet_breed ?? "",
            dob: pet.pet_dob ?? "",
          }));
          /*
           * If we already have session data,
           * preserve any additional properties
           * that may exist on petDetails.
           */
          parsedPet = {
            ...(parsedPet ?? {}),
            firstName: searchParams.get("first_name") ??
              parsedPet?.firstName ??
              "",
            lastName: searchParams.get("last_name") ??
              parsedPet?.lastName ??
              "",
            email: searchParams.get("email") ??
              parsedPet?.email ??
              "",
            mobile: searchParams.get("mobile") ??
              parsedPet?.mobile ??
              "",
            addressDetails: {
              ...(parsedPet?.addressDetails ??
                {}),
              address: searchParams.get("address") ??
                parsedPet
                  ?.addressDetails
                  ?.address ??
                "",
              suburb: searchParams.get("region") ??
                parsedPet
                  ?.addressDetails
                  ?.suburb ??
                "",
              state: searchParams.get("state") ??
                parsedPet
                  ?.addressDetails
                  ?.state ??
                "",
              postcode: searchParams.get("postcode") ??
                parsedPet
                  ?.addressDetails
                  ?.postcode ??
                "",
            },
            pets: restoredPets,
          };
          /*
           * Reconstruct cover settings from
           * the URL.
           */
          const urlPetSettings: Record<number, PetPlanSettings> = {};
          parsedUrlPets.forEach((pet: UrlPet, index: number) => {
            const rawPlan = pet.selectedPlan;
            const plan = rawPlan ===
              "gold" ||
              rawPlan ===
              "upgraded"
              ? rawPlan
              : null;
            urlPetSettings[index] = {
              plan,
              limit: pet.annual_limit !=
                null
                ? Number(pet.annual_limit)
                : 20000,
              benefit: pet.benefit_percentage !=
                null
                ? Number(pet.benefit_percentage)
                : 80,
              excess: pet.annual_excess !=
                null
                ? Number(pet.annual_excess)
                : 250,
            };
          });
          savedCover = {
            ...(savedCover ?? {}),
            petSettings: urlPetSettings,
          };
          /*
           * Save the URL state back into
           * sessionStorage immediately.
           *
           * This keeps the payment flow
           * working if the user came directly
           * from a shared URL.
           */
          sessionStorage.setItem("petDetails", JSON.stringify(parsedPet));
          sessionStorage.setItem("cover", JSON.stringify({
            ...savedCover,
            petSettings: urlPetSettings,
            plans: Object.fromEntries(Object.entries(urlPetSettings).map(([index, settings,]) => [
              index,
              settings.plan,
            ])),
            price: Number(searchParams.get("price")) || 0,
          }));
        }
        catch (urlError) {
          console.error("Failed to parse URL pet data:", urlError);
        }
      }
      if (parsedPet) {
        setPetDetails(parsedPet);
        const pets = parsedPet?.pets ?? [];
        /*
         * Default settings.
         */
        const initialSettings: Record<number, PetPlanSettings> = {};
        pets.forEach((_, index: number) => {
          initialSettings[index] = { ...DEFAULT_COVER };
        });
        /*
         * Restore saved cover settings.
         */
        if (savedCover?.petSettings) {
          Object.entries(savedCover.petSettings).forEach(([index, settings,]) => {
            initialSettings[Number(index)] =
              settings as PetPlanSettings;
          });
        }
        if (typeof savedCover
          ?.applyToAllPets ===
          "boolean") {
          setApplyToAllPets(savedCover.applyToAllPets);
        }
        setPetSettings(initialSettings);
      }
    }
    catch (e) {
      console.error("Failed to load saved quote:", e);
      setError("We couldn't restore your quote. Please start again.");
    }
    setMounted(true);
  }, [searchParams]);
  /* -----------------------------
     PRICING API
 
     The upstream quote endpoint accepts one pet and one plan per request.
     We request both Silver and Gold even when neither is selected yet.
  ------------------------------*/
  const getQuote = useCallback(async (petIndex: number, plan: PlanKey, settings: Pick<PetPlanSettings, "limit" | "benefit" | "excess">, signal: AbortSignal): Promise<QuoteResponse> => {
    const pet = petDetails?.pets?.[petIndex];
    if (!pet)
      throw new Error(`Missing pet at index ${petIndex}`);
    const payload = {
      payment_frequency: "monthly",
      customer: {
        suburb: petDetails?.addressDetails?.suburb || "",
        state: petDetails?.addressDetails?.state || "",
        postcode: petDetails?.addressDetails?.postcode || "",
        // Integration placeholder; customer contact details are collected later.
        email: "pet@wiseandsilent.com",
      },
      pets: [{
        pet_no: String(petIndex),
        pet_name: pet.name,
        pet_type: pet.petType === "dog" ? "Dog" : "Cat",
        pet_sex: pet.gender === "male" ? "Male" : "Female",
        pet_breed: pet.breed,
        pet_dob: pet.dob,
        policy_start_date: brisbaneToday(),
      }],
      [plan]: {
        annual_limit: settings.limit,
        benefit_percentage: settings.benefit,
        annual_excess: settings.excess,
      },
    };
    const response = await fetch("/api/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal,
    });
    if (!response.ok)
      throw new Error("Quote request failed");
    return (await response.json()) as QuoteResponse;
  }, [petDetails]);
  /** Price both plans for a single pet and ignore cancelled requests. */
  const fetchPetPrices = useCallback(async (petIndex: number, settings: Pick<PetPlanSettings, "limit" | "benefit" | "excess">, signal: AbortSignal) => {
    if (signal.aborted)
      return;
    setLoadingQuotes((current) => ({ ...current, [petIndex]: true }));
    try {
      const results = await Promise.all(PLAN_KEYS.map(async (plan) => {
        const response = await getQuote(petIndex, plan, settings, signal);
        const installment = response[plan]?.data?.quote?.pets?.[0]?.premiums?.installment ?? 0;
        return { plan, price: Number(Number(installment).toFixed(2)) };
      }));
      if (signal.aborted)
        return;
      const prices: Record<PlanKey, number | null> = { upgraded: null, gold: null };
      for (const { plan, price } of results)
        prices[plan] = price;
      setPetQuotes((current) => ({ ...current, [petIndex]: prices }));
    }
    catch (error) {
      if (signal.aborted)
        return;
      console.error("Failed to update pet quote:", error);
      setError("Failed to update quote. Please try again.");
    }
    finally {
      // An older request must not turn off the spinner for its replacement.
      if (!signal.aborted) {
        setLoadingQuotes((current) => ({ ...current, [petIndex]: false }));
      }
    }
  }, [getQuote]);
  /*
   * Only the pricing inputs belong in the dependency key.
   * Switching the selected plan does not require another quote; we already
   * have a price for each plan. Keep this key in sync with API pricing fields.
   */
  const pricingInputsKey = JSON.stringify(Object.fromEntries(Object.entries(petSettings).map(([index, settings]) => [
    index,
    { limit: settings.limit, benefit: settings.benefit, excess: settings.excess },
  ])));
  /* -----------------------------
     DEBOUNCED REPRICING
 
     Cancel both the pending timer and any in-flight requests when a setting
     changes or the customer navigates away. This avoids stale quote prices.
  ------------------------------*/
  useEffect(() => {
    if (!mounted || !petDetails?.pets?.length)
      return;
    setError(null);
    // Rebuild the exact inputs used to calculate this generation of quotes.
    const settingsByPet = JSON.parse(pricingInputsKey) as Record<string, Pick<PetPlanSettings, "limit" | "benefit" | "excess">>;
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      void Promise.all(petDetails.pets.map((_, index) => {
        const settings = settingsByPet[index];
        return settings
          ? fetchPetPrices(index, settings, controller.signal)
          : Promise.resolve();
      }));
    }, 400);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [mounted, petDetails, pricingInputsKey, fetchPetPrices]);
  /* -----------------------------
     PLAN / COVER CHANGES
 
     Apply-to-all updates the same field on every pet. The plans themselves
     remain independent until that option is enabled by the customer.
  ------------------------------*/
  const updateSettings = (petIndex: number, changes: Partial<PetPlanSettings>) => {
    setPetSettings((current) => {
      const updated = { ...current };
      const indexes = applyToAllPets
        ? (petDetails?.pets ?? []).map((_, index) => index)
        : [petIndex];
      for (const index of indexes) {
        updated[index] = { ...updated[index], ...changes };
      }
      return updated;
    });
  };
  const selectPlan = (petIndex: number, plan: PlanKey) => {
    updateSettings(petIndex, { plan });
  };
  const updatePetSetting = (petIndex: number, field: "limit" | "benefit" | "excess", value: number) => {
    updateSettings(petIndex, { [field]: value });
  };
  /* -----------------------------
     APPLY CURRENT PET TO ALL
  ------------------------------*/
  const applyCurrentPetToAll = (petIndex: number) => {
    const source = petSettings[petIndex];
    if (!source) {
      return;
    }
    setPetSettings((current) => {
      const updated = {
        ...current,
      };
      petDetails?.pets?.forEach((_, index: number) => {
        updated[index] = {
          ...source,
        };
      });
      return updated;
    });
    setApplyToAllPets(true);
  };
  /* -----------------------------
     TOTAL PRICE
  ------------------------------*/
  const totalPrice = petDetails?.pets?.reduce((total: number, _: Pet, index: number) => {
    const settings = petSettings[index];
    if (!settings?.plan) {
      return total;
    }
    const price = petQuotes[index]?.[settings.plan] ?? 0;
    return (total + price);
  }, 0) ?? 0;
  /* -----------------------------
     ALL PETS SELECTED
  ------------------------------*/
  const allPetsSelected = (petDetails?.pets?.length ?? 0) > 0 &&
    (petDetails?.pets?.every((_: Pet, index: number) => !!petSettings[index]?.plan) ?? false);
  /* -----------------------------
     SAVE COVER
 
     /details reads "cover" to restore per-pet selections and total price.
     The legacy "plans" lookup is retained for the downstream payment flow.
  ------------------------------*/
  const saveCover = () => {
    sessionStorage.setItem("cover", JSON.stringify({
      petSettings,
      plans: Object.fromEntries(Object.entries(petSettings).map(([index, settings,]) => [
        index,
        settings.plan,
      ])),
      price: totalPrice,
      applyToAllPets,
    }));
  };
  /* -----------------------------
     BUILD DETAILS URL
  ------------------------------*/
  const buildDetailsUrl = () => {
    const params = new URLSearchParams();
    const address = petDetails
      ?.addressDetails ??
      {};
    /*
     * Customer details.
     *
     * The aliases below allow this to
     * work whether your quote page stores
     * these as camelCase or snake_case.
     */
    const firstName = petDetails?.firstName ??
      petDetails?.first_name ??
      "";
    const lastName = petDetails?.lastName ??
      petDetails?.last_name ??
      "";
    const email = petDetails?.email ??
      petDetails?.customerEmail ??
      "";
    const mobile = petDetails?.mobile ??
      petDetails?.phone ??
      petDetails?.mobileNumber ??
      "";
    const streetAddress = address.address ??
      address.fullAddress ??
      address.streetAddress ??
      "";
    params.set("first_name", String(firstName));
    params.set("last_name", String(lastName));
    params.set("email", String(email));
    params.set("mobile", String(mobile));
    params.set("address", String(streetAddress));
    params.set("region", String(address.suburb ??
      ""));
    params.set("state", String(address.state ??
      ""));
    params.set("postcode", String(address.postcode ??
      ""));
    params.set("payment_frequency", "monthly");
    /*
     * Build the pets array.
     *
     * Each pet contains:
     * - original pet details
     * - policy start date
     * - selected plan
     * - annual limit
     * - benefit percentage
     * - annual excess
     */
    const pets = (petDetails?.pets ??
      []).map((pet: Pet, index: number) => {
        const settings = petSettings[index];
        return {
          pet_no: String(index),
          pet_name: pet.name ??
            "",
          pet_type: pet.petType ===
            "dog"
            ? "Dog"
            : "Cat",
          pet_sex: pet.gender ===
            "male"
            ? "Male"
            : "Female",
          pet_breed: pet.breed ??
            "",
          pet_dob: pet.dob ??
            "",
          policy_start_date: brisbaneToday(),
          selectedPlan: settings?.plan ??
            null,
          annual_limit: settings?.limit ??
            20000,
          benefit_percentage: settings?.benefit ??
            80,
          annual_excess: settings?.excess ??
            250,
        };
      });
    /*
     * URLSearchParams automatically handles
     * URL encoding of the JSON.
     */
    params.set("pets", JSON.stringify(pets));
    /*
     * Keep the top-level WAS-style fields.
     *
     * These represent the first pet.
     *
     * The complete multi-pet state is stored
     * inside the pets JSON above.
     */
    const firstPetSettings = petSettings[0];
    params.set("annual_limit", String(firstPetSettings
      ?.limit ??
      20000));
    params.set("benefit_percentage", String(firstPetSettings
      ?.benefit ??
      80));
    params.set("annual_excess", String(firstPetSettings
      ?.excess ??
      250));
    params.set("selectedPlan", firstPetSettings
      ?.plan ??
      "");
    /*
     * Include the calculated total premium.
     *
     * This is NOT the WAS sessionId.
     */
    params.set("price", totalPrice.toFixed(2));
    return `/details?${params.toString()}`;
  };
  /* -----------------------------
     CONTINUE
  ------------------------------*/
  const continueToDetails = () => {
    if (!allPetsSelected) {
      // Match the other form fields: highlight the invalid section and scroll
      // to the first pet that is missing a plan, instead of using an alert().
      setShowPlanErrors(true);
      const firstMissingPetIndex = petDetails?.pets?.findIndex(
        (_, index) => !petSettings[index]?.plan
      ) ?? -1;
      if (firstMissingPetIndex !== -1) {
        requestAnimationFrame(() => {
          document.getElementById(`plan-selection-${firstMissingPetIndex}`)
            ?.scrollIntoView({ behavior: "smooth", block: "center" });
        });
      }
      return;
    }
    /*
     * IMPORTANT:
     * Continue saving to sessionStorage.
     *
     * Your existing payment flow relies
     * on this data.
     */
    saveCover();
    /*
     * The URL now contains the customer,
     * pet and cover configuration.
     */
    const detailsUrl = buildDetailsUrl();
    router.push(detailsUrl);
  };
  /* -----------------------------
     BACK
  ------------------------------*/
  const goBack = () => {
    /*
     * Preserve existing sessionStorage
     * behaviour.
     */
    saveCover();
    router.push("/");
  };
  /* -----------------------------
     PLAN TILE
  ------------------------------*/
  const renderPlanTile = (petIndex: number, plan: PlanKey, quotes: Record<PlanKey, number | null>) => {
    const settings = petSettings[petIndex];
    const selected = settings?.plan ===
      plan;
    const loading = loadingQuotes[petIndex] ?? false;
    const isGold = plan === "gold";
    return (<label className={`
          relative
          block
          min-h-[190px]
          rounded-xl
          border
          p-5
          cursor-pointer
          transition-all
          duration-150
          text-center

          ${isGold
        ? selected
          ? "border-amber-600 bg-amber-200"
          : "border-amber-400 bg-amber-100 hover:bg-amber-200"
        : selected
          ? "border-slate-600 bg-slate-300"
          : "border-slate-400 bg-slate-100 hover:bg-slate-200"}
        `}>
      <input type="radio" name={`plan-${petIndex}`} value={plan} checked={selected} onChange={() => selectPlan(petIndex, plan)} className="sr-only" />

      {/* RECOMMENDED */}

      {isGold && (<span className="
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
            ">
        Recommended
      </span>)}

      <div className="flex flex-col items-center">

        {/* RADIO */}

        <div className={`
              w-5
              h-5
              rounded-full
              border-2
              flex
              items-center
              justify-center
              bg-white

              ${isGold
            ? selected
              ? "border-amber-600"
              : "border-amber-400"
            : selected
              ? "border-slate-600"
              : "border-slate-400"}
            `}>
          {selected && (<div className={`
                  w-2.5
                  h-2.5
                  rounded-full

                  ${isGold
              ? "bg-amber-600"
              : "bg-slate-600"}
                `} />)}
        </div>

        {/* PLAN NAME */}

        <div className="
              mt-4
              text-lg
              font-semibold
              text-gray-900
            ">
          {plans[plan].label}
        </div>

        {/* PRICE */}

        <div className="
              mt-2
              text-2xl
              font-bold
              text-gray-900
            ">
          {loading ? (<span className="inline-flex items-center gap-2">
            <span className={`
                    inline-block
                    w-4
                    h-4
                    border-2
                    rounded-full
                    animate-spin

                    ${isGold
                ? "border-amber-200 border-t-amber-600"
                : "border-slate-300 border-t-slate-600"}
                  `} />

            <span className="text-sm font-medium text-slate-500">
              Updating
            </span>
          </span>) : quotes[plan] === null ? ("...") : (`$${quotes[plan]!.toFixed(2)}`)}
        </div>

        {/* PER MONTH */}

        <div className={`
              text-xs

              ${isGold
            ? "text-amber-700"
            : "text-slate-600"}
            `}>
          per month
        </div>

        {/* SELECTED */}

        {selected && (<div className={`
                mt-3
                text-xs
                font-semibold

                ${isGold
            ? "text-amber-700"
            : "text-slate-600"}
              `}>
          Selected
        </div>)}
      </div>
    </label>);
  };
  /* -----------------------------
     COVERAGE COMPARISON
  ------------------------------*/
  const renderCoverageComparison = (petIndex: number) => {
    const isOpen = showCoverageComparison[petIndex] ?? false;
    const toggleComparison = () => {
      setShowCoverageComparison((current) => ({
        ...current,
        [petIndex]: !isOpen,
      }));
    };
    return (<div className="
            mt-5
            bg-white
            rounded-xl
            border
            border-gray-200
            shadow-sm
            overflow-hidden
          ">

      {/* EXPAND BUTTON */}

      <button type="button" onClick={toggleComparison} className="
              w-full
              flex
              items-center
              justify-between
              gap-4
              px-5
              py-5
              bg-white
              hover:bg-gray-50
              transition
              text-left
            ">
        <div className="min-w-0">
          <div className="text-lg font-semibold text-gray-900">
            Compare Silver and Gold cover
          </div>

          <div className="text-sm text-gray-500 mt-1">
            See what's included with each plan
          </div>
        </div>

        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`
                flex-shrink-0
                text-[#555]
                transition-transform
                duration-200
                ${isOpen
            ? "rotate-180"
            : ""}
              `}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* TABLE */}

      {isOpen && (<div className="
                border-t
                border-gray-200
                bg-white
              ">

        {/* TABLE HEADER */}

        <div className="
                  grid
                  grid-cols-3
                  bg-gray-50
                  border-b
                  border-gray-200
                ">
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

        {features.map((feature, index) => {
          const silverIncluded = plans
            .upgraded
            .included.includes(index);
          const goldIncluded = plans
            .gold
            .included.includes(index);
          return (<div key={feature.short} className="
                        grid
                        grid-cols-3
                        border-b
                        border-gray-100
                        last:border-b-0
                      ">

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
              {silverIncluded ? (<span className="text-sm font-bold text-gray-700">
                ✓
              </span>) : (<span className="text-sm text-gray-300">
                —
              </span>)}
            </div>

            {/* GOLD */}

            <div className="px-3 py-3 flex items-center justify-center">
              {goldIncluded ? (<span className="text-sm font-bold text-amber-600">
                ✓
              </span>) : (<span className="text-sm text-gray-300">
                —
              </span>)}
            </div>
          </div>);
        })}
      </div>)}
    </div>);
  };
  /* -----------------------------
     PET SECTION
  ------------------------------*/
  const renderPetSection = (pet: Pet, petIndex: number) => {
    const settings = petSettings[petIndex];
    if (!settings) {
      return null;
    }
    // Only flag unselected plans after a failed attempt to continue.
    // Works for individual pets and for the one visible apply-to-all section.
    const hasPlanError = showPlanErrors && !settings.plan;
    // Apply-to-all renders one combined section; other pets remain in the summary.
    if (applyToAllPets && petIndex !== 0)
      return null;
    const individualQuotes = petQuotes[petIndex] ?? {
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
        upgraded: petDetails?.pets?.reduce((total: number, _: Pet, index: number) => total +
          (petQuotes[index]?.upgraded ??
            0), 0) ?? 0,
        gold: petDetails?.pets?.reduce((total: number, _: Pet, index: number) => total +
          (petQuotes[index]?.gold ??
            0), 0) ?? 0,
      }
      : individualQuotes;
    return (<section key={petIndex} className="
          mb-6
          bg-white
          border
          border-gray-200
          rounded-xl
          shadow-sm
          overflow-visible
        ">

      {/* HEADER */}

      <div className="
            px-6
            py-5
            border-b
            border-gray-200
          ">
        {applyToAllPets ? (<>
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Covering
          </div>

          <h2 className="mt-1 text-xl font-semibold text-gray-900">
            All pets
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            {petDetails?.pets
              ?.map((p: Pet) => p.name)
              .join(" · ")}
          </p>
        </>) : (<>
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Pet{" "}
            {petIndex +
              1}
          </div>

          <h2 className="mt-1 text-xl font-semibold text-gray-900">
            {pet.name}
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            {pet.petType ===
              "dog"
              ? "Dog"
              : "Cat"}{" "}
            ·{" "}
            {pet.breed}{" "}
            ·{" "}
            {getPetAge(pet.dob)}
          </p>
        </>)}
      </div>

      {/* COVER SETTINGS */}

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
            <label htmlFor={`limit-${petIndex}`} className="
                  block
                  text-sm
                  font-semibold
                  text-gray-900
                  mb-2
                ">
              Annual limit
            </label>

            <div className="relative">
              <select id={`limit-${petIndex}`} value={settings.limit} onChange={(e) => updatePetSetting(petIndex, "limit", Number(e.target.value))} className={COVER_SELECT_CLASS}>
                {ANNUAL_LIMIT_OPTIONS.map((value) => (<option key={value} value={value}>${value.toLocaleString()}</option>))}
              </select>

              <SelectChevron />
            </div>
          </div>

          {/* BENEFIT */}

          <div>
            <label htmlFor={`benefit-${petIndex}`} className="
                  block
                  text-sm
                  font-semibold
                  text-gray-900
                  mb-2
                ">
              Benefit percentage
            </label>

            <div className="relative">
              <select id={`benefit-${petIndex}`} value={settings.benefit} onChange={(e) => updatePetSetting(petIndex, "benefit", Number(e.target.value))} className={COVER_SELECT_CLASS}>
                {BENEFIT_OPTIONS.map((value) => (<option key={value} value={value}>{value}%</option>))}
              </select>

              <SelectChevron />
            </div>
          </div>

          {/* EXCESS */}

          <div>
            <label htmlFor={`excess-${petIndex}`} className="
                  block
                  text-sm
                  font-semibold
                  text-gray-900
                  mb-2
                ">
              Annual excess
            </label>

            <div className="relative">
              <select id={`excess-${petIndex}`} value={settings.excess} onChange={(e) => updatePetSetting(petIndex, "excess", Number(e.target.value))} className={COVER_SELECT_CLASS}>
                {EXCESS_OPTIONS.map((value) => (<option key={value} value={value}>${value.toLocaleString()}</option>))}
              </select>

              <SelectChevron />
            </div>
          </div>
        </div>

        {/* CHOOSE PLAN */}

        <div id={`plan-selection-${petIndex}`} className="mt-8 scroll-mt-24">

          <h3 id={`plan-heading-${petIndex}`} className="text-base font-semibold text-gray-900">
            Choose your plan
          </h3>

          <p className="mt-1 mb-5 text-sm text-gray-500">
            {applyToAllPets
              ? "Choose the plan that will apply to all pets."
              : `Select the plan that best suits ${pet.name}.`}
          </p>

          {/* Keep both choices inside one outlined group: neither is an invalid
              option, but leaving the entire group unselected is invalid. */}
          <div
            role="radiogroup"
            aria-labelledby={`plan-heading-${petIndex}`}
            aria-invalid={hasPlanError}
            aria-describedby={hasPlanError ? `plan-error-${petIndex}` : undefined}
            className={`grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl ${
              hasPlanError ? "border-2 border-red-500 p-3" : ""
            }`}
          >
            {renderPlanTile(petIndex, "upgraded", quotes)}
            {renderPlanTile(petIndex, "gold", quotes)}
          </div>

          {hasPlanError && (
            <p id={`plan-error-${petIndex}`} role="alert" className="mt-2 text-sm font-medium text-red-600">
              {applyToAllPets
                ? "Please select a plan for all pets."
                : `Please select a plan for ${pet.name || `Pet ${petIndex + 1}`}.`}
            </p>
          )}

          {/* EXPANDABLE COMPARISON */}

          {renderCoverageComparison(petIndex)}
        </div>

        {/* APPLY TO ALL */}

        {!applyToAllPets &&
          (petDetails?.pets?.length ?? 0) > 1 &&
          petIndex ===
          0 && (<label className="
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
                ">
            <input type="checkbox" checked={applyToAllPets} disabled={!settings.plan} onChange={(e) => {
              const checked = e.target
                .checked;
              if (checked) {
                applyCurrentPetToAll(petIndex);
              }
            }} className="
                    mt-1
                    w-4
                    h-4
                    accent-gray-800
                  "/>

            <div>
              <div className="text-sm font-semibold text-gray-900">
                Apply this plan and cover settings to all pets
              </div>

              <div className="mt-1 text-xs leading-5 text-gray-500">
                Use the same plan, annual limit, benefit percentage and annual excess for every pet.
              </div>
            </div>
          </label>)}

        {/* ACTIVE ALL-PETS INDICATOR */}

        {applyToAllPets &&
          petIndex ===
          0 && (<label className="
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
                ">
            <input type="checkbox" checked={true} onChange={() => setApplyToAllPets(false)} className="
                    mt-1
                    w-4
                    h-4
                    accent-gray-800
                  "/>

            <div>
              <div className="text-sm font-semibold text-gray-900">
                Apply this plan and cover settings to all pets
              </div>

              <div className="mt-1 text-xs leading-5 text-gray-500">
                All pets are using the same plan and cover settings. Untick this to configure them individually.
              </div>
            </div>
          </label>)}
      </div>
    </section>);
  };
  /* -----------------------------
     INITIAL PAGE LOADING
  ------------------------------*/
  if (!mounted) {
    return (<div className="min-h-screen flex items-center justify-center px-4">
      <div className="
            w-full
            max-w-sm
            bg-white
            rounded-md
            shadow-md
            border
            border-gray-300
            p-8
            text-center
          ">
        <div className="
              w-10
              h-10
              border-4
              border-gray-200
              border-t-gray-800
              rounded-full
              animate-spin
              mx-auto
              mb-5
            "/>

        <h2 className="text-lg font-semibold text-gray-900">
          Calculating your quote
        </h2>

        <p className="text-sm text-gray-500 mt-2">
          Please wait while we calculate your premiums.
        </p>
      </div>
    </div>);
  }
  /* -----------------------------
     RENDER
  ------------------------------*/
  return (<div className="min-h-screen">
    <div className="max-w-2xl mx-auto px-4 py-8">

      {/* LOGO */}

      <img src="/was-logo.min.webp" className="
            w-28
            opacity-70
            mb-6
            mx-auto
            block
          " alt="WAS Insurance" />

      {/* PAGE TITLE */}

      <div className="text-center mb-7">
        <h1 className="text-2xl font-semibold text-gray-900">
          Choose your cover
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          Select your cover options and choose a plan for your pet.
        </p>
      </div>

      {/* PROGRESS */}

      <nav aria-label="Quote progress" className="mb-8">
        <div className="flex justify-between text-xs text-gray-500 mb-2">
          {STEPS.map((step) => (<span key={step} aria-current={step === "Plans" ? "step" : undefined} className={step === "Plans"
            ? "font-semibold text-gray-900"
            : ""}>
            {step}
          </span>))}
        </div>

        <div className="
              relative
              w-full
              h-2
              bg-gray-200
              rounded-full
              overflow-hidden
            ">
          <div className="
                absolute
                left-0
                top-0
                h-full
                bg-gray-800
                rounded-full
              " style={{
              width: `${PLAN_PROGRESS}%`,
            }} />
        </div>
      </nav>

      {/* PET CONFIGURATION */}

      {petDetails?.pets?.map((pet: Pet, index: number) => renderPetSection(pet, index))}

      {/* TOTAL */}

      {(petDetails?.pets?.length ?? 0) > 1 && (<div className="
              mb-6
              bg-white
              border
              border-gray-200
              rounded-xl
              shadow-sm
              overflow-hidden
            ">

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

            {petDetails?.pets?.map((pet: Pet, index: number) => {
              const selectedPlan = petSettings[index]?.plan;
              const price = selectedPlan
                ? petQuotes[index]?.[selectedPlan] ??
                null
                : null;
              const isLoading = loadingQuotes[index] ??
                false;
              const isGold = selectedPlan ===
                "gold";
              return (<div key={index} className="
                          rounded-md
                          border
                          border-gray-200
                          bg-gray-50/50
                          px-4
                          py-4
                        ">

                {/* PET NAME + PRICE */}

                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">

                    <div className="flex items-center gap-2">
                      <div className="text-sm font-semibold text-gray-900">
                        {pet.name}
                      </div>

                      {selectedPlan && (<span className={`
                                    inline-flex
                                    items-center
                                    px-2
                                    py-0.5
                                    rounded
                                    text-[10px]
                                    font-semibold
                                    uppercase
                                    tracking-wide

                                    ${isGold
                          ? "bg-amber-100 text-amber-700"
                          : "bg-slate-100 text-slate-700"}
                                  `}>
                        {isGold
                          ? "Gold"
                          : "Silver"}
                      </span>)}
                    </div>

                    {/* COVER DETAILS */}

                    {selectedPlan && (<div className="mt-2">
                      <div className="text-xs text-gray-600">
                        $
                        {petSettings[index]?.limit.toLocaleString()}{" "}
                        annual limit
                      </div>

                      <div className="mt-0.5 text-xs text-gray-500">
                        {petSettings[index]?.benefit}%
                        {" "}
                        benefit · $
                        {petSettings[index]?.excess.toLocaleString()}{" "}
                        excess
                      </div>
                    </div>)}
                  </div>

                  {/* PRICE */}

                  <div className="flex-shrink-0 text-right">
                    {isLoading ? (<span className="inline-flex items-center gap-2 text-xs text-gray-500">
                      <span className="
                                    w-3.5
                                    h-3.5
                                    border-2
                                    border-gray-300
                                    border-t-gray-700
                                    rounded-full
                                    animate-spin
                                  "/>

                      Updating
                    </span>) : (<>
                      <div className="text-base font-semibold text-gray-900">
                        {price !==
                          null
                          ? `$${price.toFixed(2)}`
                          : "—"}
                      </div>

                      <div className="text-[10px] text-gray-500">
                        per month
                      </div>
                    </>)}
                  </div>
                </div>
              </div>);
            })}
          </div>
        </div>

        {/* TOTAL FOOTER */}

        <div className="
                border-t
                border-gray-200
                bg-gray-50
                px-6
                py-5
              ">
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
              $
              {totalPrice.toFixed(2)}
            </div>
          </div>
        </div>
      </div>)}

      {/* ERROR */}

      {error && (<div className="
              mb-6
              px-4
              py-4
              rounded-xl
              border
              border-red-200
              bg-red-50
              text-sm
              text-red-700
            ">
        {error}
      </div>)}

      {/* BACK / NEXT */}

      <div className="flex gap-3 pb-8">
        <button type="button" onClick={goBack} className="
              w-1/3
              h-12
              rounded-xl
              border
              border-gray-400
              bg-white
              text-gray-800
              text-sm
              font-semibold
              hover:bg-gray-50
              active:bg-gray-100
              transition
            ">
          Back
        </button>

        <button type="button" onClick={continueToDetails} className="
              flex-1
              h-12
              rounded-xl
              bg-amber-400
              hover:bg-amber-500
              active:bg-amber-600
              text-gray-900
              text-sm
              font-semibold
              shadow-sm
              transition
            ">
          Next
        </button>
      </div>
    </div>
  </div>);
}
// Suspense wrapper for useSearchParams()
export default function PlanComparisonPage() {
  return (<Suspense fallback={<div className="min-h-screen flex items-center justify-center px-4">
    <div className="
              w-full
              max-w-sm
              bg-white
              rounded-xl
              border
              border-gray-200
              shadow-sm
              p-8
              text-center
            ">
      <div className="
                w-10
                h-10
                border-4
                border-gray-200
                border-t-gray-800
                rounded-full
                animate-spin
                mx-auto
                mb-5
              "/>

      <h2 className="text-lg font-semibold text-gray-900">
        Loading your plans
      </h2>

      <p className="text-sm text-gray-500 mt-2">
        Please wait while we prepare your quote.
      </p>
    </div>
  </div>}>
    <PlanComparisonContent />
  </Suspense>);
}
