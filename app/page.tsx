"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Select, { components } from "react-select";
import { DayPicker } from "@daypicker/react";
import "@daypicker/react/style.css";
import { importLibrary, setOptions as setGoogleMapsOptions, } from "@googlemaps/js-api-loader";

let googleMapsConfigured = false;

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
}

export default function Home() {
  const router = useRouter();

  const [options, setOptions] = useState<Option[]>([]);
  const [mounted, setMounted] = useState(false);
  const [loadingBreeds, setLoadingBreeds] = useState(true);

  const [openDatePicker, setOpenDatePicker] =
  useState<number | null>(null);

  const [openBreedDropdown, setOpenBreedDropdown] =
  useState<number | null>(null);

  const [dobInputs, setDobInputs] =
  useState<Record<number, string>>({});

  const handleLogoClick = () => {
    sessionStorage.removeItem("petDetails");
    sessionStorage.removeItem("cover");

    // Reset the page back to the initial state
    setPets([
      {
        name: "",
        petType: null,
        gender: null,
        breed: "",
        dob: "",
      },
    ]);

    setErrors([
      {
        name: false,
        petType: false,
        gender: false,
        breed: false,
        dob: "",
      },
    ]);

    setAddress("");
    setAddressDetails({
      suburb: "",
      state: "",
      postcode: "",
    });

    setAddressError("");

    if (autocompleteRef.current) {
      autocompleteRef.current.value = "";
    }
  };

  // -----------------------------
  // PETS
  // -----------------------------
  const [pets, setPets] = useState<Pet[]>([
    {
      name: "",
      petType: null,
      gender: null,
      breed: "",
      dob: "",
    },
  ]);

  // -----------------------------
  // ADDRESS
  // -----------------------------
  const [address, setAddress] = useState("");
  const [addressDetails, setAddressDetails] = useState({
    suburb: "",
    state: "",
    postcode: "",
  });

  const [googleMapsFailed, setGoogleMapsFailed] = useState(false);

  const addressContainerRef = useRef<HTMLDivElement>(null);
  const autocompleteRef = useRef<any>(null);
  const petRefs = useRef<(HTMLDivElement | null)[]>([]);

  // -----------------------------
  // ERRORS
  // -----------------------------
  const [errors, setErrors] = useState<
    {
      name: boolean;
      petType: boolean;
      gender: boolean;
      breed: boolean;
      dob: string;
    }[]
  >([
    {
      name: false,
      petType: false,
      gender: false,
      breed: false,
      dob: "",
    },
  ]);

  const [addressError, setAddressError] = useState("");

  // -----------------------------
  // ADD ANOTHER PET
  // -----------------------------
  const addPet = () => {
    setPets((currentPets) => [
      ...currentPets,
      {
        name: "",
        petType: null,
        gender: null,
        breed: "",
        dob: "",
      },
    ]);

    setErrors((currentErrors) => [
      ...currentErrors,
      {
        name: false,
        petType: false,
        gender: false,
        breed: false,
        dob: "",
      },
    ]);
  };

  // -----------------------------
  // REMOVE ANOTHER PET IF ADDED BY ACCIDENT
  // -----------------------------
  const removePet = (index: number) => {
    setPets((currentPets) =>
      currentPets.filter((_, i) => i !== index)
    );

    setErrors((currentErrors) =>
      currentErrors.filter((_, i) => i !== index)
    );
  };
  // -----------------------------
  // UPDATE PET
  // -----------------------------
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
  };

  // -----------------------------
  // MANUAL FALLBACK ADDRESS PARSER (IF GOOGLE MAPS FAILS)
  // -----------------------------
  const parseManualAddress = (value: string) => {
    const upper = value.toUpperCase().trim();

    const stateMatch = upper.match(
      /\b(NSW|VIC|QLD|SA|WA|TAS|NT|ACT)\b/
    );

    const postcodeMatch = upper.match(
      /\b(\d{4})\b/
    );

    const state = stateMatch
      ? stateMatch[1]
      : "";

    const postcode = postcodeMatch
      ? postcodeMatch[1]
      : "";

    let suburb = "";

    if (stateMatch) {
      const beforeState = upper.substring(
        0,
        stateMatch.index
      );

      const parts = beforeState
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);

      if (parts.length >= 2) {
        suburb = parts[parts.length - 1];
      }
    }

    setAddressDetails({
      suburb,
      state,
      postcode,
    });

    if (value.trim() === "") {
      setAddressError("Home Address is required");
    } else if (state === "") {
      setAddressError(
        "Please enter a valid Australian address including the state."
      );
    } else if (suburb === "") {
      setAddressError(
        "Please enter a valid address including the suburb."
      );
    } else if (postcode === "") {
      setAddressError(
        "Please enter a valid address including the postcode."
      );
    } else {
      setAddressError("");
    }
  };

  // -----------------------------
  // SUBMIT
  // -----------------------------
  const handleSubmit = () => {
    const newErrors = pets.map((pet) => ({
      name: pet.name.trim() === "",
      petType: false,
      gender: pet.gender === null,
      breed: pet.breed.trim() === "",
      dob: "",
    }));

    // Validate every pet's DOB
    pets.forEach((pet, index) => {
      if (pet.dob === "") {
        newErrors[index].dob =
          "Date of Birth is required";
      } else {
        const fourteenDaysAgo = new Date();

        fourteenDaysAgo.setDate(
          fourteenDaysAgo.getDate() - 14
        );

        const minimumDob =
          fourteenDaysAgo
            .toISOString()
            .split("T")[0];

        if (pet.dob > minimumDob) {
          newErrors[index].dob =
            "Your pet must be at least 14 days old";
        }
      }
    });

    setErrors(newErrors);

    const firstInvalidPetIndex = newErrors.findIndex(
      (error) =>
        error.name ||
        error.petType ||
        error.gender ||
        error.breed ||
        error.dob
    );

    const hasPetErrors = firstInvalidPetIndex !== -1;

    let hasAddressError = false;

    if (address.trim() === "") {
      setAddressError("Home Address is required");
      hasAddressError = true;
    } else if (
      addressDetails.suburb === "" ||
      addressDetails.state === "" ||
      addressDetails.postcode === ""
    ) {
      setAddressError(
        "Please enter a valid Australian address including suburb, state and postcode."
      );
      hasAddressError = true;
    }

    // Scroll to the first error
    if (firstInvalidPetIndex !== -1) {
      requestAnimationFrame(() => {
        petRefs.current[firstInvalidPetIndex]?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      });
    } else if (hasAddressError) {
      requestAnimationFrame(() => {
        addressContainerRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      });
    }

    // Stop if anything is invalid
    if (hasPetErrors || hasAddressError) {
      return;
    }

    // Save all pets and shared address
    sessionStorage.setItem(
      "petDetails",
      JSON.stringify({
        pets,
        address,
        addressDetails,
      })
    );

    // Build the URL for the Plans page
const params = new URLSearchParams();

// Customer details are collected later
params.set("first_name", "");
params.set("last_name", "");
params.set("email", "");
params.set("mobile", "");

// Address
params.set("address", address);
params.set("region", addressDetails.suburb);
params.set("state", addressDetails.state);
params.set("postcode", addressDetails.postcode);

// Payment frequency
params.set("payment_frequency", "monthly");

// Pet details
const urlPets = pets.map((pet, index) => ({
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
  policy_start_date: new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Brisbane",
  }).format(new Date()),
  selectedPlan: null,
  annual_limit: null,
  benefit_percentage: null,
  annual_excess: null,
}));

params.set("pets", JSON.stringify(urlPets));

// Navigate to Plans with the full quote information
router.push(`/plans?${params.toString()}`);
};



  // -----------------------------
  // BUTTON STYLE
  // -----------------------------
  const buttonStyle = (active: boolean) => ({
    flex: 1,
    height: 48,
    padding: "0 15px",
    borderRadius: 5,
    border: "1px solid #e6e3e0",
    background: active ? "#fdba2e" : "#fff",
    color: "#111",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 15,
  });

  // -----------------------------
  // LABEL STYLE
  // -----------------------------
  const labelStyle = {
    color: "#374151",
    fontSize: 14,
    fontWeight: 500,
    marginBottom: 6,
    display: "block",
  };

  // -----------------------------
  // INPUT STYLE
  // -----------------------------
  const inputStyle = {
    width: "100%",
    height: 48,
    padding: "15px",
    borderRadius: 5,
    border: "1px solid #e6e3e0",
    backgroundColor: "#fff",
    color: "#111",
    outline: "none",
    boxSizing: "border-box" as const,
    fontSize: 15,
  };

  // -----------------------------
  // ERROR STYLE
  // -----------------------------

  const errorStyle = {
  color: "#d50000",
  fontSize: 14,
  marginTop: 5,
};

  // -----------------------------
  // SELECT STYLES
  // -----------------------------
  const selectStyles = (hasError: boolean) => ({
    control: (base: any, state: any) => ({
      ...base,
      minHeight: "48px",
      height: "48px",
      borderRadius: "5px",
      border: `1px solid ${
        hasError ? "#d50000" : "#e6e3e0"
      }`,
      boxShadow: "none",
      backgroundColor: "#fff",

      "&:hover": {
        borderColor:
          hasError ? "#d50000" : "#e6e3e0",
      },
    }),

    valueContainer: (base: any) => ({
      ...base,
      height: "48px",
      padding: "0 15px",
      fontSize: "15px",
    }),

    indicatorsContainer: (base: any) => ({
      ...base,
      height: "48px",
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

    singleValue: (base: any) => ({
      ...base,
      color: "#111",
    }),

    input: (base: any) => ({
      ...base,
      color: "#111",
    }),

    placeholder: (base: any) => ({
      ...base,
      color: "#666",
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
  });


  useEffect(() => {
    setMounted(true);
    fetchOptions();

    // -----------------------------
    // RESTORE SAVED PET DETAILS
    // -----------------------------
    const storedPetDetails = sessionStorage.getItem("petDetails");

    let savedAddress = "";

    if (storedPetDetails) {
      const saved = JSON.parse(storedPetDetails);

      if (saved.pets) {
        setPets(saved.pets);

        setErrors(
          saved.pets.map(() => ({
            name: false,
            petType: false,
            gender: false,
            breed: false,
            dob: "",
          }))
        );
      }

      if (saved.address) {
        savedAddress = saved.address;
        setAddress(saved.address);
      }

      if (saved.addressDetails) {
        setAddressDetails(saved.addressDetails);
      }
    }

    let cancelled = false;
    let autocomplete: HTMLElement | null = null;

    const loadGoogleMaps = async () => {
      try {
        if (!googleMapsConfigured) {
          console.log(
            "Google Maps API key exists:",
            !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
          );

          setGoogleMapsOptions({
            key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
            v: "weekly",
          });

          googleMapsConfigured = true;
        }

        const { PlaceAutocompleteElement } =
          await importLibrary("places");

        console.log(
          "Places library loaded:",
          PlaceAutocompleteElement
        );

        if (cancelled) {
          return;
        }

        if (!addressContainerRef.current) {
          return;
        }

        // Remove anything that may already be inside
        // the container.
        addressContainerRef.current.innerHTML = "";

        const newAutocomplete =
          new PlaceAutocompleteElement();

        console.log(
          "Autocomplete created:",
          newAutocomplete
        );

        newAutocomplete.style.width = "100%";
        newAutocomplete.style.display = "block";

        autocomplete = newAutocomplete;
        autocompleteRef.current = newAutocomplete;

        if (savedAddress) {
          newAutocomplete.value = savedAddress;
        }

        newAutocomplete.setAttribute(
          "included-region-codes",
          "au"
        );

        newAutocomplete.setAttribute(
          "placeholder",
          "e.g. 123 Queen Street, Brisbane QLD 4000"
        );

        // Check again before adding it.
        if (cancelled) {
          return;
        }

        addressContainerRef.current.appendChild(
          newAutocomplete
        );

        // -----------------------------
        // GOOGLE PLACE SELECTED
        // -----------------------------

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
                !cancelled &&
                place.formattedAddress
              ) {
                setAddress(place.formattedAddress);

                const components = place.addressComponents || [];
                console.log("GOOGLE ADDRESS COMPONENTS:", components);

                let suburb = "";
                let state = "";
                let postcode = "";

                components.forEach((component: any) => {
                  const types = component.types || [];

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
                });

                state = state
                  .toUpperCase()
                  .trim();

                console.log("EXTRACTED ADDRESS:", {
                  suburb,
                  state,
                  postcode,
                });

                setAddressDetails({
                  suburb,
                  state,
                  postcode,
                });

                setAddressError("");
              }
            } catch (error) {
              console.error(
                "Failed to get selected address:",
                error
              );

              if (!cancelled) {
                setGoogleMapsFailed(true);
              }
            }
          }
        );

        // -----------------------------
        // GOOGLE MAPS ERROR / QUOTA
        // -----------------------------

        newAutocomplete.addEventListener(
          "gmp-error",
          () => {
            console.warn(
              "Google Maps autocomplete failed. Switching to manual address entry."
            );

            if (!cancelled) {
              setGoogleMapsFailed(true);
            }
          }
        );
      } catch (error) {
        if (!cancelled) {
          console.error(
            "Google Maps failed to load. Using manual address entry.",
            error
          );

          setGoogleMapsFailed(true);
        }
      }
    };

    loadGoogleMaps();

    // -----------------------------
    // CLEANUP
    // -----------------------------

    return () => {
      cancelled = true;

      if (autocomplete) {
        autocomplete.remove();
        autocomplete = null;
      }

      if (addressContainerRef.current) {
        addressContainerRef.current.innerHTML = "";
      }
    };
  }, []);

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
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingBreeds(false);
    }
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "Transparent",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "32px 16px",
      }}
    >
      {/* LOGO */}
      <div
        style={{
          width: "100%",
          maxWidth: 672,
          display: "flex",
          justifyContent: "center",
          marginBottom: 20,
        }}
      >
        <button
          type="button"
          onClick={handleLogoClick}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
          }}
        >
          <img
            src="/was-logo.min.webp"
            alt="WAS Insurance"
            style={{
              width: 120,
              opacity: 0.65,
            }}
          />
        </button>
      </div>

      {/* CARD */}
      <div
        style={{
          width: "100%",
          maxWidth: 672,
          background: "#fff",
          border: "1px solid #eee",
          borderRadius: 16,
          padding: 30,
          boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
        }}
      >
        {/* TITLE */}
        <h2
          style={{
            color: "#111",
            fontSize: 22,
            fontWeight: 700,
            marginBottom: 8,
            letterSpacing: "-0.5px",
          }}
        >
          Pet Insurance Quote
        </h2>

        <p
          style={{
            color: "#666",
            fontSize: 14,
            marginTop: 0,
            marginBottom: 25,
            lineHeight: 1.5,
          }}
        >
          Enter your pet details to generate a quote
        </p>

        {/* =========================
            PETS
        ========================== */}

        {pets.map((pet, index) => {
          const petError = errors[index];

          return (
            <div
              key={index}
              ref={(el) => {
                petRefs.current[index] = el;
              }}
              style={{
                marginTop: 25,
                paddingTop:
                  index === 0 ? 0 : 25,
                borderTop:
                  index === 0
                    ? "none"
                    : "1px solid #eee",
              }}
            >
              {/* PET TITLE */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                  marginBottom: 22,
                }}
              >
                <h3
                  style={{
                    color: "#111",
                    fontSize: 24,
                    fontWeight: 700,
                    margin: 0,
                    letterSpacing: "-0.5px",
                  }}
                >
                  {pet.petType === "cat"
                    ? "🐱"
                    : pet.petType === "dog"
                      ? "🐶"
                      : ""}{" "}
                  {pet.name || (index === 0 ? "" : `Pet ${index + 1}`)}
                </h3>

                {/* REMOVE PET */}
                {index > 0 && (
                  <button
                    type="button"
                    onClick={() => removePet(index)}
                    style={{
                      position: "absolute",
                      right: 0,
                      top: "50%",
                      transform: "translateY(-50%)",
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      border: "none",
                      background: "#f3f4f6",
                      color: "#555",
                      fontSize: 24,
                      lineHeight: 1,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    aria-label={`Remove Pet ${index + 1}`}
                  >
                    ×
                  </button>
                )}
              </div>
              {/* NAME */}
              <div>
                <label style={labelStyle}>
                  Pet's Name
                </label>

                <input
                  type="text"
                  value={pet.name}
                  onChange={(e) => {
                    let value = e.target.value.replace(
                      /[^a-zA-Z\s'-]/g,
                      ""
                    );

                    // Capitalise the first letter
                    if (value.length > 0) {
                      value =
                        value.charAt(0).toUpperCase() +
                        value.slice(1);
                    }

                    updatePet(index, {
                      name: value,
                    });
                  }}
                  placeholder="Enter your pet's name"
                  style={{
                    ...inputStyle,
                    border: petError?.name
                      ? "2px solid #d50000"
                      : "1px solid #e6e3e0",
                  }}
                />

                {petError?.name && (
                  <p style={errorStyle}>
                    Pet's name is required
                  </p>
                )}
              </div>

              {/* GENDER */}
              <div style={{ marginTop: 10 }}>
                <span style={labelStyle}>
                  Gender
                </span>

                <div
                  style={{
                    display: "flex",
                    gap: 10,
                  }}
                >
                  <button
                    type="button"
                    style={{
                      ...buttonStyle(
                        pet.gender === "male"
                      ),
                      border: petError?.gender
                        ? "2px solid #d50000"
                        : "1px solid #e6e3e0",
                    }}
                    onClick={() =>
                      updatePet(index, {
                        gender: "male",
                      })
                    }
                  >
                    Male
                  </button>

                  <button
                    type="button"
                    style={{
                      ...buttonStyle(
                        pet.gender === "female"
                      ),
                      border: petError?.gender
                        ? "2px solid #d50000"
                        : "1px solid #e6e3e0",
                    }}
                    onClick={() =>
                      updatePet(index, {
                        gender: "female",
                      })
                    }
                  >
                    Female
                  </button>
                </div>

                {petError?.gender && (
                  <p style={errorStyle}>
                    Please select Male or Female
                  </p>
                )}
              </div>

              {/* BREED */}
              <div style={{ marginTop: 10 }}>
                <label style={labelStyle}>
                  Breed
                </label>

                {mounted && (
                  <Select<Option, false>
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
                        (option) => option.value === pet.breed
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
                          selected.petType.toLowerCase() === "cat"
                            ? "cat"
                            : "dog",
                      });
                    }}
                    styles={selectStyles(!!petError?.breed)}

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

                    isLoading={loadingBreeds}
                    placeholder="Select your pet's breed"
                    noOptionsMessage={() =>
                      loadingBreeds
                        ? "Loading breeds..."
                        : "No breeds found"
                    }
                  />
                )}

                {petError?.breed && (
                  <p style={errorStyle}>
                    Breed is required
                  </p>
                )}
              </div>

              {/* DOB */}
              <div style={{ marginTop: 10 }}>
                <label style={labelStyle}>
                  Pet's Date of Birth
                </label>

                <div
                  style={{
                    position: "relative",
                    width: "100%",
                  }}
                >
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="DD/MM/YYYY"
                    value={
                      dobInputs[index] ??
                      (pet.dob
                        ? pet.dob.split("-").reverse().join("/")
                        : "")
                    }
                    onFocus={() => {
                      setOpenBreedDropdown(null);
                      setOpenDatePicker(index);
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

                      // Don't save until DD/MM/YYYY is complete
                      if (digits.length !== 8) {
                        updatePet(index, {
                          dob: "",
                        });

                        return;
                      }

                      const day = Number(
                        digits.slice(0, 2)
                      );

                      const month = Number(
                        digits.slice(2, 4)
                      );

                      const year = Number(
                        digits.slice(4, 8)
                      );

                      const typedDate = new Date(
                        year,
                        month - 1,
                        day
                      );

                      // Make sure the date actually exists
                      const isValidDate =
                        typedDate.getFullYear() === year &&
                        typedDate.getMonth() === month - 1 &&
                        typedDate.getDate() === day;

                      if (!isValidDate) {
                        updatePet(index, {
                          dob: "",
                        });

                        setErrors((current) =>
                          current.map((error, i) =>
                            i === index
                              ? {
                                  ...error,
                                  dob: "Please enter a valid date",
                                }
                              : error
                          )
                        );

                        return;
                      }

                      const monthString = String(
                        month
                      ).padStart(2, "0");

                      const dayString = String(
                        day
                      ).padStart(2, "0");

                      const selectedDob =
                        `${year}-${monthString}-${dayString}`;

                      updatePet(index, {
                        dob: selectedDob,
                      });

                      const today = new Date();
                      today.setHours(0, 0, 0, 0);

                      const minimumDobDate =
                        new Date(today);

                      minimumDobDate.setDate(
                        today.getDate() - 14
                      );

                      typedDate.setHours(0, 0, 0, 0);

                      setErrors((current) =>
                        current.map((error, i) =>
                          i === index
                            ? {
                                ...error,
                                dob:
                                  typedDate >
                                  minimumDobDate
                                    ? "Your pet must be at least 14 days old"
                                    : "",
                              }
                            : error
                        )
                      );
                    }}
                    style={{
                      ...inputStyle,
                      paddingRight: 45,
                      border: petError?.dob
                        ? "1px solid #d50000"
                        : "1px solid #e6e3e0",
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => {
                      setOpenBreedDropdown(null);

                      setOpenDatePicker(
                        openDatePicker === index
                          ? null
                          : index
                      );
                    }}
                    aria-label="Open date picker"
                    style={{
                      position: "absolute",
                      right: 15,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      padding: 0,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#555",
                    }}
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

                        const selectedDob =
                          `${year}-${month}-${day}`;

                        updatePet(index, {
                          dob: selectedDob,
                        });

                        setDobInputs((current) => ({
                          ...current,
                          [index]: `${day}/${month}/${year}`,
                        }));

                        const today = new Date();
                        today.setHours(0, 0, 0, 0);

                        const minimumDobDate =
                          new Date(today);

                        minimumDobDate.setDate(
                          today.getDate() - 14
                        );

                        const selectedDateOnly =
                          new Date(
                            selectedDob + "T00:00:00"
                          );

                        setErrors((current) =>
                          current.map((error, i) =>
                            i === index
                              ? {
                                  ...error,
                                  dob:
                                    selectedDateOnly >
                                    minimumDobDate
                                      ? "Your pet must be at least 14 days old"
                                      : "",
                                }
                              : error
                          )
                        );

                        setOpenDatePicker(null);
                      }}
                    />
                  </div>
                )}

                {petError?.dob && (
                  <p style={errorStyle}>
                    {petError.dob}
                  </p>
                )}
              </div>
            </div>
          );
        })}

        {/* =========================
            ADD ANOTHER PET
        ========================== */}

        <button
          type="button"
          onClick={addPet}
          style={{
            marginTop: 25,
            width: "100%",
            padding: "8px",
            borderRadius: 8,
            border: "none",
            background: "#f42868",
            color: "#fff",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            boxShadow: "0 4px 10px rgba(244, 40, 104, 0.20)",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#e51f5d";
            e.currentTarget.style.transform = "translateY(-1px)";
            e.currentTarget.style.boxShadow =
              "0 6px 14px rgba(244, 40, 104, 0.25)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#f42868";
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow =
              "0 4px 10px rgba(244, 40, 104, 0.20)";
          }}
        >
          <span
            style={{
              fontSize: 22,
              fontWeight: 400,
              lineHeight: 1,
            }}
          >
            +
          </span>

          Add another pet
        </button>

        {/* =========================
              SHARED ADDRESS
            ========================== */}

        <div style={{ marginTop: 15 }}>
          <label style={labelStyle}>
            Home Address
          </label>
          
          {/*
             Manual fallback if Google Maps fails for demonstration purposes */}

          {googleMapsFailed ? (
            <input
              type="text"
              value={address}
              onChange={(e) => {
                const value = e.target.value;

                setAddress(value);
                parseManualAddress(value);
              }}
              placeholder="e.g. 123 Queen Street, Brisbane QLD 4000"
              style={{
                ...inputStyle,
                border: addressError
                  ? "2px solid #d50000"
                  : "1px solid #e6e3e0",
              }}
            />
          ) : (
            <div
              ref={addressContainerRef}
              style={{
                width: "100%",
                minHeight: 48,
                borderRadius: 5,
                border: addressError
                  ? "2px solid #d50000"
                  : "1px solid #e6e3e0",
                backgroundColor: "#fff",
                boxSizing: "border-box",
                overflow: "visible",
              }}
            />
          )}

          {addressError && (
            <p style={errorStyle}>
              {addressError}
            </p>
          )}
        </div>
        
        {/* =========================
            GENERATE QUOTE
        ========================== */}

        <div className="mt-4 flex gap-3 pb-8">
          <button
            type="button"
            onClick={handleSubmit}
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
            Generate Quote
          </button>
        </div>
      </div>
    </main>
  );
}