"use client";


import {
  type ReactNode,
  Suspense,
  useEffect,
  useRef,
  useState,
} from "react";

import { useRouter, useSearchParams } from "next/navigation";

import Select, { components } from "react-select";
import { DayPicker } from "@daypicker/react";
import "@daypicker/react/style.css";

import {
  importLibrary,
  setOptions as setGoogleMapsOptions,
} from "@googlemaps/js-api-loader";

let googleMapsConfigured = false;

/**
 * HANDOVER — Details page (app/details/page.tsx)
 *
 * Step 3 of Quote → Plans → Details. It restores the URL/sessionStorage quote,
 * lets the customer review or edit pets, address and cover, then recalculates
 * the monthly price via POST /api/quote before Stripe checkout.
 *
 * Cross-page data contracts:
 * - sessionStorage "petDetails": pets and Australian address information.
 * - sessionStorage "cover": per-pet plan/limit/benefit/excess settings.
 * - sessionStorage "checkout": snapshot used by the checkout success/webhook.
 * - The "pets" URL query parameter contains WAS API-compatible pet fields.
 *
 * "Silver" uses the upstream API plan key "upgraded"; Gold uses "gold".
 * Keep these keys stable unless all three pages and API handlers are updated.
 * The payment API route is /api/create-checkout-session; it returns a URL.
 *
 * Handover: legal document links (PDS, TMD and Privacy Policy) are placeholders.
 * Replace href="#" with approved links before a production release.
 * "Lock in my quote" is owned by a different team member. This file preserves
 * the original button, pending quote payload and integration point. The email
 * endpoint / 30-day price lock MUST be verified when that feature is merged;
 * this version does not itself send emails or lock prices.
 */

// Data structures passed between pages and the WAS pricing API.

interface Option {
  value: string;
  label: string;
  petType: string;
  petBreed: string;
}

interface Pet {
  name: string;
  petType: "cat" | "dog" | null;
  gender: "male" | "female" | null;
  breed: string;
  dob: string;
  tier: "Silver" | "Gold" | "";
}

interface PetCoverSetting {
  plan: string;
  limit: number;
  benefit: number;
  excess: number;
}

interface Cover {
  petSettings: Record<string, PetCoverSetting>;
  plans: Record<string, string>;
  price: number;
  applyToAllPets: boolean;
}

type PetErrors = { name: string; breed: string; dob: string; gender: string };

const NAME_PATTERN = /^[\p{L}\s'’-]+$/u;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/**
 * HANDOVER — UI consistency: this uses the same 48px controls, 12px radius,
 * grey borders, amber primary actions, and inline validation as Quote/Plans.
 * Keep UI changes separate from teammate-owned quote email and Stripe logic.
 */
const INPUT_CLASS = `w-full h-12 px-4 rounded-xl border border-gray-300 text-sm
  placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-800
  focus:border-transparent transition`;

/** Used in WAS quote payloads so the policy date is based on Brisbane time. */
function brisbaneToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Brisbane",
  }).format(new Date());
}

/** Names may contain international letters, spaces, apostrophes and hyphens. */
function isValidName(value: string): boolean {
  return NAME_PATTERN.test(value.trim());
}

/** Accept 04xxxxxxxx or +61 4xxxxxxxx (including normal separators). */
function isValidAustralianMobile(value: string): boolean {
  const trimmed = value.trim();
  if (!/^\+?[\d\s()-]+$/.test(trimmed)) return false;
  const digits = trimmed.replace(/\D/g, "");
  return /^04\d{8}$/.test(digits) || /^614\d{8}$/.test(digits);
}

function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

/** Shared by Save/Pay and Done so both use identical pet validation. */
function validatePet(pet: Pet): PetErrors {
  const errors: PetErrors = { name: "", breed: "", dob: "", gender: "" };
  if (!pet.name.trim()) {
    errors.name = "Please enter your pet's name.";
  } else if (!isValidName(pet.name)) {
    errors.name = "Please enter a valid pet name.";
  }
  if (!pet.breed.trim()) errors.breed = "Please select a breed.";
  if (!pet.gender) errors.gender = "Please select your pet's sex.";
  if (!pet.dob) {
    errors.dob = "Please enter your pet's date of birth.";
  } else {
    const dobDate = new Date(`${pet.dob}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const minimumDobDate = new Date(today);
    minimumDobDate.setDate(today.getDate() - 14);
    if (Number.isNaN(dobDate.getTime())) {
      errors.dob = "Please enter a valid date of birth.";
    } else if (dobDate > minimumDobDate) {
      errors.dob = "Your pet must be at least 14 days old.";
    }
  }
  return errors;
}

/** Bring the first invalid/unfinished section into view. */
function scrollToField(id: string, afterRender = false): void {
  const scroll = () => document.getElementById(id)?.scrollIntoView({
    behavior: "smooth", block: "center",
  });
  if (afterRender) requestAnimationFrame(scroll);
  else scroll();
}

/* -----------------------------
   MAIN PAGE
------------------------------*/

function DetailsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  /* -----------------------------
     STATE
  ------------------------------*/

  const [loadingBreeds, setLoadingBreeds] =
    useState(true);

  const [options, setOptions] =
    useState<Option[]>([]);

  const [mounted, setMounted] =
    useState(false);

  const [customer, setCustomer] =
    useState({
      firstName: "",
      lastName: "",
      mobile: "",
      email: "",
      address: "",
      suburb: "",
      state: "",
      postcode: "",
    });

  const [customerErrors, setCustomerErrors] =
    useState({
      firstName: "",
      lastName: "",
      mobile: "",
      email: "",
    });

  const [addressError, setAddressError] =
    useState("");

  const [unfinishedEditError, setUnfinishedEditError] =
    useState<
      "address" | "pet" | "cover" | null
    >(null);

  const [addressSelected, setAddressSelected] =
    useState(false);

  const [petErrors, setPetErrors] =
    useState<
      Record<
        number,
        {
          name: string;
          breed: string;
          dob: string;
          gender: string;
        }
      >
    >({});

  const [pets, setPets] =
    useState<Pet[]>([
      {
        name: "",
        petType: null,
        gender: null,
        breed: "",
        dob: "",
        tier: "",
      },
    ]);

  const [cover, setCover] =
    useState<Cover | null>(null);

  const [pricing, setPricing] =
    useState<{
      pets: {
        name: string;
        tier: "Silver" | "Gold";
        price: number;
      }[];
      total: number | null;
    }>({
      pets: [],
      total: null,
    });

  const [pricingLoading, setPricingLoading] = useState(false);
  // Increasing request ID ensures slow responses cannot overwrite newer prices.
  const pricingRequestId = useRef(0);

  const [termsAccepted, setTermsAccepted] =
    useState(false);

  const [privacyAccepted, setPrivacyAccepted] =
    useState(false);

  const [openTerms, setOpenTerms] =
    useState<string | null>(null);

  const [openPetDetails, setOpenPetDetails] =
    useState(false);

  const [openPetCover, setOpenPetCover] =
    useState(false);

  // Save-quote integration is owned by another team member. Preserve these
  // states and the handler below so their implementation can be merged safely.
  const [savingQuote, setSavingQuote] = useState(false);
  const [saveQuoteMessage, setSaveQuoteMessage] = useState("");
  const [saveQuoteError, setSaveQuoteError] = useState("");
  /* -----------------------------
     PET EDITING
  ------------------------------*/

  const [editingPet, setEditingPet] =
    useState<number | null>(null);

  const [openDatePicker, setOpenDatePicker] =
    useState<number | null>(null);

  const [openBreedDropdown, setOpenBreedDropdown] =
    useState<number | null>(null);

  const [dobInputs, setDobInputs] =
    useState<Record<number, string>>({});

  const [pricingChangedPets, setPricingChangedPets] =
    useState<number[]>([]);

  const [showEditWarning, setShowEditWarning] =
    useState(false);

  const [petToEdit, setPetToEdit] =
    useState<number | null>(null);

  /* -----------------------------
     COVER EDITING
  ------------------------------*/

  const [editingCover, setEditingCover] =
    useState<number | null>(null);

  const [coverToEdit, setCoverToEdit] =
    useState<number | null>(null);

  const [showCoverEditWarning, setShowCoverEditWarning] =
    useState(false);

  /* -----------------------------
     ADDRESS EDITING
  ------------------------------*/

  const [editingAddress, setEditingAddress] =
    useState(false);

  const [showAddressEditWarning, setShowAddressEditWarning] =
    useState(false);

  const addressContainerRef =
    useRef<HTMLDivElement>(null);

  const [googleMapsFailed, setGoogleMapsFailed] =
    useState(false);
  // Details is the final step (100%) in the three-stage progress bar.
  const progress = 100;
  const steps = ["Quote", "Plans", "Details"];

  /* -----------------------------
     ADDRESS PARSER
  ------------------------------*/

  function parseAddress(address: string) {
    let suburb = "";
    let state = "";
    let postcode = "";

    const postcodeMatch =
      address.match(/\b\d{4}\b/);

    if (postcodeMatch) {
      postcode = postcodeMatch[0];
    }

    const stateMatch =
      address.match(
        /\b(NSW|QLD|VIC|WA|SA|TAS|NT|ACT)\b/i
      );

    if (stateMatch) {
      state =
        stateMatch[1].toUpperCase();
    }

    if (state && postcode) {
      const suburbMatch =
        address.match(
          new RegExp(
            `,\\s*(.*?)\\s+${state}\\s+${postcode}(?:,\\s*[^,]+)?\\s*$`,
            "i"
          )
        );

      if (suburbMatch) {
        suburb =
          suburbMatch[1].trim();
      }
    }

    return {
      suburb,
      state,
      postcode,
    };
  }

  /* -----------------------------
     UPDATE PET
  ------------------------------*/

  const updatePet = (
    index: number,
    changes: Partial<Pet>
  ) => {
    setPets((currentPets) =>
      currentPets.map((pet, i) =>
        i === index
          ? {
            ...pet,
            ...changes,
          }
          : pet
      )
    );

    if (
      "breed" in changes ||
      "dob" in changes ||
      "gender" in changes
    ) {
      setPricingChangedPets((current) =>
        current.includes(index)
          ? current
          : [
            ...current,
            index,
          ]
      );
    }
  };

  /* -----------------------------
     UPDATE COVER SETTING
  ------------------------------*/

  const updateCoverSetting = (
    index: number,
    changes: Partial<PetCoverSetting>
  ) => {
    setCover((currentCover) => {
      if (!currentCover) {
        return currentCover;
      }

      const currentSettings =
        currentCover.petSettings?.[
        String(index)
        ];

      if (!currentSettings) {
        return currentCover;
      }

      const updatedSettings = {
        ...currentSettings,
        ...changes,
      };

      const updatedPlan =
        updatedSettings.plan === "gold"
          ? "gold"
          : "upgraded";

      return {
        ...currentCover,

        petSettings: {
          ...currentCover.petSettings,

          [String(index)]:
            updatedSettings,
        },

        plans: {
          ...currentCover.plans,

          [String(index)]:
            updatedPlan,
        },
      };
    });

    /* Keep legacy pet.tier synchronised */

    if (changes.plan) {
      setPets((currentPets) =>
        currentPets.map(
          (pet, petIndex) =>
            petIndex === index
              ? {
                ...pet,

                tier:
                  changes.plan ===
                    "gold"
                    ? "Gold"
                    : "Silver",
              }
              : pet
        )
      );
    }
  };

  /* -----------------------------
     FETCH BREEDS
  ------------------------------*/

  async function fetchOptions() {
    try {
      setLoadingBreeds(true);

      const response =
        await fetch(
          "https://api4pet-dev-msac6e2qpq-ts.a.run.app/api/v1/category/pet-breed"
        );

      if (!response.ok) {
        throw new Error(
          "Failed to fetch options"
        );
      }

      const data =
        await response.json();

      const breedOptions =
        data.data
          .map((item: any) => ({
            value:
              item.breed_name,

            label:
              `${item.breed_name} (${item.pet_type})`,

            petType:
              item.pet_type,

            petBreed:
              item.breed_name,
          }))
          .sort(
            (
              a: Option,
              b: Option
            ) =>
              a.petBreed.localeCompare(
                b.petBreed
              )
          );

      setOptions(
        breedOptions
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingBreeds(false);
    }
  }

  /* -----------------------------
     REFRESH PRICING
  ------------------------------*/

  async function refreshPricing(
    updatedPets: Pet[],
    updatedCustomer = customer
  ) {
    const requestId = ++pricingRequestId.current;
    try {
      setPricingLoading(true);

      if (!cover) {
        console.error(
          "No cover information found."
        );

        return;
      }

      const today = brisbaneToday();

      const pricingPets =
        await Promise.all(
          updatedPets.map(
            async (
              pet,
              index
            ) => {
              const petSettings =
                cover.petSettings?.[
                String(index)
                ];

              /*
               * Use null checks here instead of
               * truthiness so a valid $0 excess
               * is not treated as incomplete.
               */

              if (
                petSettings?.limit == null ||
                petSettings?.benefit == null ||
                petSettings?.excess == null
              ) {
                console.error(
                  `Incomplete cover information for Pet ${index + 1
                  }:`,
                  petSettings
                );

                return {
                  name:
                    pet.name ||
                    `Pet ${index + 1
                    }`,

                  tier:
                    pet.tier ===
                      "Gold"
                      ? ("Gold" as const)
                      : ("Silver" as const),

                  price: 0,
                };
              }

              const planKey =
                petSettings.plan ===
                  "gold"
                  ? "gold"
                  : "upgraded";

              const payload = {
                payment_frequency:
                  "monthly",

                customer: {
                  suburb:
                    updatedCustomer.suburb,

                  state:
                    updatedCustomer.state,

                  postcode:
                    updatedCustomer.postcode,

                  email:
                    updatedCustomer.email ||
                    "pet@wiseandsilent.com",
                },

                pets: [
                  {
                    pet_no:
                      String(index),

                    pet_name:
                      pet.name,

                    pet_type:
                      pet.petType ===
                        "dog"
                        ? "Dog"
                        : pet.petType ===
                          "cat"
                          ? "Cat"
                          : "",

                    pet_sex:
                      pet.gender ===
                        "male"
                        ? "Male"
                        : pet.gender ===
                          "female"
                          ? "Female"
                          : "",

                    pet_breed:
                      pet.breed,

                    pet_dob:
                      pet.dob,

                    policy_start_date:
                      today,
                  },
                ],

                [planKey]: {
                  annual_limit:
                    petSettings.limit,

                  benefit_percentage:
                    petSettings.benefit,

                  annual_excess:
                    petSettings.excess,
                },
              };

              const response =
                await fetch(
                  "/api/quote",
                  {
                    method:
                      "POST",

                    headers: {
                      "Content-Type":
                        "application/json",
                    },

                    body: JSON.stringify(
                      payload
                    ),
                  }
                );

              if (!response.ok) {
                throw new Error(
                  `Quote request failed for Pet ${index + 1
                  }`
                );
              }

              const data =
                await response.json();

              const quotePet =
                data?.[
                  planKey
                ]?.data?.quote
                  ?.pets?.[0];

              const price =
                Number(
                  quotePet
                    ?.premiums
                    ?.installment ??
                  0
                );

              return {
                name:
                  pet.name ||
                  `Pet ${index + 1
                  }`,

                tier:
                  petSettings.plan ===
                    "gold"
                    ? ("Gold" as const)
                    : ("Silver" as const),

                price:
                  Number(
                    price.toFixed(2)
                  ),
              };
            }
          )
        );

      const total =
        pricingPets.reduce(
          (sum, pet) =>
            sum + pet.price,
          0
        );

      if (requestId === pricingRequestId.current) {
        setPricing({ pets: pricingPets, total: Number(total.toFixed(2)) });
      }
    } catch (error) {
      console.error("Unable to refresh pricing:", error);
      if (requestId === pricingRequestId.current) {
        setPricing((current) => ({ ...current, total: null }));
      }
    } finally {
      if (requestId === pricingRequestId.current) setPricingLoading(false);
    }
  }

  /* -----------------------------
     VALIDATE CUSTOMER
  ------------------------------*/

  function validateCustomerDetails() {
    const errors = {
      firstName: "",
      lastName: "",
      mobile: "",
      email: "",
    };

    if (!customer.firstName.trim()) {
      errors.firstName =
        "Please enter your first name.";
    } else if (
      !isValidName(customer.firstName)
    ) {
      errors.firstName =
        "Please enter a valid first name.";
    }

    if (!customer.lastName.trim()) {
      errors.lastName =
        "Please enter your last name.";
    } else if (
      !isValidName(customer.lastName)
    ) {
      errors.lastName =
        "Please enter a valid last name.";
    }

    const cleanedMobile = customer.mobile.trim().replace(/\D/g, "");
    const validAustralianMobile = isValidAustralianMobile(customer.mobile);

    if (!cleanedMobile) {
      errors.mobile =
        "Please enter your mobile number.";
    } else if (!validAustralianMobile) {
      errors.mobile =
        "Please enter a valid Australian mobile number.";
    }

    const email =
      customer.email.trim();

    if (!email) {
      errors.email =
        "Please enter your email address.";
    } else if (
      !isValidEmail(email)
    ) {
      errors.email =
        "Please enter a valid email address.";
    }

    setCustomerErrors(errors);

    if (errors.firstName) {
      scrollToField("customer-first-name");

      return false;
    }

    if (errors.lastName) {
      scrollToField("customer-last-name");

      return false;
    }

    if (errors.mobile) {
      scrollToField("customer-mobile");

      return false;
    }

    if (errors.email) {
      scrollToField("customer-email");

      return false;
    }

    return true;
  }

  /* -----------------------------
   VALIDATE CUSTOMER
------------------------------*/

  function validateReviewDetails() {
    const nextPetErrors: Record<
      number,
      {
        name: string;
        breed: string;
        dob: string;
        gender: string;
      }
    > = {};

    let hasPetErrors = false;

    pets.forEach((pet, index) => {
      const errors = validatePet(pet);

      nextPetErrors[index] =
        errors;

      if (
        Object.values(errors).some(
          Boolean
        )
      ) {
        hasPetErrors = true;
      }
    });

    setPetErrors(nextPetErrors);

    let nextAddressError = "";

    if (!customer.address.trim()) {
      nextAddressError =
        "Please enter your home address.";
    } else if (
      !customer.suburb.trim() ||
      !customer.state.trim() ||
      !customer.postcode.trim()
    ) {
      nextAddressError =
        "Please enter a valid Australian address including suburb, state and postcode.";
    }

    setAddressError(
      nextAddressError
    );

    const hasAddressError =
      Boolean(nextAddressError);

    if (
      hasPetErrors ||
      hasAddressError
    ) {
      setOpenPetDetails(true);

      return false;
    }

    return true;
  }

  /* -----------------------------
    FINISH PET EDIT
  ------------------------------*/

  async function finishPetEdit(
    index: number
  ) {
    const pet = pets[index];

    if (!pet) {
      return true;
    }

    const errors = validatePet(pet);

    setPetErrors((current) => ({
      ...current,
      [index]: errors,
    }));

    const hasErrors =
      Object.values(errors).some(
        Boolean
      );

    if (hasErrors) {
      setOpenPetDetails(true);
      setEditingPet(index);

      scrollToField(`pet-details-${index}`, true);

      return false;
    }

    setUnfinishedEditError(null);
    setEditingPet(null);

    if (
      pricingChangedPets.includes(index)
    ) {
      await refreshPricing(pets);

      setPricingChangedPets(
        (current) =>
          current.filter(
            (petIndex) =>
              petIndex !== index
          )
      );
    }

    return true;
  }

  async function finishAddressEdit() {
    if (!editingAddress) {
      return true;
    }

    if (!customer.address.trim()) {
      setAddressError(
        "Please enter your home address."
      );

      scrollToField("address-details", true);

      return false;
    }

    if (
      !googleMapsFailed &&
      !addressSelected
    ) {
      setAddressError(
        "Please select your address from the suggestions."
      );

      scrollToField("address-details", true);

      return false;
    }

    if (
      !customer.suburb.trim() ||
      !customer.state.trim() ||
      !customer.postcode.trim()
    ) {
      setAddressError(
        "Please enter a valid Australian address including suburb, state and postcode."
      );

      scrollToField("address-details", true);

      return false;
    }

    setAddressError("");
    setUnfinishedEditError(null);
    setEditingAddress(false);

    await refreshPricing(
      pets,
      customer
    );

    return true;
  }

  async function finishCoverEdit() {
    if (editingCover === null) {
      return true;
    }

    setUnfinishedEditError(null);
    setEditingCover(null);

    await refreshPricing(
      pets
    );

    return true;
  }

  async function finishCurrentEdit() {
    if (editingAddress) {
      const addressFinished =
        await finishAddressEdit();

      if (!addressFinished) {
        return false;
      }
    }

    if (editingPet !== null) {
      const petFinished =
        await finishPetEdit(
          editingPet
        );

      if (!petFinished) {
        return false;
      }
    }

    if (editingCover !== null) {
      const coverFinished =
        await finishCoverEdit();

      if (!coverFinished) {
        return false;
      }
    }

    return true;
  }

  /* -----------------------------
     SAVE DETAILS TO URL
     TODO (handover): raw contact/address data travels in query parameters
     for compatibility with Plans. Prefer a quote ID and server-side lookup
     before moving beyond this prototype.
  ------------------------------*/

  function buildPlansUrl() {
    /*
     * Start with the existing URL parameters.
     *
     * This is important because the URL already
     * contains the quote/pet/cover information
     * coming from Plans.
     */
    const params =
      new URLSearchParams(
        searchParams.toString()
      );

    /* -----------------------------
        CUSTOMER NAME
      ------------------------------*/

    params.set(
      "first_name",
      customer.firstName
    );

    params.set(
      "last_name",
      customer.lastName
    );

    /* -----------------------------
       CUSTOMER DETAILS
    ------------------------------*/

    params.set(
      "email",
      customer.email
    );

    params.set(
      "mobile",
      customer.mobile
    );

    params.set(
      "address",
      customer.address
    );

    params.set(
      "region",
      customer.suburb
    );

    params.set(
      "state",
      customer.state
    );

    params.set(
      "postcode",
      customer.postcode
    );

    /* -----------------------------
       PAYMENT FREQUENCY
    ------------------------------*/

    if (
      !params.get(
        "payment_frequency"
      )
    ) {
      params.set(
        "payment_frequency",
        "monthly"
      );
    }

    /* -----------------------------
       PRICE
    ------------------------------*/

    if (
      pricing.total !== null
    ) {
      params.set(
        "price",
        pricing.total.toFixed(2)
      );
    } else if (
      cover?.price != null
    ) {
      params.set(
        "price",
        cover.price.toFixed(2)
      );
    }

    /* -----------------------------
       PETS
    ------------------------------*/

    /*
     * Rebuild the pets JSON using the
     * current React state and current
     * cover settings.
     *
     * This means if the user edited a pet
     * or cover before pressing Back,
     * those changes are retained.
     */

    const urlPets =
      pets.map(
        (pet, index) => {
          const settings =
            cover?.petSettings?.[
            String(index)
            ];

          return {
            pet_no:
              String(index),

            pet_name:
              pet.name ?? "",

            pet_type:
              pet.petType ===
                "dog"
                ? "Dog"
                : pet.petType ===
                  "cat"
                  ? "Cat"
                  : "",

            pet_sex:
              pet.gender ===
                "male"
                ? "Male"
                : pet.gender ===
                  "female"
                  ? "Female"
                  : "",

            pet_breed:
              pet.breed ?? "",

            pet_dob:
              pet.dob ?? "",

            policy_start_date: brisbaneToday(),

            selectedPlan:
              settings?.plan ??
              null,

            annual_limit:
              settings?.limit ??
              20000,

            benefit_percentage:
              settings?.benefit ??
              80,

            annual_excess:
              settings?.excess ??
              250,
          };
        }
      );

    params.set(
      "pets",
      JSON.stringify(
        urlPets
      )
    );

    /* -----------------------------
       LEGACY / WAS COMPATIBILITY
    ------------------------------*/

    const firstPetSettings =
      cover?.petSettings?.["0"];

    params.set(
      "annual_limit",
      String(
        firstPetSettings?.limit ??
        20000
      )
    );

    params.set(
      "benefit_percentage",
      String(
        firstPetSettings?.benefit ??
        80
      )
    );

    params.set(
      "annual_excess",
      String(
        firstPetSettings?.excess ??
        250
      )
    );

    params.set(
      "selectedPlan",
      firstPetSettings?.plan ??
      ""
    );

    return `/plans?${params.toString()}`;
  }

  /* -----------------------------
     SAVE DETAILS TO SESSION STORAGE
  ------------------------------*/

  function saveCustomerToStorage() {
    try {
      const storedPet =
        sessionStorage.getItem(
          "petDetails"
        );

      if (!storedPet) {
        return;
      }

      const petData =
        JSON.parse(
          storedPet
        );

      const updatedPetData = {
        ...petData,

        /*
         * Keep the original structure
         * but update the address/customer
         * information where appropriate.
         */
        address:
          customer.address,

        addressDetails: {
          ...(petData.addressDetails ??
            {}),

          address:
            customer.address,

          suburb:
            customer.suburb,

          state:
            customer.state,

          postcode:
            customer.postcode,
        },
      };

      sessionStorage.setItem(
        "petDetails",
        JSON.stringify(
          updatedPetData
        )
      );
    } catch (error) {
      console.error(
        "Failed to save customer details:",
        error
      );
    }
  }

  /* -----------------------------
     BACK TO PLANS
     Preserve URL keys and saved quote state so edits are not lost.
  ------------------------------*/

  function goBackToPlans() {
    /*
     * Save the current customer details
     * before navigating away.
     */
    saveCustomerToStorage();

    /*
     * Build the URL from the current
     * state, preserving the existing
     * quote parameters.
     */
    const plansUrl =
      buildPlansUrl();

    router.push(
      plansUrl
    );
  }

  /** Prevent saving/checkout with an unfinished address, pet or cover edit. */
  function hasUnfinishedEdit(): boolean {
    const editing: { field: "address" | "pet" | "cover"; id: string } | null =
      editingAddress
        ? { field: "address", id: "address-details" }
        : editingPet !== null
          ? { field: "pet", id: `pet-details-${editingPet}` }
          : editingCover !== null
            ? { field: "cover", id: `pet-cover-${editingCover}` }
            : null;
    if (!editing) {
      setUnfinishedEditError(null);
      return false;
    }
    setUnfinishedEditError(editing.field);
    scrollToField(editing.id);
    return true;
  }

  /**
   * HANDOVER — Save quote integration (owned by teammate).
   * Retain the payload shape and UI states while the email feature is developed.
   * TODO: POST quoteData to the teammate's save-quote endpoint, handle errors,
   * and only show delivery/30-day lock confirmation after server confirmation.
   * Do not log quoteData: it contains customer personal information.
   */
  async function saveQuote() {
    setSaveQuoteMessage("");
    setSaveQuoteError("");

    if (hasUnfinishedEdit()) return;
    if (!validateCustomerDetails() || !validateReviewDetails()) return;

    if (pricing.total === null) {
      setSaveQuoteError("Your quote price is currently unavailable. Please try again.");
      return;
    }

    setSavingQuote(true);
    try {
      const quoteData = {
        customer,
        pets,
        cover,
        pricing,
        quoteUrl: buildPlansUrl(),
      };

      // TODO (save-quote owner): Send quoteData to the Save Quote/email API.
      // The backend needs to confirm that the quote was saved and/or emailed.
      void quoteData; // Intentionally kept as the future API request payload.

      // Preserve the original prototype response, which does NOT claim delivery.
      setSaveQuoteMessage("Your quote is ready to be sent to your email.");
    } catch (error) {
      console.error("Save quote error:", error);
      setSaveQuoteError("We couldn't save your quote. Please try again.");
    } finally {
      setSavingQuote(false);
    }
  }

  /* -----------------------------
     CONFIRM PAYMENT
     Handover: the server must derive checkout amounts from a verified quote.
     A client-provided unit_amount is not authoritative.
  ------------------------------*/

  async function confirmPayment() {
    if (hasUnfinishedEdit()) return;

    if (
      !validateCustomerDetails()
    ) {
      return;
    }

    if (
      !validateReviewDetails()
    ) {
      return;
    }

    if (
      !termsAccepted ||
      !privacyAccepted
    ) {
      alert(
        "Please read and accept all required acknowledgements."
      );

      return;
    }

    const checkoutData = {
      customer,
      pets,
      cover,
    };

    sessionStorage.setItem(
      "checkout",
      JSON.stringify(
        checkoutData
      )
    );

    try {
      const res =
        await fetch(
          "/api/create-checkout-session",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              unit_amount:
                Math.round(
                  (pricing.total ??
                    0) * 100
                ),

              productName:
                "Pet Insurance Quote",

              customer_email:
                customer.email,
            }),
          }
        );

      const responseText =
        await res.text();

      if (!res.ok) {
        throw new Error(
          `Stripe checkout failed: ${res.status} ${responseText}`
        );
      }

      const data =
        JSON.parse(
          responseText
        );

      if (!data.url) {
        throw new Error(
          "Stripe did not return a checkout URL"
        );
      }

      window.location.href =
        data.url;
    } catch (error) {
      console.error(
        "Checkout error:",
        error
      );
    }
  }

  /* -----------------------------
     INITIAL RESTORATION — URL fields take precedence when session petDetails exists.
     Direct URLs with no session petDetails still need a restoration improvement.
     We convert snake_case API fields into the React Pet model so edits
     and repricing work even when the user follows a copied quote URL.
  ------------------------------*/

  useEffect(() => {
    setMounted(true);

    fetchOptions();

    const storedCover =
      sessionStorage.getItem(
        "cover"
      );

    const storedPet =
      sessionStorage.getItem(
        "petDetails"
      );

    const coverData:
      | Cover
      | null =
      storedCover
        ? JSON.parse(
          storedCover
        )
        : null;

    if (coverData) {
      setCover(
        coverData
      );
    }

    /* -----------------------------
       URL CUSTOMER DETAILS
    ------------------------------*/

    const urlFirstName =
      searchParams.get(
        "first_name"
      ) ?? "";

    const urlLastName =
      searchParams.get(
        "last_name"
      ) ?? "";

    const urlEmail =
      searchParams.get(
        "email"
      ) ?? "";

    const urlMobile =
      searchParams.get(
        "mobile"
      ) ?? "";

    const urlAddress =
      searchParams.get(
        "address"
      ) ?? "";

    const urlRegion =
      searchParams.get(
        "region"
      ) ?? "";

    const urlState =
      searchParams.get(
        "state"
      ) ?? "";

    const urlPostcode =
      searchParams.get(
        "postcode"
      ) ?? "";

    /* -----------------------------
       URL PETS
    ------------------------------*/

    let urlPets:
      | any[]
      | null = null;

    const urlPetsString =
      searchParams.get(
        "pets"
      );

    if (urlPetsString) {
      try {
        const parsed =
          JSON.parse(
            urlPetsString
          );

        if (
          Array.isArray(parsed)
        ) {
          urlPets = parsed;
        }
      } catch (error) {
        console.error(
          "Failed to parse pets from URL:",
          error
        );
      }
    }

    /* -----------------------------
       PET DATA
    ------------------------------*/

    if (storedPet) {
      const petData =
        JSON.parse(
          storedPet
        );

      const storedPets =
        Array.isArray(
          petData?.pets
        )
          ? petData.pets
          : [];

      /*
       * URL pets take priority when
       * they exist.
       */
      const sourcePets =
        urlPets ??
        storedPets;

      setPets(
        sourcePets.map(
          (
            pet: any,
            index: number
          ) => {
            const storedPlan =
              coverData
                ?.plans?.[
              index
              ];

            const urlPlan =
              pet?.selectedPlan;

            const plan =
              urlPlan ??
              storedPlan ??
              "";

            return {
              name:
                pet?.pet_name ??
                pet?.name ??
                "",

              petType:
                (
                  pet?.pet_type ??
                  pet?.petType ??
                  ""
                ).toLowerCase() ===
                  "dog"
                  ? "dog"
                  : (
                    pet?.pet_type ??
                    pet?.petType ??
                    ""
                  ).toLowerCase() ===
                    "cat"
                    ? "cat"
                    : null,

              breed:
                pet?.pet_breed ??
                pet?.breed ??
                "",

              dob:
                pet?.pet_dob ??
                pet?.dob ??
                "",

              gender:
                (
                  pet?.pet_sex ??
                  pet?.gender ??
                  ""
                ).toLowerCase() ===
                  "male"
                  ? "male"
                  : (
                    pet?.pet_sex ??
                    pet?.gender ??
                    ""
                  ).toLowerCase() ===
                    "female"
                    ? "female"
                    : null,

              tier:
                plan === "gold"
                  ? "Gold"
                  : plan ===
                    "upgraded"
                    ? "Silver"
                    : "",
            };
          }
        )
      );

      /* -----------------------------
         CUSTOMER FROM URL / STORAGE
      ------------------------------*/

      const storedAddress =
        petData.address ??
        "";

      const parsedAddress =
        parseAddress(
          storedAddress
        );

      const googleAddress =
        petData.addressDetails ??
        {};

      /*
       * URL takes priority over
       * sessionStorage.
       */
      const address =
        urlAddress ||
        storedAddress;

      const suburb =
        urlRegion ||
        googleAddress.suburb ||
        parsedAddress.suburb;

      const state =
        urlState ||
        googleAddress.state ||
        parsedAddress.state;

      const postcode =
        urlPostcode ||
        googleAddress.postcode ||
        parsedAddress.postcode;

      const storageEmail =
        petData.email ??
        "";

      const storageMobile =
        petData.mobile ??
        "";

      setCustomer({
        firstName:
          urlFirstName,

        lastName:
          urlLastName,

        email:
          urlEmail ||
          storageEmail,

        mobile:
          urlMobile ||
          storageMobile,

        address,

        suburb,

        state,

        postcode,
      });
    } else {
      /*
       * Even if petDetails is missing,
       * still allow the URL to populate
       * the customer fields.
       */
      setCustomer({
        firstName:
          urlFirstName,

        lastName:
          urlLastName,

        email:
          urlEmail,

        mobile:
          urlMobile,

        address:
          urlAddress,

        suburb:
          urlRegion,

        state:
          urlState,

        postcode:
          urlPostcode,
      });
    }
  }, []);

  /* -----------------------------
     GOOGLE ADDRESS AUTOCOMPLETE
     Loaded only when the address editor opens; limits suggestions to AU.
     If Maps fails, the text fallback uses parseAddress(), so leave it intact.
     Event listeners are scoped to the widget and removed when it is removed.
  ------------------------------*/

  useEffect(() => {
    if (!editingAddress || googleMapsFailed) {
      return;
    }

    let cancelled = false;
    let autocomplete: HTMLElement | null = null;

    const loadGoogleMaps = async () => {
      try {
        if (
          !process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
        ) {
          setGoogleMapsFailed(true);
          return;
        }

        if (!googleMapsConfigured) {
          setGoogleMapsOptions({
            key: process.env
              .NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
            v: "weekly",
          });

          googleMapsConfigured = true;
        }

        const { PlaceAutocompleteElement } =
          await importLibrary("places");

        if (
          cancelled ||
          !addressContainerRef.current
        ) {
          return;
        }

        addressContainerRef.current.innerHTML =
          "";

        const newAutocomplete =
          new PlaceAutocompleteElement();

        newAutocomplete.style.width = "100%";
        newAutocomplete.style.display = "block";

        newAutocomplete.value =
          customer.address;

        newAutocomplete.setAttribute(
          "included-region-codes",
          "au"
        );

        newAutocomplete.setAttribute(
          "placeholder",
          "Start typing your address..."
        );

        autocomplete =
          newAutocomplete;

        addressContainerRef.current.appendChild(
          newAutocomplete
        );

        newAutocomplete.addEventListener(
          "input",
          () => {
            if (!cancelled) {
              setAddressSelected(false);
              setAddressError("");
            }
          }
        );

        newAutocomplete.addEventListener(
          "gmp-select",
          async (event: any) => {
            try {
              const place =
                event.placePrediction.toPlace();

              await place.fetchFields({
                fields: [
                  "formattedAddress",
                  "addressComponents",
                ],
              });

              if (
                cancelled ||
                !place.formattedAddress
              ) {
                return;
              }

              newAutocomplete.value =
                place.formattedAddress;

              let suburb = "";
              let state = "";
              let postcode = "";

              const components =
                place.addressComponents || [];

              components.forEach(
                (component: any) => {
                  const types =
                    component.types || [];

                  if (
                    types.includes("locality") ||
                    types.includes("postal_town") ||
                    types.includes("sublocality")
                  ) {
                    suburb =
                      component.longText ||
                      component.shortText ||
                      "";
                  }

                  if (
                    types.includes(
                      "administrative_area_level_1"
                    )
                  ) {
                    state =
                      component.shortText ||
                      component.longText ||
                      "";
                  }

                  if (
                    types.includes("postal_code")
                  ) {
                    postcode =
                      component.longText ||
                      component.shortText ||
                      "";
                  }
                }
              );

              setCustomer((prev) => ({
                ...prev,
                address:
                  place.formattedAddress,
                suburb,
                state:
                  state.toUpperCase().trim(),
                postcode,
              }));

              setAddressSelected(true);
              setAddressError("");
            } catch (error) {
              console.error(
                "Failed to get selected address:",
                error
              );
            }
          }
        );

        newAutocomplete.addEventListener(
          "gmp-error",
          () => {
            if (!cancelled) {
              setGoogleMapsFailed(true);
            }
          }
        );
      } catch (error) {
        console.error(
          "Google Maps failed to load:",
          error
        );

        if (!cancelled) {
          setGoogleMapsFailed(true);
        }
      }
    };

    loadGoogleMaps();

    return () => {
      cancelled = true;

      if (autocomplete) {
        autocomplete.remove();
      }

      if (addressContainerRef.current) {
        addressContainerRef.current.innerHTML =
          "";
      }
    };
  }, [editingAddress]);

  /* -----------------------------
     INITIAL / COVER PRICING
     Recalculate whenever the restored cover changes; explicit Done handlers
     also call refreshPricing after address, pet, or cover edits.
  ------------------------------*/

  useEffect(() => {
    if (!mounted) {
      return;
    }

    if (
      pets.length > 0 &&
      cover
    ) {
      refreshPricing(
        pets
      );
    }
  }, [
    mounted,
    cover,
  ]);

  /* -----------------------------
     SELECT STYLES
  ------------------------------*/

  const selectStyles = {
    control: (
      base: any,
      state: any
    ) => ({
      ...base,

      minHeight:
        "48px",

      borderRadius:
        "12px",

      border:
        "1px solid #d1d5db",

      boxShadow:
        "none",

      backgroundColor:
        state.isDisabled
          ? "#f3f4f6"
          : "#fff",

      "&:hover": {
        borderColor:
          "#9ca3af",
      },

      cursor:
        state.isDisabled
          ? "not-allowed"
          : "default",
    }),

    singleValue: (
      base: any,
      state: any
    ) => ({
      ...base,

      color:
        state.isDisabled
          ? "#6b7280"
          : "#111827",

      fontSize:
        "14px",
    }),

    input: (
      base: any
    ) => ({
      ...base,

      color:
        "#111827",

      fontSize:
        "14px",
    }),

    placeholder: (
      base: any
    ) => ({
      ...base,

      color:
        "#6b7280",

      fontSize:
        "14px",
    }),
    indicatorSeparator: () => ({
      display: "none",
    }),

    dropdownIndicator: (base: any) => ({
      ...base,
      padding: 0,
      marginRight: "15px",
      color: "#555",

      "&:hover": {
        color: "#555",
      },
    }),

    menu: (
      base: any
    ) => ({
      ...base,

      backgroundColor:
        "#fff",

      borderRadius:
        "12px",

      overflow:
        "hidden",

      boxShadow:
        "0 10px 25px rgba(0,0,0,0.12)",

      zIndex: 50,
    }),

    option: (
      base: any,
      state: any
    ) => ({
      ...base,

      color:
        "#111827",

      backgroundColor:
        state.isFocused
          ? "#f3f4f6"
          : "#fff",

      cursor:
        "pointer",

      fontSize:
        "14px",

      padding:
        "10px 12px",
    }),
  };

  /* -----------------------------
     LOADING
  ------------------------------*/

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div
          className="
            w-full
            max-w-sm
            bg-white
            rounded-xl
            border
            border-gray-200
            shadow-sm
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
            Loading your details
          </h2>

          <p className="text-sm text-gray-500 mt-2">
            Please wait while we prepare your quote.
          </p>
        </div>
      </div>
    );
  }

  /* -----------------------------
     RENDER
  ------------------------------*/

  return (
    <div className="min-h-screen text-gray-900">
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* LOGO */}

        <img
          src="/was-logo.min.webp"
          className="
            w-28
            opacity-70
            mb-6
            mx-auto
            block
          "
          alt="WAS Insurance"
        />

        {/* PAGE TITLE */}

        <div className="text-center mb-7">
          <h1 className="text-2xl font-semibold text-gray-900">
            Your details
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Review your information before completing your purchase.
          </p>
        </div>

        {/* PROGRESS */}

        <nav aria-label="Quote progress" className="mb-8">
          <div className="flex justify-between text-xs text-gray-500 mb-2">
            {steps.map(
              (step) => (
                <span
                  key={step}
                  aria-current={step === "Details" ? "step" : undefined}
                  className={
                    step ===
                      "Details"
                      ? "font-semibold text-gray-900"
                      : ""
                  }
                >
                  {step}
                </span>
              )
            )}
          </div>

          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="
                h-2
                bg-gray-800
                rounded-full
                transition-all
                duration-300
              "
              style={{
                width: `${progress}%`,
              }}
            />
          </div>
        </nav>

        {/* CUSTOMER DETAILS */}

        <Section title="Your Details">
          <div className="space-y-5">

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* FIRST NAME */}

              <FormField label="First Name">
                <input
                  id="customer-first-name"
                  value={customer.firstName}
                  onChange={(e) => {
                    const value = e.target.value;

                    setCustomer({
                      ...customer,
                      firstName: value,
                    });

                    const validName =
                      isValidName(value);

                    if (validName) {
                      setCustomerErrors((current) => ({
                        ...current,
                        firstName: "",
                      }));
                    }
                  }}
                  className={`${INPUT_CLASS} ${customerErrors.firstName
                      ? "border-red-500 focus:ring-red-500"
                      : ""
                    }`}
                />

                {customerErrors.firstName && (
                  <ErrorMessage>
                    {customerErrors.firstName}
                  </ErrorMessage>
                )}
              </FormField>

              {/* LAST NAME */}

              <FormField label="Last Name">
                <input
                  id="customer-last-name"
                  value={customer.lastName}
                  onChange={(e) => {
                    const value = e.target.value;

                    setCustomer({
                      ...customer,
                      lastName: value,
                    });

                    const validName =
                      isValidName(value);

                    if (validName) {
                      setCustomerErrors((current) => ({
                        ...current,
                        lastName: "",
                      }));
                    }
                  }}
                  className={`${INPUT_CLASS} ${customerErrors.lastName
                      ? "border-red-500 focus:ring-red-500"
                      : ""
                    }`}
                />

                {customerErrors.lastName && (
                  <ErrorMessage>
                    {customerErrors.lastName}
                  </ErrorMessage>
                )}
              </FormField>

            </div>

            <FormField label="Mobile Number">
              <input
                id="customer-mobile"
                value={
                  customer.mobile
                }
                onChange={(e) => {
                  const value = e.target.value;

                  setCustomer({
                    ...customer,
                    mobile: value,
                  });

                  const validAustralianMobile = isValidAustralianMobile(value);

                  if (validAustralianMobile) {
                    setCustomerErrors((current) => ({
                      ...current,
                      mobile: "",
                    }));
                  }
                }}
                className={`${INPUT_CLASS} ${customerErrors.mobile
                    ? "border-red-500 focus:ring-red-500"
                    : ""
                  }`}
              />

              {customerErrors.mobile && (
                <ErrorMessage>
                  {customerErrors.mobile}
                </ErrorMessage>
              )}
            </FormField>

            <FormField label="Email">
              <input
                id="customer-email"
                type="email"
                value={
                  customer.email
                }
                onChange={(e) => {
                  const value = e.target.value;

                  setCustomer({
                    ...customer,
                    email: value,
                  });

                  if (
                    isValidEmail(value)
                  ) {
                    setCustomerErrors((current) => ({
                      ...current,
                      email: "",
                    }));
                  }
                }}
                className={`${INPUT_CLASS} ${customerErrors.email
                    ? "border-red-500 focus:ring-red-500"
                    : ""
                  }`}
              />

              {customerErrors.email && (
                <ErrorMessage>
                  {customerErrors.email}
                </ErrorMessage>
              )}
            </FormField>

            {/* SAVE QUOTE */}

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Not ready to commit to payment?
                  </h3>

                  <p className="text-sm text-gray-500 mt-1">
                    Lock in your quote for 30 days and we'll send the details to your email.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={saveQuote}
                  disabled={savingQuote}
                  className="
                    shrink-0
                    h-11
                    px-6
                    rounded-xl
                    border
                    border-gray-300
                    bg-white
                    text-gray-800
                    font-semibold
                    text-sm
                    hover:bg-gray-50
                    active:bg-gray-100
                    disabled:bg-gray-100
                    disabled:text-gray-400
                    disabled:cursor-not-allowed
                    transition
                  "
                >
                  {savingQuote ? "Saving quote..." : "Lock in my quote"}
                </button>

              </div>

              {saveQuoteMessage && (
                <p className="text-sm text-green-600 mt-3">
                  {saveQuoteMessage}
                </p>
              )}
              {saveQuoteError && (
                <p className="text-sm text-red-600 mt-3">
                  {saveQuoteError}
                </p>
              )}
            </div>

          </div>
        </Section>

        {/* REVIEW YOUR PET DETAILS */}

        <div
          className="
            bg-white
            rounded-xl
            border
            border-gray-200
            shadow-sm
            overflow-hidden
            mb-4
          "
        >
          <button
            type="button"
            onClick={() =>
              setOpenPetDetails(
                (current) => !current
              )
            }
            className="
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
            "
          >
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-gray-900">
                Review your pet details
              </h2>

              <p className="text-sm text-gray-500 mt-1">
                Address, name, DOB, breed and sex
              </p>
            </div>

            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`
                flex-shrink-0
                text-[#555]
                transition-transform
                duration-200
                ${openPetDetails ? "rotate-180" : ""}
              `}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {openPetDetails && (
            <div className="border-t border-gray-200">

              {/* YOUR ADDRESS */}

              <div
                id="address-details"
                className={`
                  px-5
                  py-5
                  border-b
                  ${unfinishedEditError === "address"
                    ? "border-2 border-red-500 bg-red-50/30"
                    : "border-gray-200"
                  }
                `}
              >
                <div className="flex items-center justify-between gap-4 mb-4">

                  <div>
                    <h2 className="font-semibold text-lg text-gray-900">
                      Your Address
                    </h2>
                  </div>

                  {!editingAddress ? (
                    <button
                      type="button"
                      onClick={async () => {
                        const canSwitch =
                          await finishCurrentEdit();

                        if (!canSwitch) {
                          return;
                        }

                        setShowAddressEditWarning(true);
                      }}
                      className="
                        flex-shrink-0
                        text-sm
                        px-3
                        py-1.5
                        rounded-lg
                        border
                        border-gray-300
                        text-gray-700
                        hover:bg-gray-50
                        transition
                      "
                    >
                      🔒 Edit
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={async () => {
                        await finishAddressEdit();
                      }}
                      className="
                        flex-shrink-0
                        text-sm
                        px-3
                        py-1.5
                        rounded-lg
                        bg-gray-800
                        text-white
                        hover:bg-gray-700
                        transition
                      "
                    >
                      Done
                    </button>
                  )}

                </div>

                {unfinishedEditError === "address" && (
                  <p className="text-sm text-red-600 mb-4">
                    Please press Done to finish editing before continuing.
                  </p>
                )}

                {!editingAddress ? (
                  <input
                    type="text"
                    value={customer.address}
                    readOnly
                    className={`
                      ${INPUT_CLASS}
                      bg-gray-100
                      cursor-not-allowed
                      text-gray-500
                      ${addressError
                        ? "border-red-500 focus:ring-red-500"
                        : ""
                      }
                    `}
                  />
                ) : googleMapsFailed ? (
                  <input
                    type="text"
                    value={customer.address}
                    placeholder="e.g. 123 Queen Street, Brisbane QLD 4000"
                    onChange={(e) => {
                      const newAddress =
                        e.target.value;

                      const {
                        suburb,
                        state,
                        postcode,
                      } = parseAddress(
                        newAddress
                      );

                      setCustomer((prev) => ({
                        ...prev,
                        address: newAddress,
                        suburb,
                        state,
                        postcode,
                      }));

                      setAddressSelected(false);
                      setAddressError("");
                    }}
                    className={`
                      ${INPUT_CLASS}
                      bg-white
                      ${addressError
                        ? "border-red-500 focus:ring-red-500"
                        : ""
                      }
                    `}
                  />
                ) : (
                  <div>
                    <div
                      ref={addressContainerRef}
                      className={`
                        w-full
                        min-h-12
                        rounded-xl
                        border
                        bg-white
                        ${addressError
                          ? "border-red-500"
                          : "border-gray-300"
                        }
                      `}
                    />

                    <p className="text-xs text-gray-500 mt-2">
                      Start typing your address and select it from the suggestions.
                    </p>
                  </div>
                )}

                {addressError && (
                  <ErrorMessage>
                    {addressError}
                  </ErrorMessage>
                )}
              </div>

              {/* YOUR PETS */}

              <div className="px-5 py-5">

                <div className="mb-4">
                  <h2 className="font-semibold text-lg text-gray-900">
                    Your Pets
                  </h2>

                  <p className="text-sm text-gray-500 mt-1">
                    {pets.length}{" "}
                    {pets.length === 1
                      ? "pet"
                      : "pets"}{" "}
                    insured
                  </p>
                </div>

                <div className="space-y-5">

                  {pets.map(
                    (pet, index) => (
                      <div
                        key={index}
                        id={`pet-details-${index}`}
                        className={`
                          border
                          rounded-xl
                          p-4
                          ${unfinishedEditError === "pet" &&
                            editingPet === index
                            ? "border-2 border-red-500 bg-red-50/30"
                            : "border-gray-200 bg-gray-50/30"
                          }
                        `}
                      >

                        {/* PET HEADER */}

                        <div className="flex items-center justify-between gap-3 mb-5">

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">

                              <h3 className="font-semibold text-gray-900">
                                Pet {index + 1}
                              </h3>

                              <span className="text-gray-300">
                                |
                              </span>

                              <span className="text-sm font-medium text-gray-500">
                                {pet.petType
                                  ? pet.petType
                                    .charAt(0)
                                    .toUpperCase() +
                                  pet.petType.slice(1)
                                  : "Pet"}
                              </span>

                            </div>

                          </div>

                          {editingPet !== index ? (
                            <button
                              type="button"
                              onClick={async () => {
                                const canSwitch =
                                  await finishCurrentEdit();

                                if (!canSwitch) {
                                  return;
                                }

                                setPetToEdit(index);
                                setShowEditWarning(true);
                              }}
                              className="
                                flex-shrink-0
                                text-sm
                                px-3
                                py-1.5
                                rounded-lg
                                border
                                border-gray-300
                                text-gray-700
                                hover:bg-gray-50
                                transition
                              "
                            >
                              🔒 Edit
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={async () => {
                                await finishPetEdit(index);
                              }}
                              className="
                                flex-shrink-0
                                text-sm
                                px-3
                                py-1.5
                                rounded-lg
                                bg-gray-800
                                text-white
                                hover:bg-gray-700
                                transition
                              "
                            >
                              Done
                            </button>
                          )}

                        </div>
                        {unfinishedEditError === "pet" &&
                          editingPet === index && (
                            <p className="text-sm text-red-600 mb-4">
                              Please press Done to finish editing before continuing.
                            </p>
                          )}

                        {/* PET NAME */}

                        <FormField label="Pet Name">
                          <input
                            value={pet.name}
                            readOnly={
                              editingPet !== index
                            }
                            onChange={(e) => {
                              const value = e.target.value;

                              updatePet(index, {
                                name: value,
                              });

                              const validPetName =
                                isValidName(value);

                              if (validPetName) {
                                setPetErrors((current) => ({
                                  ...current,
                                  [index]: {
                                    ...(current[index] ?? { name: "", breed: "", dob: "", gender: "" }),
                                    name: "",
                                  },
                                }));
                              }
                            }}
                            className={`
                              ${INPUT_CLASS}
                              ${editingPet !== index
                                ? "bg-gray-100 cursor-not-allowed"
                                : "bg-white"
                              }
                              ${petErrors[index]?.name
                                ? "border-red-500 focus:ring-red-500"
                                : ""
                              }
                            `}
                            style={{
                              color:
                                editingPet !== index
                                  ? "#6b7280"
                                  : "#111827",
                            }}
                          />

                          {petErrors[index]?.name && (
                            <ErrorMessage>
                              {petErrors[index].name}
                            </ErrorMessage>
                          )}

                        </FormField>

                        {/* BREED */}

                        <div className="mt-4">
                          <FormField label="Breed">
                            <Select<
                              Option,
                              false
                            >
                              options={options}

                              menuIsOpen={openBreedDropdown === index}

                              onMenuOpen={() => {
                                setOpenDatePicker(null);
                                setOpenBreedDropdown(index);
                              }}

                              onMenuClose={() => {
                                setOpenBreedDropdown((current) =>
                                  current === index ? null : current
                                );
                              }}

                              value={
                                options.find(
                                  (option) =>
                                    option.value ===
                                    pet.breed
                                ) || null
                              }

                              onChange={(
                                selected
                              ) => {
                                if (!selected) {
                                  updatePet(
                                    index,
                                    {
                                      breed: "",
                                      petType: null,
                                    }
                                  );

                                  return;
                                }

                                updatePet(
                                  index,
                                  {
                                    breed:
                                      selected.value,

                                    petType:
                                      selected.petType.toLowerCase() as
                                      | "cat"
                                      | "dog",
                                  }
                                );
                                setPetErrors((current) => ({
                                  ...current,
                                  [index]: {
                                    ...(current[index] ?? { name: "", breed: "", dob: "", gender: "" }),
                                    breed: "",
                                  },
                                }));
                              }}

                              styles={{
                                ...selectStyles,

                                control: (
                                  base: any,
                                  state: any
                                ) => ({
                                  ...selectStyles.control(
                                    base,
                                    state
                                  ),

                                  border: petErrors[index]?.breed
                                    ? "1px solid #ef4444"
                                    : "1px solid #d1d5db",

                                  boxShadow:
                                    petErrors[index]?.breed &&
                                      state.isFocused
                                      ? "0 0 0 2px #ef4444"
                                      : "none",
                                }),
                              }}

                              components={{
                                IndicatorSeparator: () => null,
                                DropdownIndicator: (props: any) => (
                                  <components.DropdownIndicator {...props}>
                                    <svg
                                      width="14"
                                      height="14"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <polyline points="6 9 12 15 18 9" />
                                    </svg>
                                  </components.DropdownIndicator>
                                ),
                              }}

                              isDisabled={
                                editingPet !== index
                              }

                              isLoading={
                                loadingBreeds
                              }

                              placeholder="Select breed"

                              noOptionsMessage={() =>
                                loadingBreeds
                                  ? "Loading breeds..."
                                  : "No breeds found"
                              }
                            />

                            {petErrors[index]?.breed && (
                              <ErrorMessage>
                                {petErrors[index].breed}
                              </ErrorMessage>
                            )}

                          </FormField>
                        </div>

                        {/* DOB + SEX */}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">

                          <FormField label="Date of Birth">
                            <div className="relative w-full">
                              <input
                                type="text"
                                inputMode="numeric"
                                placeholder="DD/MM/YYYY"
                                disabled={editingPet !== index}
                                value={
                                  dobInputs[index] ??
                                  (pet.dob
                                    ? pet.dob.split("-").reverse().join("/")
                                    : "")
                                }
                                onFocus={() => {
                                  if (editingPet === index) {
                                    setOpenBreedDropdown(null);
                                    setOpenDatePicker(index);
                                  }
                                }}
                                onChange={(e) => {
                                  const digits = e.target.value
                                    .replace(/\D/g, "")
                                    .slice(0, 8);

                                  let formatted = digits;

                                  if (digits.length > 4) {
                                    formatted =
                                      `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
                                  } else if (digits.length > 2) {
                                    formatted =
                                      `${digits.slice(0, 2)}/${digits.slice(2)}`;
                                  }

                                  setDobInputs((current) => ({
                                    ...current,
                                    [index]: formatted,
                                  }));

                                  if (digits.length !== 8) {
                                    updatePet(index, {
                                      dob: "",
                                    });

                                    return;
                                  }

                                  const day = Number(digits.slice(0, 2));
                                  const month = Number(digits.slice(2, 4));
                                  const year = Number(digits.slice(4, 8));

                                  const typedDate = new Date(
                                    year,
                                    month - 1,
                                    day
                                  );

                                  const isValidDate =
                                    typedDate.getFullYear() === year &&
                                    typedDate.getMonth() === month - 1 &&
                                    typedDate.getDate() === day;

                                  if (!isValidDate) {
                                    updatePet(index, {
                                      dob: "",
                                    });

                                    setPetErrors((current) => ({
                                      ...current,
                                      [index]: {
                                        ...(current[index] ?? {
                                          name: "",
                                          breed: "",
                                          dob: "",
                                          gender: "",
                                        }),
                                        dob: "Please enter a valid date of birth.",
                                      },
                                    }));

                                    return;
                                  }

                                  const monthString = String(month).padStart(2, "0");
                                  const dayString = String(day).padStart(2, "0");

                                  updatePet(index, {
                                    dob: `${year}-${monthString}-${dayString}`,
                                  });
                                  setPetErrors((current) => ({
                                    ...current,
                                    [index]: {
                                      ...(current[index] ?? {
                                        name: "",
                                        breed: "",
                                        dob: "",
                                        gender: "",
                                      }),
                                      dob: "",
                                    },
                                  }));
                                }}
                                className={`
                                  ${INPUT_CLASS}
                                  pr-[45px]
                                  ${editingPet !== index
                                    ? "bg-gray-100 cursor-not-allowed text-gray-500"
                                    : "bg-white text-gray-900"
                                  }
                                  ${petErrors[index]?.dob
                                    ? "border-red-500 focus:ring-red-500"
                                    : ""
                                  }
                                `}
                              />

                              <button
                                type="button"
                                disabled={editingPet !== index}
                                onClick={() => {
                                  setOpenBreedDropdown(null);

                                  setOpenDatePicker(
                                    openDatePicker === index
                                      ? null
                                      : index
                                  );
                                }}
                                aria-label="Open date picker"
                                className="
                                  absolute
                                  right-[15px]
                                  top-1/2
                                  -translate-y-1/2
                                  flex
                                  items-center
                                  justify-center
                                  text-[#555]
                                  disabled:text-gray-400
                                  disabled:cursor-not-allowed
                                "
                              >
                                <svg
                                  width="18"
                                  height="18"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <rect
                                    x="3"
                                    y="4"
                                    width="18"
                                    height="18"
                                    rx="2"
                                    ry="2"
                                  />
                                  <line x1="16" y1="2" x2="16" y2="6" />
                                  <line x1="8" y1="2" x2="8" y2="6" />
                                  <line x1="3" y1="10" x2="21" y2="10" />
                                </svg>
                              </button>
                            </div>

                            {openDatePicker === index && (
                              <div
                                className="
                                  mt-2
                                  w-full
                                  rounded-xl
                                  border
                                  border-gray-300
                                  bg-white
                                  p-3
                                  shadow-lg
                                "
                              >
                                <DayPicker
                                  mode="single"

                                  styles={{
                                    root: {
                                      width: "100%",
                                      maxWidth: "none",
                                    },
                                    months: {
                                      width: "100%",
                                      maxWidth: "none",
                                    },
                                    month: {
                                      width: "100%",
                                    },
                                    month_grid: {
                                      width: "100%",
                                      tableLayout: "fixed",
                                    },
                                  }}

                                  selected={
                                    pet.dob
                                      ? new Date(`${pet.dob}T00:00:00`)
                                      : undefined
                                  }
                                  onSelect={(selectedDate) => {
                                    if (!selectedDate) return;

                                    const year =
                                      selectedDate.getFullYear();

                                    const month = String(
                                      selectedDate.getMonth() + 1
                                    ).padStart(2, "0");

                                    const day = String(
                                      selectedDate.getDate()
                                    ).padStart(2, "0");

                                    updatePet(index, {
                                      dob: `${year}-${month}-${day}`,
                                    });

                                    setPetErrors((current) => ({
                                      ...current,
                                      [index]: {
                                        ...(current[index] ?? {
                                          name: "",
                                          breed: "",
                                          dob: "",
                                          gender: "",
                                        }),
                                        dob: "",
                                      },
                                    }));

                                    setDobInputs((current) => ({
                                      ...current,
                                      [index]: `${day}/${month}/${year}`,
                                    }));

                                    setOpenDatePicker(null);
                                  }}
                                />
                              </div>
                            )}
                            {petErrors[index]?.dob && (
                              <ErrorMessage>
                                {petErrors[index].dob}
                              </ErrorMessage>
                            )}
                          </FormField>

                          <FormField label="Sex">

                            <div className="relative">
                              <select
                                value={pet.gender || ""}
                                disabled={editingPet !== index}
                                onChange={(e) => {
                                  const value =
                                    e.target.value as
                                    | "male"
                                    | "female";

                                  updatePet(index, {
                                    gender: value,
                                  });

                                  setPetErrors((current) => ({
                                    ...current,
                                    [index]: {
                                      ...(current[index] ?? {
                                        name: "",
                                        breed: "",
                                        dob: "",
                                        gender: "",
                                      }),
                                      gender: "",
                                    },
                                  }));
                                }}

                                className={`
                                  ${INPUT_CLASS}
                                  appearance-none
                                  pr-[45px]
                                  ${editingPet !== index
                                    ? "bg-gray-100 text-gray-600 cursor-not-allowed"
                                    : "bg-white text-gray-900 cursor-pointer"
                                  }
                                  ${petErrors[index]?.gender
                                    ? "border-red-500 focus:ring-red-500"
                                    : ""
                                  }
                                `}
                              >
                                <option value="">
                                  Select sex
                                </option>

                                <option value="male">
                                  Male
                                </option>

                                <option value="female">
                                  Female
                                </option>
                              </select>

                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="
                                  absolute
                                  right-[15px]
                                  top-1/2
                                  -translate-y-1/2
                                  pointer-events-none
                                  text-[#555]
                                "
                              >
                                <polyline points="6 9 12 15 18 9" />
                              </svg>
                            </div>
                            {petErrors[index]?.gender && (
                              <ErrorMessage>
                                {petErrors[index].gender}
                              </ErrorMessage>
                            )}
                          </FormField>

                        </div>

                      </div>
                    )
                  )}

                </div>
              </div>

            </div>
          )}
        </div>

        {/* REVIEW YOUR PET COVER */}

        <div
          className="
            bg-white
            rounded-xl
            border
            border-gray-200
            shadow-sm
            overflow-hidden
            mb-6
          "
        >
          <button
            type="button"
            onClick={() =>
              setOpenPetCover(
                (current) => !current
              )
            }
            className="
              w-full
              flex
              items-center
              justify-between
              gap-4
              px-5
              py-5
              text-left
              hover:bg-gray-50
              transition
            "
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Review your pet cover
                </h2>
              </div>

              <p className="text-sm text-gray-500 mt-1">
                Annual limit, benefit, excess and plan
              </p>
            </div>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`
                flex-shrink-0
                text-[#555]
                transition-transform
                duration-200
                ${openPetCover ? "rotate-180" : ""}
              `}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {openPetCover && (
            <div className="border-t border-gray-200">

              {/* PET COVER ROWS */}

              {pets.map(
                (pet, index) => {
                  const petSettings =
                    cover?.petSettings?.[
                    String(index)
                    ];

                  const selectedPlan =
                    petSettings?.plan;

                  const price =
                    pricing.pets[index]?.price ??
                    null;

                  return (
                    <div
                      key={index}
                      id={`pet-cover-${index}`}
                      className={`
                        px-5
                        py-5
                        border-b
                        ${unfinishedEditError === "cover" &&
                          editingCover === index
                          ? "border-2 border-red-500 bg-red-50/30"
                          : "border-gray-200"
                        }
                        last:border-b-0
                      `}
                    >

                      {/* COVER TOP ROW */}

                      <div className="flex items-start justify-between gap-4">

                        <div className="min-w-0">
                          <div className="text-base font-semibold text-gray-900">
                            {pet.name ||
                              `Pet ${index + 1
                              }`}
                          </div>
                        </div>

                        {/* PRICE + EDIT */}

                        <div className="flex-shrink-0 flex items-center gap-3">

                          {pets.length > 1 && (
                            <div className="text-right">

                              {pricingLoading ? (
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
                              ) : price !== null ? (
                                <>
                                  <div className="text-lg font-semibold text-gray-900">
                                    ${price.toFixed(2)}
                                  </div>

                                  <div className="text-[10px] text-gray-500">
                                    per month
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="text-lg font-semibold text-gray-400">
                                    —
                                  </div>

                                  <div className="text-[10px] text-gray-500">
                                    Price unavailable
                                  </div>
                                </>
                              )}

                            </div>
                          )}

                          {/* COVER EDIT BUTTON */}

                          {editingCover !== index ? (
                            <button
                              type="button"
                              onClick={async () => {
                                const canSwitch =
                                  await finishCurrentEdit();

                                if (!canSwitch) {
                                  return;
                                }

                                setCoverToEdit(index);
                                setShowCoverEditWarning(true);
                              }}
                              className="
                                flex-shrink-0
                                text-sm
                                px-3
                                py-1.5
                                rounded-lg
                                border
                                border-gray-300
                                text-gray-700
                                hover:bg-gray-50
                                transition
                              "
                            >
                              🔒 Edit
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={async () => {
                                await finishCoverEdit();
                              }}
                              className="
                                flex-shrink-0
                                text-sm
                                px-3
                                py-1.5
                                rounded-lg
                                bg-gray-800
                                text-white
                                hover:bg-gray-700
                                transition
                              "
                            >
                              Done
                            </button>
                          )}

                        </div>

                      </div>

                      {unfinishedEditError === "cover" &&
                        editingCover === index && (
                          <p className="text-sm text-red-600 mb-4">
                            Please press Done to finish editing before continuing.
                          </p>
                        )}

                      {/* COVER OPTIONS */}

                      {selectedPlan &&
                        petSettings && (
                          <div className="mt-4">

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                              {/* ANNUAL LIMIT */}

                              <div className="
                                rounded-lg
                                bg-gray-50
                                border
                                border-gray-200
                                px-3
                                py-3
                              ">
                                <label className="block text-sm font-semibold text-gray-900 mb-2">
                                  Annual limit
                                </label>

                                <div className="relative">

                                  <select
                                    value={
                                      petSettings.limit
                                    }
                                    disabled={
                                      editingCover !==
                                      index
                                    }
                                    onChange={(e) =>
                                      updateCoverSetting(
                                        index,
                                        {
                                          limit:
                                            Number(
                                              e.target
                                                .value
                                            ),
                                        }
                                      )
                                    }
                                    className={`
                                    w-full
                                    h-12
                                    pl-4
                                    pr-[45px]
                                    appearance-none
                                    rounded-xl
                                    border
                                    border-gray-300
                                    text-sm
                                    font-semibold
                                    focus:outline-none
                                    focus:ring-2
                                    focus:ring-gray-800
                                    ${editingCover !==
                                        index
                                        ? "bg-gray-100 text-gray-600 cursor-not-allowed"
                                        : "bg-white text-gray-900 cursor-pointer"
                                      }
                                  `}
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

                                  <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="
                                    absolute
                                    right-[15px]
                                    top-1/2
                                    -translate-y-1/2
                                    pointer-events-none
                                    text-[#555]
                                  "
                                  >
                                    <polyline points="6 9 12 15 18 9" />
                                  </svg>

                                </div>
                              </div>

                              {/* BENEFIT */}

                              <div className="
                                rounded-lg
                                bg-gray-50
                                border
                                border-gray-200
                                px-3
                                py-3
                              ">
                                <label className="block text-sm font-semibold text-gray-900 mb-2">
                                  Benefit
                                </label>

                                <div className="relative">
                                  <select
                                    value={
                                      petSettings.benefit
                                    }
                                    disabled={
                                      editingCover !==
                                      index
                                    }
                                    onChange={(e) =>
                                      updateCoverSetting(
                                        index,
                                        {
                                          benefit:
                                            Number(
                                              e.target.value
                                            ),
                                        }
                                      )
                                    }
                                    className={`
                                      w-full
                                      h-12
                                      pl-4
                                      pr-[45px]
                                      appearance-none
                                      rounded-xl
                                      border
                                      border-gray-300
                                      text-sm
                                      font-semibold
                                      focus:outline-none
                                      focus:ring-2
                                      focus:ring-gray-800
                                      ${editingCover !== index
                                        ? "bg-gray-100 text-gray-600 cursor-not-allowed"
                                        : "bg-white text-gray-900 cursor-pointer"
                                      }
                                    `}
                                  >
                                    {Array.from(
                                      { length: 7 },
                                      (_, i) => {
                                        const value = 60 + i * 5;

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

                                  <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="
                                      absolute
                                      right-[15px]
                                      top-1/2
                                      -translate-y-1/2
                                      pointer-events-none
                                      text-[#555]
                                    "
                                  >
                                    <polyline points="6 9 12 15 18 9" />
                                  </svg>
                                </div>
                              </div>

                              {/* ANNUAL EXCESS */}

                              <div className="
                                rounded-lg
                                bg-gray-50
                                border
                                border-gray-200
                                px-3
                                py-3
                              ">
                                <label className="block text-sm font-semibold text-gray-900 mb-2">
                                  Annual excess
                                </label>

                                <div className="relative">
                                  <select
                                    value={
                                      petSettings.excess
                                    }
                                    disabled={
                                      editingCover !==
                                      index
                                    }
                                    onChange={(e) =>
                                      updateCoverSetting(
                                        index,
                                        {
                                          excess:
                                            Number(
                                              e.target.value
                                            ),
                                        }
                                      )
                                    }
                                    className={`
                                      w-full
                                      h-12
                                      pl-4
                                      pr-[45px]
                                      appearance-none
                                      rounded-xl
                                      border
                                      border-gray-300
                                      text-sm
                                      font-semibold
                                      focus:outline-none
                                      focus:ring-2
                                      focus:ring-gray-800
                                      ${editingCover !== index
                                        ? "bg-gray-100 text-gray-600 cursor-not-allowed"
                                        : "bg-white text-gray-900 cursor-pointer"
                                      }
                                    `}
                                  >
                                    {Array.from(
                                      { length: 21 },
                                      (_, i) => {
                                        const value = i * 50;

                                        return (
                                          <option
                                            key={value}
                                            value={value}
                                          >
                                            ${value.toLocaleString()}
                                          </option>
                                        );
                                      }
                                    )}
                                  </select>

                                  <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="
                                      absolute
                                      right-[15px]
                                      top-1/2
                                      -translate-y-1/2
                                      pointer-events-none
                                      text-[#555]
                                    "
                                  >
                                    <polyline points="6 9 12 15 18 9" />
                                  </svg>
                                </div>
                              </div>

                              {/* PLAN */}

                              <div className="
                                rounded-lg
                                bg-gray-50
                                border
                                border-gray-200
                                px-3
                                py-3
                              ">
                                <label className="block text-sm font-semibold text-gray-900 mb-2">
                                  Plan
                                </label>

                                <div className="relative">
                                  <select
                                    value={
                                      petSettings.plan ===
                                        "gold"
                                        ? "gold"
                                        : "upgraded"
                                    }
                                    disabled={
                                      editingCover !==
                                      index
                                    }
                                    onChange={(e) =>
                                      updateCoverSetting(
                                        index,
                                        {
                                          plan:
                                            e.target.value,
                                        }
                                      )
                                    }
                                    className={`
                                      w-full
                                      h-12
                                      pl-4
                                      pr-[45px]
                                      appearance-none
                                      rounded-xl
                                      border
                                      border-gray-300
                                      text-sm
                                      font-semibold
                                      focus:outline-none
                                      focus:ring-2
                                      focus:ring-gray-800
                                      ${editingCover !== index
                                        ? "bg-gray-100 text-gray-600 cursor-not-allowed"
                                        : "bg-white text-gray-900 cursor-pointer"
                                      }
                                    `}
                                  >
                                    <option value="upgraded">
                                      Silver
                                    </option>

                                    <option value="gold">
                                      Gold
                                    </option>
                                  </select>

                                  <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="
                                      absolute
                                      right-[15px]
                                      top-1/2
                                      -translate-y-1/2
                                      pointer-events-none
                                      text-[#555]
                                    "
                                  >
                                    <polyline points="6 9 12 15 18 9" />

                                  </svg>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                    </div>
                  );
                }
              )}

              {/* TOTAL */}

              <div
                className="
                  bg-gray-50
                  px-5
                  py-5
                "
              >
                <div className="flex items-center justify-between gap-4">

                  <div>
                    <div className="text-sm font-semibold text-gray-900">
                      Total monthly premium
                    </div>

                    <div className="text-xs text-gray-500 mt-0.5">
                      For all insured pets
                    </div>
                  </div>

                  <div className="text-right">

                    {pricingLoading ? (
                      <span className="text-sm text-gray-500">
                        Updating
                      </span>
                    ) : pricing.total !== null ? (
                      <div className="text-2xl font-bold text-gray-900">
                        ${pricing.total.toFixed(2)}
                      </div>
                    ) : (
                      <div className="text-2xl font-bold text-gray-400">
                        —
                      </div>
                    )}

                  </div>

                </div>
              </div>

            </div>
          )}
        </div>

        {/* ACKNOWLEDGEMENTS */}

        <div
          className="
            mt-6
            bg-white
            rounded-xl
            border
            border-gray-200
            shadow-sm
            overflow-hidden
            mb-6
          "
        >
          <div className="divide-y divide-gray-200">

            {/* IMPORTANT INFORMATION */}

            <Acknowledgement
              id="terms"
              title="Important Information"
              description="Please review and acknowledge the information below before purchasing."
              openTerms={
                openTerms
              }
              setOpenTerms={
                setOpenTerms
              }
              checked={
                termsAccepted
              }
              setChecked={
                setTermsAccepted
              }
            >
              <div className="space-y-3">

                <p>
                  You understand and have complied with your{" "}
                  <a
                    href="#"
                    className="text-gray-900 underline font-medium"
                  >
                    Duty to take reasonable care not to make a misrepresentation
                  </a>
                  .
                </p>

                <p>
                  A misrepresentation includes a statement that is false,
                  partially false, or which does not fairly reflect the truth.
                </p>

                <p>
                  All your answers and statements made in this application
                  are answered honestly, accurately and to the best of your
                  knowledge.
                </p>

                <p>
                  You have read and understand the{" "}
                  <a
                    href="#"
                    className="text-gray-900 underline font-medium"
                  >
                    Product Disclosure Statement (PDS)
                  </a>
                  ,{" "}
                  <a
                    href="#"
                    className="text-gray-900 underline font-medium"
                  >
                    Target Market Determination (TMD)
                  </a>{" "}
                  and Financial Services Guide.
                </p>

                <p className="font-medium text-gray-900">
                  You acknowledge:
                </p>

                <ul className="list-disc pl-5 space-y-2">
                  <li>
                    You are 18 years old or older.
                  </li>

                  <li>
                    Exclusion Periods apply from the start date of the Policy,
                    including 1 day for Injury, 14 days for Illness and 6 months
                    for Specified Conditions.
                  </li>

                  <li>
                    You have read the General Exclusions in the PDS, including
                    the exclusion of Pre-existing Symptoms and Conditions.
                  </li>

                  <li>
                    You have read the TMD and understand that eligible Vet Costs
                    must be paid upfront before claiming reimbursement.
                  </li>

                  <li>
                    Any Injuries, Illnesses and/or Specified Conditions that occur
                    prior to the end of an Exclusion Period will be considered
                    Pre-existing Symptoms and Conditions.
                  </li>
                </ul>

                <p>
                  By ticking the box you confirm all the statements above.
                </p>

              </div>
            </Acknowledgement>

            {/* PRIVACY POLICY */}

            <Acknowledgement
              id="privacy"
              title="Privacy Policy"
              description="Please review how your personal information is handled."
              openTerms={
                openTerms
              }
              setOpenTerms={
                setOpenTerms
              }
              checked={
                privacyAccepted
              }
              setChecked={
                setPrivacyAccepted
              }
            >
              <div className="space-y-3">

                <p>
                  You have read, understood and agree to the terms of our{" "}
                  <a
                    href="#"
                    className="text-gray-900 underline font-medium"
                  >
                    Privacy Policy
                  </a>
                  .
                </p>

                <p>
                  You consent to WAS Insurance and its relevant insurance
                  partners collecting, using and disclosing your personal
                  information as described in the Privacy Policy and Joint
                  Privacy Statement contained in the PDS.
                </p>

                <p>
                  You consent to receiving electronic communications from
                  WAS Insurance.
                </p>

              </div>
            </Acknowledgement>

          </div>
        </div>

        {/* ACTIONS */}

        <div className="mt-6 flex gap-3 pb-8">

          <button
            type="button"
            onClick={
              goBackToPlans
            }
            className="
              w-1/3
              h-12
              bg-white
              border
              border-gray-300
              hover:bg-gray-50
              active:bg-gray-100
              text-gray-800
              rounded-xl
              font-semibold
              text-sm
              transition
            "
          >
            Back
          </button>

          <button
            type="button"
            disabled={
              !termsAccepted ||
              !privacyAccepted ||
              pricingLoading ||
              pricing.total === null
            }
            onClick={confirmPayment}
            className="
              flex-1
              h-12
              rounded-xl
              font-semibold
              text-sm
              shadow-sm
              transition
              bg-amber-400
              hover:bg-amber-500
              active:bg-amber-600
              text-gray-900
              disabled:bg-gray-200
              disabled:text-gray-400
              disabled:cursor-not-allowed
            "
          >
            Confirm and Pay
          </button>

        </div>

        {/* PET EDIT WARNING */}

        {showEditWarning && (
          <WarningModal
            title="Change pet details?"
            message="Changing your pet's details may affect your insurance quote and pricing."
            secondaryMessage="Your current quote is based on the details entered earlier."
            onCancel={() => {
              setShowEditWarning(
                false
              );

              setPetToEdit(
                null
              );
            }}
            onContinue={() => {
              if (
                petToEdit !==
                null
              ) {
                setEditingPet(
                  petToEdit
                );
              }

              setShowEditWarning(
                false
              );

              setPetToEdit(
                null
              );
            }}
          />
        )}

        {/* ADDRESS EDIT WARNING */}

        {showAddressEditWarning && (
          <WarningModal
            title="Change your address?"
            message="Changing your address may affect your insurance quote and pricing."
            secondaryMessage="Your current quote is based on the details entered earlier."
            onCancel={() =>
              setShowAddressEditWarning(
                false
              )
            }
            onContinue={() => {
              setAddressSelected(
                Boolean(
                  customer.address.trim() &&
                  customer.suburb.trim() &&
                  customer.state.trim() &&
                  customer.postcode.trim()
                )
              );

              setAddressError("");

              setEditingAddress(true);

              setShowAddressEditWarning(false);
            }}
          />
        )}

        {/* COVER EDIT WARNING */}

        {showCoverEditWarning && (
          <WarningModal
            title="Change your cover?"
            message="Changing your cover may affect your insurance premium."
            secondaryMessage="Your current premium is based on the cover selected earlier."
            onCancel={() => {
              setShowCoverEditWarning(
                false
              );

              setCoverToEdit(
                null
              );
            }}
            onContinue={() => {
              if (
                coverToEdit !==
                null
              ) {
                setEditingCover(
                  coverToEdit
                );
              }

              setShowCoverEditWarning(
                false
              );

              setCoverToEdit(
                null
              );
            }}
          />
        )}

      </div>
    </div>
  );
}

export default function DetailsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          Loading...
        </div>
      }
    >
      <DetailsContent />
    </Suspense>
  );
}
/* -----------------------------
   SECTION
------------------------------*/

function Section({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section
      className="
        bg-white
        rounded-xl
        border
        border-gray-200
        p-6
        mb-5
        shadow-sm
      "
    >
      <div className="flex items-center justify-between gap-4 mb-5">

        <h2 className="font-semibold text-lg text-gray-900">
          {title}
        </h2>

        {action}

      </div>

      {children}
    </section>
  );
}

/* -----------------------------
   FORM FIELD
------------------------------*/

function FormField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label
        className="
          block
          text-sm
          font-semibold
          text-gray-900
          mb-2
        "
      >
        {label}
      </label>

      {children}
    </div>
  );
}

/* -----------------------------
   ERROR MESSAGE
------------------------------*/

function ErrorMessage({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <p className="text-sm text-red-600 mt-1.5">
      {children}
    </p>
  );
}

/* -----------------------------
   ACKNOWLEDGEMENT
------------------------------*/

function Acknowledgement({
  id,
  title,
  description,
  openTerms,
  setOpenTerms,
  checked,
  setChecked,
  children,
}: {
  id: string;
  title: string;
  description: string;
  openTerms: string | null;
  setOpenTerms: (
    value: string | null
  ) => void;
  checked: boolean;
  setChecked: (
    value: boolean
  ) => void;
  children: ReactNode;
}) {
  const isOpen =
    openTerms === id;

  return (
    <div className="bg-white pb-5">

      <button
        type="button"
        onClick={() =>
          setOpenTerms(
            isOpen
              ? null
              : id
          )
        }
        className="
          w-full
          flex
          items-center
          justify-between
          gap-4
          text-left
          px-5
          py-5
          transition
          hover:bg-gray-50
        "
      >

        <div className="min-w-0">

          <h3 className="text-lg font-semibold text-gray-900">
            {title}
          </h3>

          <p className="text-sm text-gray-500 mt-1">
            {description}
          </p>

        </div>

        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`
            flex-shrink-0
            text-[#555]
            transition-transform
            duration-200
            ${isOpen ? "rotate-180" : ""}
          `}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>

      </button>

      {isOpen && (
        <div
          className="
            border-t
            border-gray-200
            px-5
            py-5
            bg-gray-50
            text-sm
            text-gray-700
            leading-6
          "
        >
          {children}
        </div>
      )}

      <label
        className="
          flex
          items-start
          gap-3
          mt-4
          px-5
          cursor-pointer
        "
      >

        <input
          type="checkbox"
          checked={
            checked
          }
          onChange={(e) =>
            setChecked(
              e.target.checked
            )
          }
          className="
            mt-0.5
            w-5
            h-5
            accent-gray-800
            flex-shrink-0
            cursor-pointer
          "
        />

        <span className="text-sm text-gray-700 leading-5">
          {id ===
            "terms"
            ? "I confirm all the statements above and acknowledge that I have read and understood the important information."
            : "I have read, understood and agree to the Privacy Policy."}
        </span>

      </label>

    </div>
  );
}

/* -----------------------------
   WARNING MODAL
------------------------------*/

function WarningModal({
  title,
  message,
  secondaryMessage,
  onCancel,
  onContinue,
}: {
  title: string;
  message: string;
  secondaryMessage: string;
  onCancel: () => void;
  onContinue: () => void;
}) {
  return (
    <div
      className="
        fixed
        inset-0
        z-50
        flex
        items-center
        justify-center
        bg-black/40
        px-4
        backdrop-blur-[1px]
      "
    >

      <div
        className="
          w-full
          max-w-md
          bg-white
          rounded-2xl
          shadow-2xl
          border
          border-gray-200
          p-6
        "
      >

        <div className="flex items-center gap-3 mb-4">

          <div
            className="
              w-10
              h-10
              rounded-full
              bg-amber-100
              flex
              items-center
              justify-center
              text-lg
              flex-shrink-0
            "
          >
            ⚠️
          </div>

          <h2 className="text-lg font-semibold text-gray-900">
            {title}
          </h2>

        </div>

        <p className="text-sm text-gray-600 leading-6">
          {message}
        </p>

        <p className="text-sm text-gray-600 leading-6 mt-2">
          {secondaryMessage}
        </p>

        <div className="flex gap-3 mt-6">

          <button
            type="button"
            onClick={
              onCancel
            }
            className="
              flex-1
              h-11
              rounded-xl
              border
              border-gray-300
              text-gray-700
              text-sm
              font-medium
              hover:bg-gray-50
              transition
            "
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={
              onContinue
            }
            className="
              flex-1
              h-11
              rounded-xl
              bg-gray-800
              text-white
              text-sm
              font-medium
              hover:bg-gray-700
              transition
            "
          >
            Continue
          </button>

        </div>

      </div>
    </div>
  );
}
