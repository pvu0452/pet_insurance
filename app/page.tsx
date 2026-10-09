"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Select, { components, type StylesConfig } from "react-select";
import { DayPicker } from "@daypicker/react";
import "@daypicker/react/style.css";
import {
  importLibrary,
  setOptions as setGoogleMapsOptions,
} from "@googlemaps/js-api-loader";

/**
 * HANDOVER — Quote page (app/page.tsx)
 *
 * First step of the customer journey: collect one or more pets and a shared
 * Australian address. On success, persist the form in sessionStorage under
 * "petDetails" and redirect to /plans with the quote parameters in its URL.
 * /plans and /details depend on these field names, so coordinate changes
 * across those pages rather than renaming them here in isolation.
 *
 * External services: pet breed catalogue and Google Places autocomplete.
 * Google Places suggests addresses and automatically fills suburb, state and postcode.
 * If the API fails, the existing fallback input is shown automatically.
 */
const BREED_API_URL =
  "https://api4pet-dev-msac6e2qpq-ts.a.run.app/api/v1/category/pet-breed";

// Google Maps loader options can only be configured once in a browser session.
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
  dob: string; // ISO date (YYYY-MM-DD); text input displays DD/MM/YYYY.
}

interface PetErrors {
  name: boolean;
  gender: boolean;
  breed: boolean;
  dob: string;
}

// Using factories keeps defaults consistent across add, reset and restoration.
const emptyPet = (): Pet => ({
  name: "",
  petType: null,
  gender: null,
  breed: "",
  dob: "",
});

const emptyPetErrors = (): PetErrors => ({
  name: false,
  gender: false,
  breed: false,
  dob: "",
});

/** Date values are exchanged with later pages as YYYY-MM-DD. */
function toIsoDate(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

/** The same 14-day minimum must apply to typed, picked and submitted DOBs. */
function getDobError(dob: string): string {
  if (!dob) return "Date of Birth is required";

  const minAgeDate = new Date();
  minAgeDate.setHours(0, 0, 0, 0);
  minAgeDate.setDate(minAgeDate.getDate() - 14);

  return dob > toIsoDate(minAgeDate)
    ? "Your pet must be at least 14 days old"
    : "";
}

/**
 * HANDOVER — UI consistency: use the same 48px controls, 12px radius,
 * grey borders, amber primary actions and inline red errors as Plans/Details.
 * Keep these values in sync if the team's design system changes.
 */
const FIELD_BORDER = "#d1d5db";
const ERROR_BORDER = "#ef4444";

// Shared control styles. Defined once rather than recreated each render.
const buttonStyle = (active: boolean) => ({
  flex: 1,
  height: 48,
  padding: "0 15px",
  borderRadius: 12,
  border: `1px solid ${FIELD_BORDER}`,
  background: active ? "#fdba2e" : "#fff",
  color: "#111",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: 14,
});

// Form label.
const labelStyle = {
  color: "#111827",
  fontSize: 14,
  fontWeight: 600,
  marginBottom: 8,
  display: "block",
};
// Text input.
const inputStyle = {
  width: "100%",
  height: 48,
  padding: "0 15px",
  borderRadius: 12,
  border: `1px solid ${FIELD_BORDER}`,
  backgroundColor: "#fff",
  color: "#111",
  outline: "none",
  boxSizing: "border-box" as const,
  fontSize: 14,
};
// Validation message.
const errorStyle = {
  color: "#dc2626",
  fontSize: 14,
  marginTop: 5,
};
// react-select needs a function so its border can respond to validation.
const selectStyles = (hasError: boolean): StylesConfig<Option, false> => ({
  control: (base, state) => ({
    ...base,
    minHeight: "48px",
    height: "48px",
    borderRadius: "12px",
    border: `1px solid ${hasError ? ERROR_BORDER : FIELD_BORDER}`,
    // Keyboard/mouse focus uses the same outline treatment as other fields.
    boxShadow: state.isFocused
      ? `0 0 0 2px ${hasError ? ERROR_BORDER : "#1f2937"}`
      : "none",
    backgroundColor: "#fff",
    "&:hover": {
      borderColor:
        hasError ? ERROR_BORDER : FIELD_BORDER,
    },
  }),
  valueContainer: (base) => ({
    ...base,
    height: "48px",
    padding: "0 15px",
    fontSize: "14px",
  }),
  indicatorsContainer: (base) => ({
    ...base,
    height: "48px",
  }),
  indicatorSeparator: () => ({
    display: "none",
  }),
  dropdownIndicator: (base) => ({
    ...base,
    padding: 0,
    marginRight: "15px",
    color: "#555",
    "&:hover": {
      color: "#555",
    },
  }),
  singleValue: (base) => ({
    ...base,
    color: "#111",
  }),
  input: (base) => ({
    ...base,
    color: "#111",
  }),
  placeholder: (base) => ({
    ...base,
    color: "#666",
  }),
  menu: (base) => ({
    ...base,
    backgroundColor: "#fff",
  }),
  option: (base, state) => ({
    ...base,
    color: "#111",
    backgroundColor: state.isFocused
      ? "#f3f3f3"
      : "#fff",
    cursor: "pointer",
  }),
});

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
  // -----------------------------
  // PETS
  // -----------------------------
  const [pets, setPets] = useState<Pet[]>([emptyPet()]);
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
  const autocompleteRef = useRef<(HTMLElement & { value: string }) | null>(null);
  /**
   * A valid address must come from a Google suggestion, not free typing.
   * Save the widget's displayed text so submit can catch edits even if
   * the widget's internal input event does not reach React (Shadow DOM).
   */
  const selectedGoogleAddressTextRef = useRef("");
  const petRefs = useRef<(HTMLDivElement | null)[]>([]);
  // -----------------------------
  // ERRORS
  // -----------------------------
  const [errors, setErrors] = useState<PetErrors[]>([emptyPetErrors()]);
  const [addressError, setAddressError] = useState("");

  /** Reset both in-memory form state and the cross-page quote snapshot. */
  const handleLogoClick = () => {
    sessionStorage.removeItem("petDetails");
    sessionStorage.removeItem("cover");
    setPets([emptyPet()]);
    setErrors([emptyPetErrors()]);
    setAddress("");
    setAddressDetails({ suburb: "", state: "", postcode: "" });
    selectedGoogleAddressTextRef.current = "";
    setAddressError("");
    setDobInputs({});
    setOpenBreedDropdown(null);
    setOpenDatePicker(null);
    if (autocompleteRef.current) autocompleteRef.current.value = "";
  };

  // -----------------------------
  // ADD ANOTHER PET
  // -----------------------------
  const addPet = () => {
    setPets((current) => [...current, emptyPet()]);
    setErrors((current) => [...current, emptyPetErrors()]);
  };
  // -----------------------------
  // REMOVE ANOTHER PET IF ADDED BY ACCIDENT
  // -----------------------------
  const removePet = (index: number) => {
    setPets((current) => current.filter((_, i) => i !== index));
    setErrors((current) => current.filter((_, i) => i !== index));

    // DOB drafts use array indexes; shift them with the pets after removal.
    setDobInputs((current) =>
      Object.fromEntries(
        Object.entries(current)
          .map(([key, value]) => [Number(key), value] as const)
          .filter(([key]) => key !== index)
          .map(([key, value]) => [key > index ? key - 1 : key, value])
      )
    );
    // Open overlays also use indexes. Close them to avoid targeting a new pet.
    setOpenDatePicker(null);
    setOpenBreedDropdown(null);
  };
  // Immutable update so editing one pet doesn't overwrite another.
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
  /**
   * Best-effort manual fallback for comma-separated Australian addresses.
   * Expects something like "123 Queen Street, Brisbane QLD 4000".
   * This parser is not an address verification service; the quote API should
   * still validate the extracted location before issuing a policy.
   */
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
  // Final validation -> save form snapshot -> navigate to plan selection.
  const handleSubmit = () => {
    // Validate every pet before navigating; later pages assume complete data.
    const newErrors = pets.map((pet) => ({
      name: pet.name.trim() === "",
      gender: pet.gender === null,
      breed: pet.breed.trim() === "",
      dob: getDobError(pet.dob),
    }));
    setErrors(newErrors);
    const firstInvalidPetIndex = newErrors.findIndex(
      (error) =>
        error.name ||
        error.gender ||
        error.breed ||
        error.dob
    );
    const hasPetErrors = firstInvalidPetIndex !== -1;
    let hasAddressError = false;
    // Handover: Google Places has its own input (inside Shadow DOM). React's
    // `address` can still hold the PREVIOUS selection after somebody types a
    // different value, so always compare with the live widget text at submit.
    const visibleAddress = googleMapsFailed
      ? address.trim()
      : (autocompleteRef.current?.value ?? "").trim();
    const selectionStillMatches =
      googleMapsFailed ||
      (selectedGoogleAddressTextRef.current !== "" &&
        visibleAddress === selectedGoogleAddressTextRef.current);

    if (!visibleAddress) {
      setAddressError("Home Address is required");
      hasAddressError = true;
    } else if (!selectionStillMatches) {
      setAddressError("Please select a valid address from the suggestions.");
      hasAddressError = true;
    } else if (
      !addressDetails.suburb.trim() ||
      !addressDetails.state.trim() ||
      !addressDetails.postcode.trim()
    ) {
      setAddressError(
        "Please select a complete Australian address including suburb, state and postcode."
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
        // Used on returning to Quote from Plans to validate the restored text.
        selectedGoogleAddressText: googleMapsFailed
          ? ""
          : selectedGoogleAddressTextRef.current,
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
    // Pet details. Brisbane's date is required by the downstream quote API.
    const policyStartDate = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Australia/Brisbane",
    }).format(new Date());
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
      policy_start_date: policyStartDate,
      selectedPlan: null,
      annual_limit: null,
      benefit_percentage: null,
      annual_excess: null,
    }));
    params.set("pets", JSON.stringify(urlPets));
    // Navigate to Plans with the full quote information
    router.push(`/plans?${params.toString()}`);
  };
  useEffect(() => {
    setMounted(true);
    fetchOptions();
    // Restore a partially completed quote after navigation or refresh.
    // This storage is tab-scoped, not a long-term policy record.
    const storedPetDetails = sessionStorage.getItem("petDetails");
    let savedAddress = "";
    if (storedPetDetails) {
      try {
        const saved = JSON.parse(storedPetDetails);
        if (Array.isArray(saved.pets) && saved.pets.length > 0) {
          setPets(saved.pets);
          setErrors(saved.pets.map(() => emptyPetErrors()));
        }
        if (saved.address) {
          savedAddress = saved.address;
          setAddress(saved.address);
        }
        if (saved.addressDetails) {
          setAddressDetails(saved.addressDetails);
        }
        // Only quotes created by this validation flow carry a verified
        // Google selection. Older session snapshots must be reselected.
        if (typeof saved.selectedGoogleAddressText === "string") {
          selectedGoogleAddressTextRef.current =
            saved.selectedGoogleAddressText.trim();
        }
      } catch (error) {
        // Corrupt storage shouldn't prevent a customer from starting again.
        console.warn("Could not restore saved pet details:", error);
      }
    }
    let cancelled = false;
    let autocomplete: HTMLElement | null = null;
    const loadGoogleMaps = async () => {
      try {
        if (!googleMapsConfigured) {
          const mapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
          if (!mapsApiKey) {
            throw new Error("Google Maps API key is not configured");
          }
          setGoogleMapsOptions({ key: mapsApiKey, v: "weekly" });
          googleMapsConfigured = true;
        }
        const { PlaceAutocompleteElement } =
          await importLibrary("places");
        if (cancelled) {
          return;
        }
        if (!addressContainerRef.current) {
          return;
        }
        // Google Places mounts its own custom element into this React ref.
        addressContainerRef.current.replaceChildren();
        const newAutocomplete =
          new PlaceAutocompleteElement();
        newAutocomplete.style.width = "100%";
        newAutocomplete.style.display = "block";
        // Google supports border-radius on the widget itself. Its input remains
        // controlled by Google, so avoid absolute overlays or overflow clipping.
        newAutocomplete.style.borderRadius = "12px";
        autocomplete = newAutocomplete;
        autocompleteRef.current = newAutocomplete;
        if (savedAddress) {
          // Restore exactly what Google displayed when originally selected.
          // Older stored quotes only have the formatted address and therefore
          // require the user to select a suggestion again before submitting.
          newAutocomplete.value =
            selectedGoogleAddressTextRef.current || savedAddress;
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
        // Invalidate any previous Google selection as soon as the user edits
        // the field. Never reuse a suburb/state/postcode from an old address.
        newAutocomplete.addEventListener("input", () => {
          const typedText = newAutocomplete.value.trim();
          if (typedText !== selectedGoogleAddressTextRef.current) {
            selectedGoogleAddressTextRef.current = "";
            setAddress(typedText);
            setAddressDetails({ suburb: "", state: "", postcode: "" });
            setAddressError("");
          }
        });

        // Only selecting one of Google's suggestions authorises this address.
        // The pricing API still receives the normalised formatted address.
        newAutocomplete.addEventListener(
          "gmp-select",
          async (event: any) => {
            try {
              // Capture the suggestion's visible text before the async lookup.
              // If the user keeps typing while Google fetches address fields,
              // do not validate that old suggestion against their new text.
              const inputWhenSelected = newAutocomplete.value.trim();
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
                place.formattedAddress &&
                newAutocomplete.value.trim() === inputWhenSelected
              ) {
                selectedGoogleAddressTextRef.current = inputWhenSelected;
                setAddress(place.formattedAddress);
                const components = place.addressComponents || [];
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
        // On quota, network or SDK failures, reveal manual address entry.
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
      // Cleanup is important when React remounts effects in development.
      if (addressContainerRef.current) {
        addressContainerRef.current.replaceChildren();
      }
    };
  }, []);
  // Fetch once on mount; names are sorted for the searchable breed dropdown.
  const fetchOptions = async () => {
    try {
      setLoadingBreeds(true);
      const response = await fetch(BREED_API_URL);
      if (!response.ok) {
        throw new Error("Failed to fetch options");
      }
      // API contract: data.data[] has breed_name and pet_type.
      const data = await response.json();
      const options = data.data
        .map((item: { breed_name: string; pet_type: string }) => ({
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
          marginBottom: 24,
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
              width: 112,
              opacity: 0.7,
            }}
          />
        </button>
      </div>
      {/* Launch page: keep the welcome heading, but begin progress tracking on /plans. */}
      <div className="mb-7 w-full max-w-2xl text-center">
        <h1 className="text-2xl font-semibold text-gray-900">
          Pet Insurance Quote
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Enter your pet details to generate a quote.
        </p>
      </div>
      {/* Main quote card: same visual surface as Plans and Details. */}
      <div
        style={{
          width: "100%",
          maxWidth: 672,
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 24,
          boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
        }}
      >
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
                marginTop: index === 0 ? 0 : 24,
                paddingTop:
                  index === 0 ? 0 : 24,
                borderTop:
                  index === 0
                    ? "none"
                    : "1px solid #e5e7eb",
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
                  {pet.name || `Pet ${index + 1}`}
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
                  Pet Name
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
                  className="focus-visible:ring-2 focus-visible:ring-gray-800"
                  style={{
                    ...inputStyle,
                    border: petError?.name
                      ? `2px solid ${ERROR_BORDER}`
                      : `1px solid ${FIELD_BORDER}`,
                  }}
                />
                {petError?.name && (
                  <p style={errorStyle}>
                    Pet's name is required
                  </p>
                )}
              </div>
              {/* GENDER */}
              <div style={{ marginTop: 16 }}>
                <span style={labelStyle}>
                  Sex
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
                        ? `2px solid ${ERROR_BORDER}`
                        : `1px solid ${FIELD_BORDER}`,
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
                        ? `2px solid ${ERROR_BORDER}`
                        : `1px solid ${FIELD_BORDER}`,
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
              <div style={{ marginTop: 16 }}>
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
                      DropdownIndicator: (props) => (
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
              <div style={{ marginTop: 16 }}>
                <label style={labelStyle}>
                  Date of Birth
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
                      const selectedDob = toIsoDate(typedDate);
                      updatePet(index, { dob: selectedDob });
                      setErrors((current) =>
                        current.map((error, i) =>
                          i === index
                            ? { ...error, dob: getDobError(selectedDob) }
                            : error
                        )
                      );
                    }}
                    className="focus-visible:ring-2 focus-visible:ring-gray-800"
                    style={{
                      ...inputStyle,
                      paddingRight: 45,
                      border: petError?.dob
                        ? `1px solid ${ERROR_BORDER}`
                        : `1px solid ${FIELD_BORDER}`,
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
                        const selectedDob = toIsoDate(selectedDate);
                        updatePet(index, { dob: selectedDob });
                        setDobInputs((current) => ({
                          ...current,
                          [index]: selectedDob.split("-").reverse().join("/"),
                        }));
                        setErrors((current) =>
                          current.map((error, i) =>
                            i === index
                              ? { ...error, dob: getDobError(selectedDob) }
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
        {/* Keep the optional second-pet action pink; amber is for Generate Quote. */}
        <button
          type="button"
          onClick={addPet}
          className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl border-0 bg-[#f42868] text-sm font-semibold text-white shadow-[0_4px_10px_rgba(244,40,104,0.20)] transition-all hover:-translate-y-px hover:bg-[#e51f5d] hover:shadow-[0_6px_14px_rgba(244,40,104,0.25)] active:translate-y-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f42868]"
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
            Google Places provides the address suggestions and extracts suburb,
            state and postcode after selection. Only fall back to a plain
            address field automatically if the Google API fails to load.
          */}
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
              className="focus-visible:ring-2 focus-visible:ring-gray-800"
              style={{
                ...inputStyle,
                border: addressError
                  ? `2px solid ${ERROR_BORDER}`
                  : `1px solid ${FIELD_BORDER}`,
              }}
            />
          ) : (
            <div
              ref={addressContainerRef}
              className="quote-address-autocomplete focus-within:ring-2 focus-within:ring-gray-800"
              style={{
                width: "100%",
                minHeight: 48,
                borderRadius: 12,
                border: addressError
                  ? `2px solid ${ERROR_BORDER}`
                  : `1px solid ${FIELD_BORDER}`,
                backgroundColor: "#fff",
                boxSizing: "border-box",
                // Do not clip Google's address suggestions dropdown.
                overflow: "visible",
              }}
            />
          )}
          {/* The Google widget uses Shadow DOM. Google exposes its input as
              ::part(input), allowing rounded corners without covering or
              disabling typing, and without clipping the suggestions menu. */}
          <style>{`
            .quote-address-autocomplete gmp-place-autocomplete,
            .quote-address-autocomplete gmp-place-autocomplete::part(input) {
              border-radius: 12px;
            }
          `}</style>
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
              rounded-xl
              bg-amber-400
              hover:bg-amber-500
              active:bg-amber-600
              text-gray-900
              text-sm
              font-semibold
              shadow-sm
              transition
              focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-800
            "
          >
            Generate Quote
          </button>
        </div>
      </div>
    </main>
  );
}
