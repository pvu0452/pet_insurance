"use client";


import React, { Suspense, useEffect, useState } from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";
import Select from "react-select";

/* -----------------------------
   TYPES
------------------------------*/

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
  petSettings: {
    [key: string]: PetCoverSetting;
  };
  plans: {
    [key: string]: string;
  };
  price: number;
  applyToAllPets: boolean;
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

  const [pricingLoading, setPricingLoading] =
    useState(false);

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

  /* -----------------------------
     PET EDITING
  ------------------------------*/

  const [editingPet, setEditingPet] =
    useState<number | null>(null);

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

  /* -----------------------------
     PROGRESS
  ------------------------------*/

  const steps = [
    "Quote",
    "Plans",
    "Details",
  ];

  const currentStep = 2;

  const progress =
    (currentStep /
      (steps.length - 1)) *
    100;

  /* -----------------------------
     STYLES
  ------------------------------*/

  const inputStyle = `
    w-full
    h-12
    px-4
    rounded-xl
    border
    border-gray-300
    text-sm
    placeholder-gray-400
    focus:outline-none
    focus:ring-2
    focus:ring-gray-800
    focus:border-transparent
    transition
  `;

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

      console.log(
        "BREED OPTIONS:",
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
    try {
      setPricingLoading(true);

      if (!cover) {
        console.error(
          "No cover information found."
        );

        return;
      }

      const today =
        new Intl.DateTimeFormat(
          "en-CA",
          {
            timeZone:
              "Australia/Brisbane",
          }
        ).format(new Date());

      console.log(
        "PRICING ADDRESS:",
        {
          address:
            updatedCustomer.address,

          suburb:
            updatedCustomer.suburb,

          state:
            updatedCustomer.state,

          postcode:
            updatedCustomer.postcode,
        }
      );

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
                  `Incomplete cover information for Pet ${
                    index + 1
                  }:`,
                  petSettings
                );

                return {
                  name:
                    pet.name ||
                    `Pet ${
                      index + 1
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

              console.log(
                `PRICING REQUEST - Pet ${
                  index + 1
                }:`,
                payload
              );

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
                  `Quote request failed for Pet ${
                    index + 1
                  }`
                );
              }

              const data =
                await response.json();

              console.log(
                `PRICING RESPONSE - Pet ${
                  index + 1
                }:`,
                data
              );

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
                  `Pet ${
                    index + 1
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

      console.log(
        "UPDATED PRICING:",
        pricingPets
      );

      console.log(
        "UPDATED TOTAL:",
        total
      );

      setPricing({
        pets:
          pricingPets,

        total:
          Number(
            total.toFixed(2)
          ),
      });
    } catch (error) {
      console.error(
        "PRICING REFRESH ERROR:",
        error
      );
    } finally {
      setPricingLoading(false);
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
    }

    if (!customer.lastName.trim()) {
      errors.lastName =
        "Please enter your last name.";
    }

    const cleanedMobile =
      customer.mobile.replace(/\D/g, "");

    if (!cleanedMobile) {
      errors.mobile =
        "Please enter your mobile number.";
    } else if (
      cleanedMobile.length !== 10
    ) {
      errors.mobile =
        "Mobile number must be 10 digits.";
    }

    const email =
      customer.email.trim();

    if (!email) {
      errors.email =
        "Please enter your email address.";
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email
      )
    ) {
      errors.email =
        "Please enter a valid email address.";
    }

    setCustomerErrors(errors);

    if (errors.firstName) {
      document
        .getElementById("customer-first-name")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });

      return false;
    }

    if (errors.lastName) {
      document
        .getElementById("customer-last-name")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });

      return false;
    }

    if (errors.mobile) {
      document
        .getElementById("customer-mobile")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });

      return false;
    }

    if (errors.email) {
      document
        .getElementById("customer-email")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });

      return false;
    }

    return true;
  }

  /* -----------------------------
     SAVE DETAILS TO URL
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

            policy_start_date:
              new Intl.DateTimeFormat(
                "en-CA",
                {
                  timeZone:
                    "Australia/Brisbane",
                }
              ).format(
                new Date()
              ),

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

  /* -----------------------------
     CONFIRM PAYMENT
  ------------------------------*/

  async function confirmPayment() {
    if (
      !validateCustomerDetails()
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
     INITIAL LOAD
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

    console.log(
      "COVER STORAGE:",
      storedCover
    );

    console.log(
      "PET STORAGE:",
      storedPet
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
     INITIAL / COVER PRICING
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
      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* LOGO */}

        <img
          src="/was-logo.min.webp"
          className="
            w-28
            opacity-70
            mb-5
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

        <div className="mb-8">
          <div className="flex justify-between text-xs text-gray-500 mb-2">
            {steps.map(
              (step) => (
                <span
                  key={step}
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
        </div>

        {/* CUSTOMER DETAILS */}

        <Section title="Your Details">
          <div className="space-y-5">

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

  {/* FIRST NAME */}

  <FormField label="First Name">
    <input
      id="customer-first-name"
      value={customer.firstName}
      onChange={(e) =>
        setCustomer({
          ...customer,
          firstName:
            e.target.value,
        })
      }
      className={`${inputStyle} ${
        customerErrors.firstName
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
      onChange={(e) =>
        setCustomer({
          ...customer,
          lastName:
            e.target.value,
        })
      }
      className={`${inputStyle} ${
        customerErrors.lastName
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
                onChange={(e) =>
                  setCustomer({
                    ...customer,
                    mobile:
                      e.target.value,
                  })
                }
                className={`${inputStyle} ${
                  customerErrors.mobile
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
                onChange={(e) =>
                  setCustomer({
                    ...customer,
                    email:
                      e.target.value,
                  })
                }
                className={`${inputStyle} ${
                  customerErrors.email
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
              text-left
              hover:bg-gray-50
              transition
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

            <span
              className="
                flex-shrink-0
                w-8
                h-8
                rounded-full
                bg-gray-100
                border
                border-gray-200
                flex
                items-center
                justify-center
                text-gray-500
                text-xs
              "
            >
              {openPetDetails ? "▲" : "▼"}
            </span>
          </button>

          {openPetDetails && (
            <div className="border-t border-gray-200">

              {/* YOUR ADDRESS */}

              <div className="px-5 py-5 border-b border-gray-200">
                <div className="flex items-center justify-between gap-4 mb-4">

                  <div>
                    <h2 className="font-semibold text-lg text-gray-900">
                      Your Address
                    </h2>

                    <p className="text-sm text-gray-500 mt-1">
                      {customer.address ||
                        "No address provided"}
                    </p>
                  </div>

                  {!editingAddress ? (
                    <button
                      type="button"
                      onClick={() =>
                        setShowAddressEditWarning(true)
                      }
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
                        setEditingAddress(false);

                        await refreshPricing(
                          pets,
                          customer
                        );
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

                <input
                  type="text"
                  value={customer.address}
                  readOnly={!editingAddress}
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

                    setCustomer(
                      (prev) => ({
                        ...prev,
                        address: newAddress,
                        suburb,
                        state,
                        postcode,
                      })
                    );
                  }}
                  className={`
                    ${inputStyle}
                    ${
                      !editingAddress
                        ? "bg-gray-100 cursor-not-allowed"
                        : "bg-white"
                    }
                  `}
                  style={{
                    color:
                      !editingAddress
                        ? "#6b7280"
                        : "#111827",
                  }}
                />
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
                        className="
                          border
                          border-gray-200
                          rounded-xl
                          p-4
                          bg-gray-50/30
                        "
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

                            {pet.name && (
                              <p className="text-xs text-gray-500 mt-1">
                                {pet.name}
                              </p>
                            )}
                          </div>

                          {editingPet !== index ? (
                            <button
                              type="button"
                              onClick={() => {
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
                                setEditingPet(null);

                                if (
                                  pricingChangedPets.includes(
                                    index
                                  )
                                ) {
                                  await refreshPricing(
                                    pets
                                  );

                                  setPricingChangedPets(
                                    (current) =>
                                      current.filter(
                                        (petIndex) =>
                                          petIndex !==
                                          index
                                      )
                                  );
                                }
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

                        {/* PET NAME */}

                        <FormField label="Pet Name">
                          <input
                            value={pet.name}
                            readOnly={
                              editingPet !== index
                            }
                            onChange={(e) =>
                              updatePet(
                                index,
                                {
                                  name:
                                    e.target.value,
                                }
                              )
                            }
                            className={`
                              ${inputStyle}
                              ${
                                editingPet !== index
                                  ? "bg-gray-100 cursor-not-allowed"
                                  : "bg-white"
                              }
                            `}
                            style={{
                              color:
                                editingPet !== index
                                  ? "#6b7280"
                                  : "#111827",
                            }}
                          />
                        </FormField>

                        {/* BREED */}

                        <div className="mt-4">
                          <FormField label="Breed">
                            <Select<
                              Option,
                              false
                            >
                              options={options}

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
                              }}

                              styles={selectStyles}

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
                          </FormField>
                        </div>

                        {/* DOB + SEX */}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">

                          <FormField label="Date of Birth">
                            <input
                              type="date"
                              value={pet.dob}
                              disabled={
                                editingPet !== index
                              }
                              onChange={(e) =>
                                updatePet(
                                  index,
                                  {
                                    dob:
                                      e.target.value,
                                  }
                                )
                              }
                              className={`
                                ${inputStyle}
                                ${
                                  editingPet !== index
                                    ? "bg-gray-100 cursor-not-allowed"
                                    : "bg-white cursor-pointer"
                                }
                              `}
                              style={{
                                color:
                                  editingPet !== index
                                    ? "#6b7280"
                                    : "#111827",
                              }}
                            />
                          </FormField>

                          <FormField label="Sex">
                            <select
                              value={
                                pet.gender || ""
                              }
                              disabled={
                                editingPet !== index
                              }
                              onChange={(e) =>
                                updatePet(
                                  index,
                                  {
                                    gender:
                                      e.target.value as
                                        | "male"
                                        | "female",
                                  }
                                )
                              }
                              className={`
                                ${inputStyle}
                                ${
                                  editingPet !== index
                                    ? "bg-gray-100 text-gray-600 cursor-not-allowed"
                                    : "bg-white text-gray-900 cursor-pointer"
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
            <span
              className="
                flex-shrink-0
                w-8
                h-8
                rounded-full
                bg-gray-100
                border
                border-gray-200
                flex
                items-center
                justify-center
                text-gray-500
                text-xs
              "
            >
              {openPetCover ? "▲" : "▼"}
            </span>
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
                      className="
                        px-5
                        py-5
                        border-b
                        border-gray-200
                        last:border-b-0
                      "
                    >

                      {/* COVER TOP ROW */}

                      <div className="flex items-start justify-between gap-4">

                        <div className="min-w-0">
                          <div className="text-base font-semibold text-gray-900">
                            {pet.name ||
                              `Pet ${
                                index + 1
                              }`}
                          </div>
                        </div>

                        {/* PRICE + EDIT */}

                        <div className="flex-shrink-0 flex items-center gap-3">

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

                          {/* COVER EDIT BUTTON */}

                          {editingCover !== index ? (
                            <button
                              type="button"
                              onClick={() => {
                                setCoverToEdit(index);
                                setShowCoverEditWarning(
                                  true
                                );
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
                              onClick={() => {
                                setEditingCover(null);
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
                                <label className="block text-[10px] uppercase tracking-wide text-gray-500 mb-1.5">
                                  Annual limit
                                </label>

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
                                    h-10
                                    px-3
                                    rounded-lg
                                    border
                                    border-gray-300
                                    text-sm
                                    font-semibold
                                    focus:outline-none
                                    focus:ring-2
                                    focus:ring-gray-800
                                    ${
                                      editingCover !==
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
                                <label className="block text-[10px] uppercase tracking-wide text-gray-500 mb-1.5">
                                  Benefit
                                </label>

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
                                            e.target
                                              .value
                                          ),
                                      }
                                    )
                                  }
                                  className={`
                                    w-full
                                    h-10
                                    px-3
                                    rounded-lg
                                    border
                                    border-gray-300
                                    text-sm
                                    font-semibold
                                    focus:outline-none
                                    focus:ring-2
                                    focus:ring-gray-800
                                    ${
                                      editingCover !==
                                      index
                                        ? "bg-gray-100 text-gray-600 cursor-not-allowed"
                                        : "bg-white text-gray-900 cursor-pointer"
                                    }
                                  `}
                                >
                                  {Array.from(
                                    {
                                      length: 7,
                                    },
                                    (_, i) => {
                                      const value =
                                        60 +
                                        i * 5;

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

                              {/* ANNUAL EXCESS */}

                              <div className="
                                rounded-lg
                                bg-gray-50
                                border
                                border-gray-200
                                px-3
                                py-3
                              ">
                                <label className="block text-[10px] uppercase tracking-wide text-gray-500 mb-1.5">
                                  Annual excess
                                </label>

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
                                            e.target
                                              .value
                                          ),
                                      }
                                    )
                                  }
                                  className={`
                                    w-full
                                    h-10
                                    px-3
                                    rounded-lg
                                    border
                                    border-gray-300
                                    text-sm
                                    font-semibold
                                    focus:outline-none
                                    focus:ring-2
                                    focus:ring-gray-800
                                    ${
                                      editingCover !==
                                      index
                                        ? "bg-gray-100 text-gray-600 cursor-not-allowed"
                                        : "bg-white text-gray-900 cursor-pointer"
                                    }
                                  `}
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

                              {/* PLAN */}

                              <div className="
                                rounded-lg
                                bg-gray-50
                                border
                                border-gray-200
                                px-3
                                py-3
                              ">
                                <label className="block text-[10px] uppercase tracking-wide text-gray-500 mb-1.5">
                                  Plan
                                </label>

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
                                    h-10
                                    px-3
                                    rounded-lg
                                    border
                                    border-gray-300
                                    text-sm
                                    font-semibold
                                    focus:outline-none
                                    focus:ring-2
                                    focus:ring-gray-800
                                    ${
                                      editingCover !==
                                      index
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
            bg-amber-50
            rounded-xl
            border
            border-amber-200
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
              pricing.total ===
                null
            }
            onClick={
              confirmPayment
            }
            className="
              flex-1
              h-12
              rounded-xl
              font-semibold
              text-sm
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
              setEditingAddress(
                true
              );

              setShowAddressEditWarning(
                false
              );
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
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section
      className="
        bg-white
        rounded-xl
        border
        border-gray-200
        p-5
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
  children: React.ReactNode;
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
  children: React.ReactNode;
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
  children: React.ReactNode;
}) {
  const isOpen =
    openTerms === id;

  return (
    <div className="p-4 sm:p-5 bg-amber-50">

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
          p-3
          rounded-xl
          transition
          hover:bg-amber-100
        "
      >

        <div className="min-w-0">

          <h3 className="font-semibold text-gray-900">
            {title}
          </h3>

          <p className="text-sm text-gray-500 mt-1">
            {description}
          </p>

        </div>

        <span
          className="
            flex-shrink-0
            w-7
            h-7
            rounded-full
            bg-white
            border
            border-gray-200
            flex
            items-center
            justify-center
            text-gray-500
            text-xs
          "
        >
          {isOpen
            ? "▲"
            : "▼"}
        </span>

      </button>

      {isOpen && (
        <div
          className="
            mt-3
            mx-3
            p-4
            bg-gray-50
            border
            border-gray-200
            rounded-xl
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
          px-3
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