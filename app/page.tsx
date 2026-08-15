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

export default function Home() {
  const [options, setOptions] = useState<Option[]>([]);
  const [selectedOption, setSelectedOption] = useState<Option | null>(null);
  const [petType, setPetType] = useState<"cat" | "dog" | null>(null);
  const [gender, setGender] = useState<"male" | "female" | null>(null);
  const [breed, setBreed] = useState("");
  const [dob, setDob] = useState("");
  const [address, setAddress] = useState<string>("");
  const router = useRouter();
  
  const [errors, setErrors] = useState({
  petType: false,
  gender: false,
  breed: false,
  dob: "",
  address: false,
  
});

  {/* Click generate quote button behaviour */}
  const handleSubmit = () => {
    const newErrors = {
      petType: petType === null,
      gender: gender === null,
      breed: breed.trim() === "",
      dob: "",
      address: address.trim() === "",
    };

    // DOB validation
    if (dob === "") {
      newErrors.dob = "Date of Birth is required";
    } else {
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      const minimumDob = fourteenDaysAgo.toISOString().split("T")[0];

      console.log("Selected DOB:", dob);
      console.log("Minimum DOB:", minimumDob);

      if (dob > minimumDob) {
        newErrors.dob = "Your pet must be at least 14 days old";
      }
    }

    // SHOW ERRORS ON SCREEN
    setErrors(newErrors);

    // STOP if there is ANY error
    if (
      newErrors.petType ||
      newErrors.gender ||
      newErrors.breed ||
      newErrors.dob ||
      newErrors.address
    ) {
      return;
    }

    // Save valid details
    sessionStorage.setItem(
      "petDetails",
      JSON.stringify({
        petType,
        gender,
        breed,
        dob,
        address,
      })
    );

    // Go to plans ONLY if valid
    router.push("/plans");
  };

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

  const labelStyle = {
    color: "#111",
    fontSize: 14,
    marginBottom: 6,
    display: "block",
    };

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
            backgroundColor: state.isFocused ? "#f3f3f3" : "#fff",
            cursor: "pointer",
        }),
    };
    const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchOptions();
  }, []);
  const fetchOptions = async () => {
    try {
      const response = await fetch("https://api4pet-dev-msac6e2qpq-ts.a.run.app/api/v1/category/pet-breed");
      if (!response.ok) {
        throw new Error("Failed to fetch options");
      }
      const data = await response.json();
      
    const options = data.data.map((item: any) => ({
        value: item.breed_name,
        label: `${item.breed_name} (${item.pet_type})`,
        petType: item.pet_type,
        petBreed: item.breed_name
      }))
      .sort((a: Option, b: Option) =>
      a.petBreed.localeCompare(b.petBreed)
      );
      
    setOptions(options);
    } catch (err) {
      console.error(err);
    }
  }

  const filteredBreedOptions = options.filter(
    (option) =>
      !petType ||
      option.petType.toLowerCase() === petType
  );
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
      {/* LOGO (outside card) */}
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
        <h2 style={{ color: "#111", marginBottom: 6 }}>
          Pet Insurance Quote
        </h2>

        <p style={{ color: "#666", marginTop: 0 }}>
          Enter your pet details to generate a quote
        </p>

        {/* PET TYPE */}
        <div style={{ marginTop: 25 }}>
          <span style={labelStyle}>Your pet is a:</span>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              style={{
                ...buttonStyle(petType === "cat"),
                border: errors.petType ? "2px solid red" : "1px solid #ddd",
              }}
              onClick={() => {
                setPetType("cat");
                setSelectedOption(null);
                setBreed("");
              }}
            >
              🐱 Cat
            </button>

            <button
              style={{
                ...buttonStyle(petType === "dog"),
                border: errors.petType ? "2px solid red" : "1px solid #ddd",
              }}
              onClick={() => {
                setPetType("dog");
                setSelectedOption(null);
                setBreed("");
              }}
            >
              🐶 Dog
            </button>
            </div>
            {errors.petType && (
              <p style={{ color: "red", fontSize: 12, marginTop: 6 }}>
                Please select Cat or Dog
              </p>
            )}
          </div>

        {/* GENDER */}
        <div style={{ marginTop: 25 }}>
        <span style={labelStyle}>Gender:</span>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            style={{
              ...buttonStyle(gender === "male"),
              border: errors.gender ? "2px solid red" : "1px solid #ddd",
            }}
            onClick={() => setGender("male")}
          >
            ♂ Male
          </button>

          <button
            style={{
              ...buttonStyle(gender === "female"),
              border: errors.gender ? "2px solid red" : "1px solid #ddd",
            }}
            onClick={() => setGender("female")}
          >
            ♀ Female
          </button>
        </div>

        {errors.gender && (
          <p style={{ color: "red", fontSize: 12, marginTop: 6 }}>
            Please select Male or Female
          </p>
        )}
      </div>

        {/* BREED */}
        <div style={{ marginTop: 25 }}>
          <label style={labelStyle}>Breed</label>
            {mounted && (
              <Select<Option, false>
                options={filteredBreedOptions}
                value={selectedOption}
                onChange={(e) => {
                  setSelectedOption(e);
                  setBreed(e?.value || "");
                }}
                styles={selectStyles}
              />
            )}
          {errors.breed && (
            <p style={{ color: "red", fontSize: 12, marginTop: 6 }}>
              Breed is required
            </p>
          )}
        </div>

        {/* DOB */}
        <div style={{ marginTop: 20 }}>
          <label style={labelStyle}>Pet's Date of Birth</label>

          <input
            type="date"
            value={dob}
            onChange={(e) => {
              const selectedDob = e.target.value;
              setDob(selectedDob);

              if (selectedDob === "") {
                setErrors((prev) => ({
                  ...prev,
                  dob: "Date of Birth is required",
                }));
                return;
              }

              const today = new Date();
              today.setHours(0, 0, 0, 0);

              const minimumDobDate = new Date(today);
              minimumDobDate.setDate(today.getDate() - 14);

              const selectedDate = new Date(selectedDob + "T00:00:00");

              if (selectedDate > minimumDobDate) {
                setErrors((prev) => ({
                  ...prev,
                  dob: "Your pet must be at least 14 days old",
                }));
              } else {
                setErrors((prev) => ({
                  ...prev,
                  dob: "",
                }));
              }
            }}
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 10,
              border: errors.dob ? "1px solid red" : "1px solid #ddd",
              color: "#111",
              outline: "none",
            }}
          />

          {errors.dob && (
            <p style={{ color: "red", fontSize: 12, marginTop: 6 }}>
              {errors.dob}
            </p>
          )}
        </div>

        {/* ADDRESS */}
        <div style={{ marginTop: 20 }}>
          <label style={labelStyle}>Home Address</label>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="e.g. Brisbane, QLD"
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 10,
              border: errors.address ? "1px solid red" : "1px solid #ddd",
              color: "#111",
              outline: "none",
            }}
          />
          {errors.address && (
            <p style={{ color: "red", fontSize: 12, marginTop: 6 }}>
              Home Address is required
            </p>
          )}
        </div>

        {/* SUBMIT */}
        <button
          onClick={handleSubmit}
          style={{
            marginTop: 30,
            width: "100%",
            padding: 14,
            borderRadius: 10,
            border: "none",
            background: "#111",
            color: "#fff",
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