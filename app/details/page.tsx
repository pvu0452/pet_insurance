"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import Select from "react-select";
interface Option {
  name: string;
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

export default function DetailsPage() {

  const router = useRouter();

  const [loadingBreeds, setLoadingBreeds] = useState(true);
  const [options, setOptions] = useState<Option[]>([]);
  const [mounted, setMounted] = useState(false);
  const steps = ["Quote", "Plans", "Details"];
  const currentStep = 2;

  const progress = (currentStep / (steps.length - 1)) * 100;

  const inputStyle = `
  w-full
  p-3
  rounded-lg
  border
  border-gray-300
  text-gray-900
  placeholder-gray-400
  focus:outline-none
  focus:ring-2
  focus:ring-gray-800
`;

  const [customer, setCustomer] = useState({
    name: "",
    mobile: "",
    email: "",
    address: "",
    suburb: "",
    state: "",
    postcode: "",
  });

  const [customerErrors, setCustomerErrors] = useState({
    name: "",
    mobile: "",
    email: "",
  });


  const [pets, setPets] = useState<Pet[]>([
    {
      name: "",
      petType: null,
      gender: null,
      breed: "",
      dob: "",
      tier: "",
    }
  ]);


  interface Cover {
    limit: number;
    benefit: number;
    excess: number;
    plans: string[];
  }

  const [cover, setCover] = useState<Cover | null>(null);

  const [pricing, setPricing] = useState<{
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

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [informationConfirmed, setInformationConfirmed] = useState(false);
  const [premiumConfirmed, setPremiumConfirmed] = useState(false);

  const [openTerms, setOpenTerms] = useState<string | null>(null);

  // Pet editing
  const [editingPet, setEditingPet] = useState<number | null>(null);

  // Track whether a pricing-related pet field was changed
  const [pricingChangedPets, setPricingChangedPets] = useState<number[]>([]);

  // Popup for warning before editing
  const [showEditWarning, setShowEditWarning] = useState(false);

  // Pet that the user wants to edit
  const [petToEdit, setPetToEdit] = useState<number | null>(null);

  // Address editing
  const [editingAddress, setEditingAddress] = useState(false);

  // Popup for warning before editing address
  const [showAddressEditWarning, setShowAddressEditWarning] = useState(false);

 function parseAddress(address: string) {
  let suburb = "";
  let state = "";
  let postcode = "";

  // Find postcode
  const postcodeMatch = address.match(/\b\d{4}\b/);

  if (postcodeMatch) {
    postcode = postcodeMatch[0];
  }

  // Find state
  const stateMatch = address.match(
    /\b(NSW|QLD|VIC|WA|SA|TAS|NT|ACT)\b/i
  );

  if (stateMatch) {
    state = stateMatch[1].toUpperCase();
  }

  // Find suburb
  // Example:
  // "123 queen street, Calamvale QLD 4116"
  //                    ^^^^^^^^^
  if (state && postcode) {
    const suburbMatch = address.match(
      new RegExp(
        `,\\s*(.*?)\\s+${state}\\s+${postcode}(?:,\\s*[^,]+)?\\s*$`,
        "i"
      )
    );

    if (suburbMatch) {
      suburb = suburbMatch[1].trim();
    }
  }

  return {
    suburb,
    state,
    postcode,
  };
}
  const updatePet = (
    index: number,
    changes: Partial<Pet>
  ) => {
    setPets((currentPets) =>
      currentPets.map((pet, i) =>
        i === index
          ? { ...pet, ...changes }
          : pet
      )
    );

    if (
      "tier" in changes ||
      "breed" in changes ||
      "dob" in changes ||
      "gender" in changes
    ) {
      setPricingChangedPets((current) =>
        current.includes(index)
          ? current
          : [...current, index]
      );
    }
  };


  useEffect(() => {
    setMounted(true);
    fetchOptions();

    const storedCover = sessionStorage.getItem("cover");
    const storedPet = sessionStorage.getItem("petDetails");

    console.log("COVER STORAGE:", storedCover);
    console.log("PET STORAGE:", storedPet);

    const coverData: Cover | null = storedCover
      ? JSON.parse(storedCover)
      : null;

    if (coverData) {
      setCover(coverData);
    }

    if (storedPet) {
      const petData = JSON.parse(storedPet);

      setPets(
        petData.pets.map((pet: Pet, index: number) => ({
          name: pet.name || "",
          petType: pet.petType || null,
          breed: pet.breed || "",
          dob: pet.dob || "",
          gender: pet.gender || null,

          tier:
            coverData?.plans?.[index] === "gold"
              ? "Gold"
              : coverData?.plans?.[index] === "upgraded"
                ? "Silver"
                : "",
        }))
      );

      const address = petData.address || "";
      const parsedAddress = parseAddress(address);
      const googleAddress = petData.addressDetails || {};

      setCustomer((prev) => ({
        ...prev,
        address,
        suburb: googleAddress.suburb || parsedAddress.suburb,
        state: googleAddress.state || parsedAddress.state,
        postcode: googleAddress.postcode || parsedAddress.postcode,
      }));
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;

    if (pets.length > 0 && cover) {
      refreshPricing(pets);
    }
  }, [mounted, cover]);

  const selectStyles = {
    control: (base: any, state: any) => ({
      ...base,
      minHeight: "46px",
      borderRadius: "10px",
      border: "1px solid #ddd",
      boxShadow: "none",
      backgroundColor: state.isDisabled ? "#f3f4f6" : "#fff",
      "&:hover": {
        borderColor: "#ddd",
      },
      cursor: state.isDisabled ? "not-allowed" : "default",
    }),

    singleValue: (base: any, state: any) => ({
      ...base,
      color: state.isDisabled ? "#6b7280" : "#111",
    }),

    input: (base: any) => ({
      ...base,
      color: "#111",
    }),

    placeholder: (base: any, state: any) => ({
      ...base,
      color: state.isDisabled ? "#9ca3af" : "#666",
    }),

    menu: (base: any) => ({
      ...base,
      backgroundColor: "#fff",
    }),

    option: (base: any, state: any) => ({
      ...base,
      color: "#111",
      backgroundColor: state.isFocused
        ? "#f3f3f3"
        : "#fff",
      cursor: "pointer",
    }),
  };

  const fetchOptions = async () => {
    try {
      setLoadingBreeds(true);

      const response = await fetch(
        "https://api4pet-dev-msac6e2qpq-ts.a.run.app/api/v1/category/pet-breed"
      );

      if (!response.ok) {
        throw new Error("Failed to fetch options");
      }

      const data = await response.json();

      const options = data.data
        .map((item: any) => ({
          value: item.breed_name,
          label: `${item.breed_name} (${item.pet_type})`,
          petType: item.pet_type,
          petBreed: item.breed_name,
        }))
        .sort((a: Option, b: Option) =>
          a.petBreed.localeCompare(b.petBreed)
        );

      setOptions(options);
      console.log("BREED OPTIONS:", options);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingBreeds(false);
    }
  };

  async function refreshPricing(
    updatedPets: Pet[],
    updatedCustomer = customer
  ) {
    try {
      setPricingLoading(true);

      if (!cover) {
        console.error("No cover information found.");
        setPricingLoading(false);
        return;
      }

      if (!cover.limit || !cover.benefit || !cover.excess) {
        console.error("Incomplete cover information:", cover);
        setPricingLoading(false);
        return;
      }

      const today = new Intl.DateTimeFormat(
        "en-CA",
        {
          timeZone: "Australia/Brisbane",
        }
      ).format(new Date());

      const storedPet =
        sessionStorage.getItem("petDetails");

      if (!storedPet) {
        throw new Error("Pet details not found");
      }

      const petData = JSON.parse(storedPet);

      console.log("PRICING ADDRESS:", {
        address: updatedCustomer.address,
        suburb: updatedCustomer.suburb,
        state: updatedCustomer.state,
        postcode: updatedCustomer.postcode,
      });

      const basePayload = {
        payment_frequency: "monthly",

        customer: {
          suburb: updatedCustomer.suburb,
          state: updatedCustomer.state,
          postcode: updatedCustomer.postcode,
          email: updatedCustomer.email || "pet@wiseandsilent.com",
        },

        pets: updatedPets.map((pet, index) => ({
          pet_no: String(index),

          pet_name: pet.name,

          pet_type:
            pet.petType === "dog"
              ? "Dog"
              : pet.petType === "cat"
                ? "Cat"
                : "",

          pet_sex:
            pet.gender === "male"
              ? "Male"
              : pet.gender === "female"
                ? "Female"
                : "",

          pet_breed: pet.breed,

          pet_dob: pet.dob,

          policy_start_date: today,
        })),
      };

      // SILVER
      const silverResponse = await fetch(
        "/api/quote",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            ...basePayload,

            upgraded: {
              annual_limit: cover!.limit,
              benefit_percentage: cover!.benefit,
              annual_excess: cover!.excess,
            },
          }),
        }
      );

      const silverData =
        await silverResponse.json();

      // GOLD
      const goldResponse = await fetch(
        "/api/quote",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            ...basePayload,

            gold: {
              annual_limit: cover!.limit,
              benefit_percentage: cover!.benefit,
              annual_excess: cover!.excess,
            },
          }),
        }
      );

      const goldData =
        await goldResponse.json();

      console.log(
        "UPDATED SILVER:",
        silverData
      );

      console.log(
        "UPDATED GOLD:",
        goldData
      );

      // SILVER TOTAL
      const silverPets =
        silverData?.upgraded?.data?.quote?.pets || [];

      const silverTotal =
        silverPets.reduce(
          (total: number, pet: any) =>
            total +
            Number(
              pet?.premiums?.installment ?? 0
            ),
          0
        );

      // GOLD TOTAL
      const goldPets =
        goldData?.gold?.data?.quote?.pets || [];

      const goldTotal =
        goldPets.reduce(
          (total: number, pet: any) =>
            total +
            Number(
              pet?.premiums?.installment ?? 0
            ),
          0
        );

      // BUILD PRICING BREAKDOWN
      const pricingPets: {
        name: string;
        tier: "Silver" | "Gold";
        price: number;
      }[] = updatedPets.map((pet, index) => {

        const selectedTier: "Silver" | "Gold" =
          pet.tier === "Gold" ? "Gold" : "Silver";

        const price =
          selectedTier === "Gold"
            ? Number(
              goldPets[index]?.premiums?.installment ?? 0
            )
            : Number(
              silverPets[index]?.premiums?.installment ?? 0
            );

        return {
          name: pet.name || `Pet ${index + 1}`,
          tier: selectedTier,
          price: Number(price.toFixed(2)),
        };
      });

      const total = pricingPets.reduce(
        (sum, pet) => sum + pet.price,
        0
      );

      setPricing({
        pets: pricingPets,
        total: Number(total.toFixed(2)),
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
  function validateCustomerDetails() {
    const errors = {
      name: "",
      mobile: "",
      email: "",
    };

    // Full Name
    if (!customer.name.trim()) {
      errors.name = "Please enter your full name.";
    }

    // Mobile Number
    const cleanedMobile = customer.mobile.replace(/\D/g, "");

    if (!cleanedMobile) {
      errors.mobile = "Please enter your mobile number.";
    } else if (cleanedMobile.length !== 10) {
      errors.mobile = "Mobile number must be 10 digits.";
    }

    // Email
    const email = customer.email.trim();

    if (!email) {
      errors.email = "Please enter your email address.";
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      errors.email = "Please enter a valid email address.";
    }

    setCustomerErrors(errors);

    // Scroll to first error
    if (errors.name) {
      document
        .getElementById("customer-name")
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



  async function confirmPayment() {

    // Validate customer details first
    if (!validateCustomerDetails()) {
      return;
    }

    if (
      !termsAccepted ||
      !privacyAccepted ||
      !informationConfirmed ||
      !premiumConfirmed
    ) {
      alert("Please read and accept all required acknowledgements.");
      return;
    }

    const checkoutData = {
      customer,
      pets,
      cover,
    };

    sessionStorage.setItem(
      "checkout",
      JSON.stringify(checkoutData)
    );

    try {
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          unit_amount: Math.round((pricing.total ?? 0) * 100),
          productName: "Pet Insurance Quote",
          customer_email: customer.email,
        }),
      });

      const responseText = await res.text();

      if (!res.ok) {
        throw new Error(
          `Stripe checkout failed: ${res.status} ${responseText}`
        );
      }

      const data = JSON.parse(responseText);

      if (!data.url) {
        throw new Error("Stripe did not return a checkout URL");
      }

      window.location.href = data.url;

    } catch (error) {
      console.error("Checkout error:", error);
    }
  }


  if (!mounted) return null;

  return (

    <div className="
min-h-screen
text-gray-900
">


      <div className="max-w-2xl mx-auto px-4 py-6">


        <img
          src="/was-logo.min.webp"
          className="w-28 opacity-70 mb-4 mx-auto"
        />



        {/* Progress */}

        <div className="mb-8">

          <div className="flex justify-between text-xs text-gray-500 mb-2">

            {
              steps.map(step => (
                <span key={step}>{step}</span>
              ))
            }

          </div>


          <div className="h-2 bg-gray-200 rounded-full">

            <div
              className="h-2 bg-gray-800 rounded-full"
              style={{
                width: `${progress}%`
              }}
            />

          </div>

        </div>





        {/* CUSTOMER */}

        <Section title="Your Details">

          <div className="space-y-4">

            <FormField label="Full Name">

              <input
                id="customer-name"
                value={customer.name}
                onChange={(e) =>
                  setCustomer({
                    ...customer,
                    name: e.target.value
                  })
                }
                className={`${inputStyle} ${customerErrors.name
                  ? "border-red-500 focus:ring-red-500"
                  : ""
                  }`}
              />

              {customerErrors.name && (
                <p className="text-sm text-red-600 mt-1">
                  {customerErrors.name}
                </p>
              )}

            </FormField>


            <FormField label="Mobile Number">

              <input
                id="customer-mobile"
                value={customer.mobile}
                onChange={(e) =>
                  setCustomer({
                    ...customer,
                    mobile: e.target.value
                  })
                }
                className={`${inputStyle} ${customerErrors.mobile
                  ? "border-red-500 focus:ring-red-500"
                  : ""
                  }`}
              />

              {customerErrors.mobile && (
                <p className="text-sm text-red-600 mt-1">
                  {customerErrors.mobile}
                </p>
              )}

            </FormField>


            <FormField label="Email">

              <input
                id="customer-email"
                value={customer.email}
                onChange={(e) =>
                  setCustomer({
                    ...customer,
                    email: e.target.value
                  })
                }
                className={`${inputStyle} ${customerErrors.email
                  ? "border-red-500 focus:ring-red-500"
                  : ""
                  }`}
              />

              {customerErrors.email && (
                <p className="text-sm text-red-600 mt-1">
                  {customerErrors.email}
                </p>
              )}

            </FormField>

          </div>

        </Section>


        {/* ADDRESS */}

        <Section
          title="Your Address"
          action={
            !editingAddress ? (

              <button
                type="button"
                onClick={() => setShowAddressEditWarning(true)}
                className="
          text-sm
          px-3
          py-1.5
          rounded-lg
          border
          border-gray-300
          text-gray-700
          hover:bg-gray-50
        "
              >
                🔒 Edit
              </button>

            ) : (

              <button
                type="button"
                onClick={async () => {
                  setEditingAddress(false);

                  await refreshPricing(pets, customer);
                }}
                className="
                text-sm
                px-3
                py-1.5
                rounded-lg
                bg-gray-800
                text-white
              "
              >
                🔓 Done
              </button>

            )
          }
        >

          <input
            type="text"
            value={customer.address}
            readOnly={!editingAddress}
            onChange={(e) => {
              const newAddress = e.target.value;

              const {
                suburb,
                state,
                postcode,
              } = parseAddress(newAddress);

              setCustomer(prev => ({
                ...prev,
                address: newAddress,
                suburb,
                state,
                postcode,
              }));
            }}
            className={`
      ${inputStyle}
      ${!editingAddress
                ? "bg-gray-100 cursor-not-allowed"
                : "bg-white text-gray-900"
              }
    `}
            style={{
              color: !editingAddress
                ? "#6b7280"
                : "#111827"
            }}
          />

        </Section>

        {/* PETS */}

        <Section title="Your Pets">

          <div className="space-y-6">

            {pets.map((pet, index) => (

              <div
                key={index}
                className="border border-gray-200 rounded-xl p-4"
              >

                {/* Pet heading */}

                <div className="flex items-center justify-between mb-4">

                  <div className="flex items-center gap-2">

                    <h3 className="font-semibold text-gray-900">
                      Pet {index + 1}
                    </h3>

                    <span className="text-gray-400">|</span>

                    <span className="text-sm font-medium text-gray-500">
                      {pet.petType
                        ? pet.petType.charAt(0).toUpperCase() + pet.petType.slice(1)
                        : "Select breed"}
                    </span>

                  </div>


                  {editingPet !== index ? (

                    <button
                      type="button"
                      onClick={() => {
                        setPetToEdit(index);
                        setShowEditWarning(true);
                      }}
                      className="
                text-sm
                px-3
                py-1.5
                rounded-lg
                border
                border-gray-300
                text-gray-700
                hover:bg-gray-50
              "
                    >
                      🔒 Edit
                    </button>

                  ) : (

                    <button
                      type="button"
                      onClick={async () => {
                        setEditingPet(null);

                        if (pricingChangedPets.includes(index)) {
                          await refreshPricing(pets);

                          setPricingChangedPets((current) =>
                            current.filter((petIndex) => petIndex !== index)
                          );
                        }
                      }}
                      className="
                      text-sm
                      px-3
                      py-1.5
                      rounded-lg
                      bg-gray-800
                      text-white
                    "
                    >
                      Done
                    </button>

                  )}

                </div>


                {/* PET NAME + TIER */}

                <div className="grid grid-cols-2 gap-4">

                  {/* PET NAME */}

                  <FormField label="Pet Name">

                    <input
                      value={pet.name}
                      readOnly={editingPet !== index}
                      onChange={(e) =>
                        updatePet(index, {
                          name: e.target.value,
                        })
                      }
                      className={`
        ${inputStyle}
        ${editingPet !== index
                          ? "bg-gray-100 cursor-not-allowed"
                          : "bg-white text-gray-900"
                        }
      `}
                      style={{
                        color:
                          editingPet !== index
                            ? "#6b7280"
                            : "#111827"
                      }}
                    />

                  </FormField>


                  {/* TIER */}

                  <FormField label="Tier">

                    <select
                      value={pet.tier}
                      disabled={editingPet !== index}
                      onChange={(e) =>
                        updatePet(index, {
                          tier: e.target.value as "Silver" | "Gold",
                        })
                      }
                      className={`
                          ${inputStyle}
                          ${editingPet !== index
                          ? "bg-gray-100 cursor-not-allowed text-gray-600"
                          : "bg-white text-gray-900 cursor-pointer"
                        }
                     `}
                    >

                      <option value="Silver">Silver</option>
                      <option value="Gold">Gold</option>

                    </select>

                  </FormField>

                </div>


                {/* BREED */}

                <div className="mt-4">

                  <FormField label="Breed">

                    <Select<Option, false>
                      options={options}

                      value={
                        options.find(
                          (option) =>
                            option.value === pet.breed
                        ) || null
                      }

                      onChange={(selected) => {

                        if (!selected) {

                          updatePet(index, {
                            breed: "",
                            petType: null,
                          });

                          return;
                        }

                        updatePet(index, {
                          breed: selected.value,
                          petType:
                            selected.petType.toLowerCase() as
                            | "cat"
                            | "dog",
                        });

                      }}

                      styles={selectStyles}

                      isDisabled={editingPet !== index}

                      isLoading={loadingBreeds}

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

                <div className="grid grid-cols-2 gap-4 mt-4">

                  <FormField label="Date of Birth">

                    <input
                      type="date"
                      value={pet.dob}
                      disabled={editingPet !== index}
                      onChange={(e) =>
                        updatePet(index, {
                          dob: e.target.value,
                        })
                      }
                      className={`
                          ${inputStyle}
                          ${editingPet !== index
                          ? "bg-gray-100 cursor-not-allowed"
                          : "bg-white cursor-pointer"
                        }
                      `}
                      style={{
                        color:
                          editingPet !== index
                            ? "#6b7280"
                            : "#111827"
                      }}
                    />

                  </FormField>


                  <FormField label="Sex">

                    <select
                      value={pet.gender || ""}
                      disabled={editingPet !== index}
                      onChange={(e) =>
                        updatePet(index, {
                          gender: e.target.value as "male" | "female",
                        })
                      }
                      className={`
                          ${inputStyle}
                          ${editingPet !== index
                          ? "bg-gray-100 text-gray-600"
                          : "bg-white text-gray-900 cursor-pointer"
                        }
                    `}
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>

                  </FormField>

                </div>

              </div>

            ))}

          </div>

        </Section>


        {/* PRICING */}

        <div className="
          bg-white
          border
          border-gray-200
          rounded-2xl
          overflow-hidden
          shadow-sm
          mt-6
        ">

          {/* HEADER */}

          <div className="
            px-5
            py-4
            bg-gray-50
            border-b
            border-gray-200
          ">

            <h2 className="
              text-lg
              font-semibold
              text-gray-900
            ">
              Your Pricing
            </h2>

            <p className="
              text-sm
              text-gray-500
              mt-1
            ">
              Your monthly premium based on your selected plans.
            </p>

            {cover && (
              <div className="mt-3 text-sm text-gray-600">

                <p>
                  Annual Limit:{" "}
                  <span className="font-semibold text-gray-900">
                    ${cover.limit.toLocaleString()}
                  </span>
                </p>

                <p>
                  Benefit:{" "}
                  <span className="font-semibold text-gray-900">
                    {cover.benefit}%
                  </span>
                </p>

                <p>
                  Excess:{" "}
                  <span className="font-semibold text-gray-900">
                    ${cover.excess.toLocaleString()}
                  </span>
                </p>

              </div>
            )}

          </div>


          {/* TABLE */}

          <div className="overflow-x-auto">

            <table className="w-full text-sm table-fixed">

              <thead>
                <tr className="
                  border-b
                  border-gray-200
                  bg-white
                ">

                  <th className="
                    w-[40%]
                    px-5
                    py-3
                    text-left
                    font-semibold
                    text-gray-500
                  ">
                    Pet
                  </th>

                  <th className="
                    w-[25%]
                    px-5
                    py-3
                    text-left
                    font-semibold
                    text-gray-500
                  ">
                    Tier
                  </th>

                  <th className="
                    w-[35%]
                    px-5
                    py-3
                    text-right
                    font-semibold
                    text-gray-500
                  ">
                    Monthly Premium
                  </th>

                </tr>
              </thead>


              <tbody>

                {pricingLoading ? (

                  <tr>

                    <td
                      colSpan={3}
                      className="
                        px-5
                        py-6
                        text-center
                        text-gray-500
                      "
                    >
                      Calculating pricing...
                    </td>

                  </tr>

                ) : pricing.pets.length > 0 ? (

                  pricing.pets.map((pet, index) => (

                    <tr
                      key={index}
                      className="border-b border-gray-100"
                    >

                      <td className="
                        px-5
                        py-4
                        font-medium
                        text-gray-900
                      ">
                        {pet.name || `Pet ${index + 1}`}
                      </td>

                      <td className="
                        px-5
                        py-4
                        text-left
                      ">
                        <span className={`
                          inline-flex
                          px-2.5
                          py-1
                          rounded-full
                          text-xs
                          font-semibold
                          ${pet.tier === "Gold"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-gray-100 text-gray-700"
                          }
                `}>
                          {pet.tier}
                        </span>
                      </td>

                      <td className="
                        px-5
                        py-4
                        text-right
                        font-semibold
                        text-gray-900
                      ">
                        ${pet.price.toFixed(2)}
                      </td>

                    </tr>

                  ))

                ) : (

                  <tr>

                    <td
                      colSpan={3}
                      className="
                        px-5
                        py-6
                        text-center
                        text-gray-500
                      "
                    >
                      No pricing available.
                    </td>

                  </tr>

                )}

              </tbody>


              {/* TOTAL */}

              <tfoot>
                <tr className="bg-gray-50">

                  <td
                    colSpan={2}
                    className="
                      px-5
                      py-5
                      font-bold
                      text-gray-900
                    "
                  >
                    Total
                  </td>

                  <td className="
                    px-5
                    py-5
                    text-right
                  ">

                    <div className="
                      text-xl
                      font-extrabold
                      text-gray-900
                    ">
                      {pricing.total !== null
                        ? `$${pricing.total.toFixed(2)}`
                        : "$--"
                      }
                    </div>

                    <div className="
                      text-xs
                      text-gray-500
                      mt-0.5
                    ">
                      per month
                    </div>

                  </td>

                </tr>
              </tfoot>

            </table>

          </div>

        </div>
        {/* ACKNOWLEDGEMENTS */}

        <div className="
          mt-6
          rounded-2xl
          border
          border-amber-200
          bg-amber-50
          overflow-hidden
          shadow-sm
        ">

          <div className="
            px-6
            py-5
            bg-amber-100
            border-b
            border-amber-200
          ">
            <h2 className="
              text-lg
              font-semibold
              text-gray-900
            ">
              Before you continue
            </h2>

            <p className="
              text-sm
              text-amber-900
              mt-1
            ">
              Please review and acknowledge the information below before purchasing.
            </p>
          </div>


          <div className="divide-y divide-gray-200">


            {/* TERMS */}

            <div className="p-5">

              <button
                type="button"
                onClick={() =>
                  setOpenTerms(
                    openTerms === "terms"
                      ? null
                      : "terms"
                  )
                }
                className={`
                    w-full
                    flex
                    items-center
                    justify-between
                    text-left
                    p-3
                    rounded-xl
                    transition
                    ${openTerms === "terms"
                    ? "bg-amber-100"
                    : "hover:bg-amber-100"
                  }
        `}
              >

                <div>

                  <h3 className="
            font-semibold
            text-gray-900
          ">
                    Policy Terms & Conditions
                  </h3>

                  <p className="
            text-sm
            text-gray-500
            mt-1
          ">
                    Click to read the important policy information.
                  </p>

                </div>

                <span className="text-gray-500 text-lg">
                  {openTerms === "terms" ? "▲" : "▼"}
                </span>

              </button>


              {openTerms === "terms" && (

                <div className="
          mt-4
          p-4
          bg-gray-50
          border
          border-gray-200
          rounded-xl
          text-sm
          text-gray-700
          leading-6
        ">

                  <p className="font-semibold text-gray-900 mb-2">
                    Policy Terms & Conditions
                  </p>

                  <p className="mb-3">
                    Please review the full policy documentation before
                    purchasing insurance. Your policy is subject to the
                    terms, conditions, exclusions, limits and waiting
                    periods described in the applicable policy documents.
                  </p>

                  <p className="mb-3">
                    Cover is subject to eligibility requirements and the
                    information provided during the quotation and
                    application process.
                  </p>

                  <p>
                    Please ensure you understand the cover selected,
                    including the annual limit, benefit percentage,
                    excess, exclusions and applicable waiting periods.
                  </p>

                </div>

              )}


              <label className="
        flex
        items-center
        gap-3
        mt-4
        cursor-pointer
      ">

                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) =>
                    setTermsAccepted(e.target.checked)
                  }
                  className="
            w-5
            h-5
            accent-gray-800
            flex-shrink-0
          "
                />

                <span className="
          text-sm
          text-gray-700
        ">
                  I have read and agree to the Policy Terms & Conditions.
                </span>

              </label>

            </div>


            {/* PRIVACY */}

            <div className="p-5">

              <button
                type="button"
                onClick={() =>
                  setOpenTerms(
                    openTerms === "privacy"
                      ? null
                      : "privacy"
                  )
                }
                className={`
          w-full
          flex
          items-center
          justify-between
          text-left
          p-3
          rounded-xl
          transition
          ${openTerms === "privacy"
                    ? "bg-amber-100"
                    : "hover:bg-amber-100"
                  }
        `}
              >

                <div>

                  <h3 className="
            font-semibold
            text-gray-900
          ">
                    Privacy Policy
                  </h3>

                  <p className="
            text-sm
            text-gray-500
            mt-1
          ">
                    Click to read how your information is handled.
                  </p>

                </div>

                <span className="text-gray-500 text-lg">
                  {openTerms === "privacy" ? "▲" : "▼"}
                </span>

              </button>


              {openTerms === "privacy" && (

                <div className="
          mt-4
          p-4
          bg-gray-50
          border
          border-gray-200
          rounded-xl
          text-sm
          text-gray-700
          leading-6
        ">

                  <p className="
            font-semibold
            text-gray-900
            mb-2
          ">
                    Privacy Policy
                  </p>

                  <p className="mb-3">
                    Your personal information may be collected and used
                    to provide, administer and manage your insurance
                    application and policy.
                  </p>

                  <p>
                    Your information may also be used where required to
                    comply with legal and regulatory obligations.
                  </p>

                </div>

              )}


              <label className="
        flex
        items-center
        gap-3
        mt-4
        cursor-pointer
      ">

                <input
                  type="checkbox"
                  checked={privacyAccepted}
                  onChange={(e) =>
                    setPrivacyAccepted(e.target.checked)
                  }
                  className="
            w-5
            h-5
            accent-gray-800
          "
                />

                <span className="text-sm text-gray-700">
                  I acknowledge that I have read the Privacy Policy.
                </span>

              </label>

            </div>



            {/* INFORMATION */}

            <div className="p-5">

              <button
                type="button"
                onClick={() =>
                  setOpenTerms(
                    openTerms === "information"
                      ? null
                      : "information"
                  )
                }
                className={`
        w-full
        flex
        items-center
        justify-between
        text-left
        p-3
        rounded-xl
        transition
        ${openTerms === "information"
                    ? "bg-amber-100"
                    : "hover:bg-amber-100"
                  }
      `}
              >

                <div>

                  <h3 className="
          font-semibold
          text-gray-900
        ">
                    Information Confirmation
                  </h3>

                  <p className="
          text-sm
          text-gray-500
          mt-1
        ">
                    Confirm that your application details are correct.
                  </p>

                </div>

                <span className="text-gray-500 text-lg">
                  {openTerms === "information" ? "▲" : "▼"}
                </span>

              </button>


              {openTerms === "information" && (

                <div className="
        mt-4
        p-4
        bg-gray-50
        border
        border-gray-200
        rounded-xl
        text-sm
        text-gray-700
        leading-6
      ">

                  <p className="
          font-semibold
          text-gray-900
          mb-2
        ">
                    Your Information
                  </p>

                  <p>
                    Please check that your name, contact details,
                    address and pet information are accurate. Incorrect
                    information may affect your eligibility, premium
                    or ability to make a claim.
                  </p>

                </div>

              )}


              <label className="
      flex
      items-center
      gap-3
      mt-4
      cursor-pointer
    ">

                <input
                  type="checkbox"
                  checked={informationConfirmed}
                  onChange={(e) =>
                    setInformationConfirmed(e.target.checked)
                  }
                  className="
          w-5
          h-5
          accent-gray-800
        "
                />

                <span className="text-sm text-gray-700">
                  I confirm that the information I have provided is
                  accurate and complete.
                </span>

              </label>

            </div>


            {/* PREMIUM */}
            <div className="p-5">

              <button
                type="button"
                onClick={() =>
                  setOpenTerms(
                    openTerms === "premium"
                      ? null
                      : "premium"
                  )
                }
                className={`
        w-full
        flex
        items-center
        justify-between
        text-left
        p-3
        rounded-xl
        transition
        ${openTerms === "premium"
                    ? "bg-amber-100"
                    : "hover:bg-amber-100"
                  }
      `}
              >

                <div>

                  <h3 className="
          font-semibold
          text-gray-900
        ">
                    Premium & Payment
                  </h3>

                  <p className="
          text-sm
          text-gray-500
          mt-1
        ">
                    Review your premium and payment frequency.
                  </p>

                </div>

                <span className="text-gray-500 text-lg">
                  {openTerms === "premium" ? "▲" : "▼"}
                </span>

              </button>


              {openTerms === "premium" && (

                <div className="
        mt-4
        p-4
        bg-gray-50
        border
        border-gray-200
        rounded-xl
        text-sm
        text-gray-700
        leading-6
      ">

                  <p className="
          font-semibold
          text-gray-900
          mb-2
        ">
                    Premium & Payment
                  </p>

                  <p>
                    Your displayed premium is the amount calculated
                    based on the information and cover selected above.
                    Payment frequency is monthly unless otherwise
                    specified.
                  </p>

                </div>

              )}


              <label className="
      flex
      items-center
      gap-3
      mt-4
      cursor-pointer
    ">

                <input
                  type="checkbox"
                  checked={premiumConfirmed}
                  onChange={(e) =>
                    setPremiumConfirmed(e.target.checked)
                  }
                  className="
          w-5
          h-5
          accent-gray-800
        "
                />

                <span className="text-sm text-gray-700">
                  I understand the premium shown above and that
                  payment will be processed monthly.
                </span>

              </label>

            </div>
          </div>
        </div>

        {/* BACK / CONFIRM BUTTONS */}
        <div className="mt-6 flex gap-3">

          {/* BACK */}
          <button
            type="button"
            onClick={() => router.push("/plans")}
            className="
      w-1/3
      bg-white
      border
      border-gray-300
      hover:bg-gray-50
      text-gray-800
      py-3
      rounded-xl
      font-semibold
      transition
    "
          >
            Back
          </button>

          {/* CONFIRM AND PAY */}
          <button
            type="button"
            disabled={
              !termsAccepted ||
              !privacyAccepted ||
              !informationConfirmed ||
              !premiumConfirmed ||
              pricingLoading ||
              pricing.total === null
            }
            onClick={confirmPayment}
            className="
      flex-1
      py-3
      rounded-xl
      font-semibold
      transition
      bg-amber-400
      hover:bg-amber-500
      text-gray-900
      disabled:bg-gray-200
      disabled:text-gray-400
      disabled:cursor-not-allowed
    "
          >
            Confirm and Pay
          </button>

        </div>

        {showEditWarning && (

          <div className="
    fixed
    inset-0
    z-50
    flex
    items-center
    justify-center
    bg-black/40
    px-4
  ">

            <div className="
      w-full
      max-w-md
      bg-white
      rounded-2xl
      shadow-2xl
      p-6
    ">

              <div className="flex items-center gap-3 mb-4">

                <div className="
          w-10
          h-10
          rounded-full
          bg-gray-100
          flex
          items-center
          justify-center
          text-lg
        ">
                  ⚠️
                </div>

                <h2 className="
          text-lg
          font-semibold
          text-gray-900
        ">
                  Change pet details?
                </h2>

              </div>


              <p className="
        text-sm
        text-gray-600
        leading-6
      ">
                Changing your pet's details may affect your
                insurance quote and pricing.
              </p>


              <p className="
        text-sm
        text-gray-600
        leading-6
        mt-2
      ">
                Your current quote is based on the details
                entered earlier.
              </p>


              <div className="
        flex
        gap-3
        mt-6
      ">

                <button
                  type="button"
                  onClick={() => {
                    setShowEditWarning(false);
                    setPetToEdit(null);
                  }}
                  className="
            flex-1
            py-2.5
            rounded-xl
            border
            border-gray-300
            text-gray-700
            font-medium
            hover:bg-gray-50
          "
                >
                  Cancel
                </button>


                <button
                  type="button"
                  onClick={() => {

                    if (petToEdit !== null) {
                      setEditingPet(petToEdit);
                    }

                    setShowEditWarning(false);
                    setPetToEdit(null);

                  }}
                  className="
            flex-1
            py-2.5
            rounded-xl
            bg-gray-800
            text-white
            font-medium
            hover:bg-gray-700
          "
                >
                  Continue
                </button>

              </div>

            </div>

          </div>

        )}
        {showAddressEditWarning && (

          <div className="
    fixed
    inset-0
    z-50
    flex
    items-center
    justify-center
    bg-black/40
    px-4
  ">

            <div className="
      w-full
      max-w-md
      bg-white
      rounded-2xl
      shadow-2xl
      p-6
    ">

              <div className="flex items-center gap-3 mb-4">

                <div className="
          w-10
          h-10
          rounded-full
          bg-gray-100
          flex
          items-center
          justify-center
          text-lg
        ">
                  ⚠️
                </div>

                <h2 className="
          text-lg
          font-semibold
          text-gray-900
        ">
                  Change your address?
                </h2>

              </div>


              <p className="
        text-sm
        text-gray-600
        leading-6
      ">
                Changing your address may affect your
                insurance quote and pricing.
              </p>


              <p className="
        text-sm
        text-gray-600
        leading-6
        mt-2
      ">
                Your current quote is based on the
                address entered earlier.
              </p>


              <div className="
        flex
        gap-3
        mt-6
      ">

                <button
                  type="button"
                  onClick={() => {
                    setShowAddressEditWarning(false);
                  }}
                  className="
            flex-1
            py-2.5
            rounded-xl
            border
            border-gray-300
            text-gray-700
            font-medium
            hover:bg-gray-50
          "
                >
                  Cancel
                </button>


                <button
                  type="button"
                  onClick={() => {
                    setEditingAddress(true);
                    setShowAddressEditWarning(false);
                  }}
                  className="
            flex-1
            py-2.5
            rounded-xl
            bg-gray-800
            text-white
            font-medium
            hover:bg-gray-700
          "
                >
                  Continue
                </button>

              </div>

            </div>

          </div>

        )}


      </div>

    </div>

  );

}

function Section({
  title,
  children,
  action
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="
      bg-white
      rounded-xl
      border
      border-gray-200
      p-5
      mb-5
    ">

      <div className="flex items-center justify-between mb-4">

        <h2 className="
          font-semibold
          text-lg
          text-gray-900
        ">
          {title}
        </h2>

        {action}

      </div>

      {children}

    </div>
  );
}

function FormField({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}) {

  return (
    <div>

      <label className="
block
text-sm
font-semibold
text-gray-900
mb-2
">
        {label}
      </label>

      {children}

    </div>
  );

}