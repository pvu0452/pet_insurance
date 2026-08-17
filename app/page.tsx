"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Select from "react-select";
import {importLibrary, setOptions as setGoogleMapsOptions,} from "@googlemaps/js-api-loader";

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

    setAddressDetails((current) => ({
      ...current,
      state,
      postcode,
    }));

    if (value.trim() === "") {
      setAddressError("Home Address is required");
    } else if (state === "") {
      setAddressError(
        "Please enter a valid Australian address including the state."
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
    } else if (addressDetails.state === "") {
      setAddressError(
        "Please enter a valid Australian address including the state."
      );
      hasAddressError = true;
    } else {
      setAddressError("");
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

    router.push("/plans");
  };

  // -----------------------------
  // BUTTON STYLE
  // -----------------------------
  const buttonStyle = (active: boolean) => ({
    flex: 1,
    padding: "12px",
    borderRadius: 10,
    border: "1px solid #ddd",
    background: active ? "#eaac2a" : "#fff",
    color: "#111",
    cursor: "pointer",
    fontWeight: 500,
  });

  // -----------------------------
  // LABEL STYLE
  // -----------------------------
  const labelStyle = {
    color: "#333",
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 7,
    display: "block",
  };

  // -----------------------------
  // SELECT STYLES
  // -----------------------------
  const selectStyles = (hasError: boolean) => ({
    control: (base: any, state: any) => ({
      ...base,
      minHeight: "46px",
      borderRadius: "10px",
      border: `1px solid ${hasError ? "red" : "#ddd"}`,
      boxShadow: "none",
      backgroundColor: "#fff",
      "&:hover": {
        borderColor: hasError ? "red" : "#ddd",
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

        // If this effect has already been cleaned up,
        // don't create the Google autocomplete.
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

        newAutocomplete.style.width = "100%";
        newAutocomplete.style.display = "block";
      
        autocomplete = newAutocomplete;

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
        padding: 40,
        fontFamily: "Arial",
      }}
    >
      {/* LOGO */}
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          display: "flex",
          justifyContent: "flex-start",
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
          maxWidth: 520,
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
              <div style={{ marginTop: 25 }}>
                <label style={labelStyle}>
                  Pet's Name
                </label>

                <input
                  type="text"
                  value={pet.name}
                  onChange={(e) => {
                    const value = e.target.value.replace(
                      /[^a-zA-Z\s'-]/g,
                      ""
                    );

                    updatePet(index, {
                      name: value,
                    });
                  }}
                  placeholder="Enter your pet's name"
                  style={{
                    width: "100%",
                    padding: 12,
                    borderRadius: 10,
                    border: petError?.name
                      ? "1px solid red"
                      : "1px solid #ddd",
                    color: "#111",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />

                {petError?.name && (
                  <p
                    style={{
                      color: "red",
                      fontSize: 12,
                      marginTop: 6,
                    }}
                  >
                    Pet's name is required
                  </p>
                )}
              </div>

              {/* GENDER */}
              <div style={{ marginTop: 25 }}>
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
                        ? "1px solid red"
                        : "1px solid #ddd",
                    }}
                    onClick={() =>
                      updatePet(index, {
                        gender: "male",
                      })
                    }
                  >
                    ♂ Male
                  </button>

                  <button
                    type="button"
                    style={{
                      ...buttonStyle(
                        pet.gender === "female"
                      ),
                      border: petError?.gender
                        ? "1px solid red"
                        : "1px solid #ddd",
                    }}
                    onClick={() =>
                      updatePet(index, {
                        gender: "female",
                      })
                    }
                  >
                    ♀ Female
                  </button>
                </div>

                {petError?.gender && (
                  <p
                    style={{
                      color: "red",
                      fontSize: 12,
                      marginTop: 6,
                    }}
                  >
                    Please select Male or Female
                  </p>
                )}
              </div>

              {/* BREED */}
              <div style={{ marginTop: 25 }}>
                <label style={labelStyle}>
                  Breed
                </label>

                {mounted && (
                  <Select<Option, false>
                    options={options}
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
                  <p
                    style={{
                      color: "red",
                      fontSize: 12,
                      marginTop: 6,
                    }}
                  >
                    Breed is required
                  </p>
                )}
              </div>

              {/* DOB */}
              <div style={{ marginTop: 20 }}>
                <label style={labelStyle}>
                  Pet's Date of Birth
                </label>

                <input
                  type="date"
                  value={pet.dob}
                  onChange={(e) => {
                    const selectedDob =
                      e.target.value;

                    updatePet(index, {
                      dob: selectedDob,
                    });

                    if (selectedDob === "") {
                      setErrors((current) =>
                        current.map((error, i) =>
                          i === index
                            ? {
                                ...error,
                                dob:
                                  "Date of Birth is required",
                              }
                            : error
                        )
                      );
                      return;
                    }

                    const today = new Date();
                    today.setHours(0, 0, 0, 0);

                    const minimumDobDate =
                      new Date(today);

                    minimumDobDate.setDate(
                      today.getDate() - 14
                    );

                    const selectedDate = new Date(
                      selectedDob + "T00:00:00"
                    );

                    setErrors((current) =>
                      current.map((error, i) =>
                        i === index
                          ? {
                              ...error,
                              dob:
                                selectedDate >
                                minimumDobDate
                                  ? "Your pet must be at least 14 days old"
                                  : "",
                            }
                          : error
                      )
                    );
                  }}
                  style={{
                    width: "100%",
                    padding: 12,
                    borderRadius: 10,
                    border: petError?.dob
                      ? "1px solid red"
                      : "1px solid #ddd",
                    color: "#111",
                    outline: "none",
                  }}
                />

                {petError?.dob && (
                  <p
                    style={{
                      color: "red",
                      fontSize: 12,
                      marginTop: 6,
                    }}
                  >
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

            <div style={{ marginTop: 20 }}>
              <label style={labelStyle}>
                Home Address
              </label>

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
                    width: "100%",
                    padding: 12,
                    borderRadius: 10,
                    border: addressError
                      ? "1px solid red"
                      : "1px solid #ddd",
                    backgroundColor: "#fff",
                    color: "#111",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              ) : (
                <div
                  ref={addressContainerRef}
                  style={{
                    width: "100%",
                    minHeight: 46,
                    borderRadius: 10,
                    border: addressError
                      ? "1px solid red"
                      : "1px solid #ddd",
                    backgroundColor: "#fff",
                    boxSizing: "border-box",
                    overflow: "hidden",
                  }}
                />
              )}

              {addressError && (
                <p
                  style={{
                    color: "red",
                    fontSize: 12,
                    marginTop: 6,
                  }}
                >
                  {addressError}
                </p>
              )}
            </div>
        {/* =========================
            GENERATE QUOTE
        ========================== */}

        <button
          onClick={handleSubmit}
          style={{
            marginTop: 30,
            width: "100%",
            padding: 14,
            borderRadius: 10,
            border: "none",
            background: "#eaac2a",
            color: "#111",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Generate Quote
        </button>
      </div>
    </main>
  );
}