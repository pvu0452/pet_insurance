"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Select from "react-select";

interface Option {
  value: string;
  label: string;
  petType: string;
  petBreed: string;
}

interface Pet {
  petType: "cat" | "dog" | null;
  gender: "male" | "female" | null;
  breed: string;
  dob: string;
}

export default function Home() {
  const router = useRouter();

  const [options, setOptions] = useState<Option[]>([]);
  const [mounted, setMounted] = useState(false);

  // -----------------------------
  // PETS
  // -----------------------------
  const [pets, setPets] = useState<Pet[]>([
    {
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

  // -----------------------------
  // ERRORS
  // -----------------------------
  const [errors, setErrors] = useState<
    {
      petType: boolean;
      gender: boolean;
      breed: boolean;
      dob: string;
    }[]
  >([
    {
      petType: false,
      gender: false,
      breed: false,
      dob: "",
    },
  ]);

  const [addressError, setAddressError] = useState(false);

  // -----------------------------
  // ADD ANOTHER PET
  // -----------------------------
  const addPet = () => {
    setPets((currentPets) => [
      ...currentPets,
      {
        petType: null,
        gender: null,
        breed: "",
        dob: "",
      },
    ]);

    setErrors((currentErrors) => [
      ...currentErrors,
      {
        petType: false,
        gender: false,
        breed: false,
        dob: "",
      },
    ]);
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
  // SUBMIT
  // -----------------------------
  const handleSubmit = () => {
    const newErrors = pets.map((pet) => ({
      petType: pet.petType === null,
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

    const hasPetErrors = newErrors.some(
      (error) =>
        error.petType ||
        error.gender ||
        error.breed ||
        error.dob
    );

    const hasAddressError =
      address.trim() === "";

    setAddressError(hasAddressError);

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
    background: active ? "#111" : "#fff",
    color: active ? "#fff" : "#111",
    cursor: "pointer",
    fontWeight: 500,
  });

  // -----------------------------
  // LABEL STYLE
  // -----------------------------
  const labelStyle = {
    color: "#111",
    fontSize: 14,
    marginBottom: 6,
    display: "block",
  };

  // -----------------------------
  // SELECT STYLES
  // -----------------------------
  const selectStyles = {
    control: (base: any) => ({
      ...base,
      minHeight: "46px",
      borderRadius: "10px",
      border: "1px solid #ddd",
      boxShadow: "none",
      backgroundColor: "#fff",
      "&:hover": {
        borderColor: "#ddd",
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
  };

  // -----------------------------
  // FETCH BREEDS
  // -----------------------------
  useEffect(() => {
    setMounted(true);
    fetchOptions();
  }, []);

  const fetchOptions = async () => {
    try {
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
        <img
          src="/was-logo.min.webp"
          alt="logo"
          style={{
            width: 120,
            opacity: 0.65,
          }}
        />
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
            marginBottom: 6,
          }}
        >
          Pet Insurance Quote
        </h2>

        <p
          style={{
            color: "#666",
            marginTop: 0,
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
              <h3
                style={{
                  color: "#111",
                  fontSize: 16,
                  marginBottom: 20,
                }}
              >
                Pet {index + 1}
              </h3>

              {/* PET TYPE */}
              <div>
                <span style={labelStyle}>
                  Your pet is a:
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
                        pet.petType === "cat"
                      ),
                      border: petError?.petType
                        ? "2px solid red"
                        : "1px solid #ddd",
                    }}
                    onClick={() => {
                      updatePet(index, {
                        petType: "cat",
                        breed: "",
                      });
                    }}
                  >
                    🐱 Cat
                  </button>

                  <button
                    type="button"
                    style={{
                      ...buttonStyle(
                        pet.petType === "dog"
                      ),
                      border: petError?.petType
                        ? "2px solid red"
                        : "1px solid #ddd",
                    }}
                    onClick={() => {
                      updatePet(index, {
                        petType: "dog",
                        breed: "",
                      });
                    }}
                  >
                    🐶 Dog
                  </button>
                </div>

                {petError?.petType && (
                  <p
                    style={{
                      color: "red",
                      fontSize: 12,
                      marginTop: 6,
                    }}
                  >
                    Please select Cat or Dog
                  </p>
                )}
              </div>

              {/* GENDER */}
              <div style={{ marginTop: 25 }}>
                <span style={labelStyle}>
                  Gender:
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
                        ? "2px solid red"
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
                        ? "2px solid red"
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
                    options={options.filter(
                      (option) =>
                        !pet.petType ||
                        option.petType.toLowerCase() ===
                          pet.petType
                    )}
                    value={
                      options.find(
                        (option) =>
                          option.value === pet.breed
                      ) || null
                    }
                    onChange={(selected) => {
                      updatePet(index, {
                        breed:
                          selected?.value || "",
                      });
                    }}
                    styles={selectStyles}
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
            padding: 14,
            borderRadius: 10,
            border: "none",
            background: "#eaac2a",
            color: "#111",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          + Add Another Pet
        </button>

        {/* =========================
            SHARED ADDRESS
        ========================== */}

        <div style={{ marginTop: 20 }}>
          <label style={labelStyle}>
            Home Address
          </label>

          <input
            value={address}
            onChange={(e) => {
              setAddress(e.target.value);

              if (e.target.value.trim() !== "") {
                setAddressError(false);
              }
            }}
            placeholder="e.g. Brisbane, QLD"
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 10,
              border: addressError
                ? "1px solid red"
                : "1px solid #ddd",
              color: "#111",
              outline: "none",
            }}
          />

          {addressError && (
            <p
              style={{
                color: "red",
                fontSize: 12,
                marginTop: 6,
              }}
            >
              Home Address is required
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