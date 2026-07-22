"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [petType, setPetType] = useState<"cat" | "dog" | null>(null);
  const [gender, setGender] = useState<"male" | "female" | null>(null);
  const [breed, setBreed] = useState("");
  const [dob, setDob] = useState("");
  const [address, setAddress] = useState<string>("");
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];
  const [errors, setErrors] = useState({
  petType: false,
  gender: false,
  breed: false,
  dob: false,
  address: false,
});

  {/* Click generate quote button behaviour */}
  const handleSubmit = () => {

    const isValid = validate();

    console.log({
      petType,
      gender,
      breed,
      dob,
      address,
      isValid
    });


    if (!isValid) return;


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


    console.log(
      "Saved:",
      sessionStorage.getItem("petDetails")
    );


    router.push("/plans");
  };

  const validate = () => {
    const newErrors = {
      petType: petType === null,
      gender: gender === null,
      breed: breed.trim() === "",
      dob: dob.trim() === "",
      address: address.trim() === "",
    };

    setErrors(newErrors);

    return !Object.values(newErrors).includes(true);
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

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "#ffffff",
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
              onClick={() => setPetType("cat")}
            >
              🐱 Cat
            </button>

            <button
              style={{
                ...buttonStyle(petType === "dog"),
                border: errors.petType ? "2px solid red" : "1px solid #ddd",
              }}
              onClick={() => setPetType("dog")}
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
          <input
            value={breed}
            onChange={(e) => setBreed(e.target.value)}
            placeholder="e.g. Golden Retriever"
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 10,
              border: errors.breed ? "1px solid red" : "1px solid #ddd",
              color: "#111",
              outline: "none",
            }}
          />
          {errors.breed && (
            <p style={{ color: "red", fontSize: 12, marginTop: 6 }}>
              Breed is required
            </p>
          )}
        </div>

        {/* DOB */}
        <div style={{ marginTop: 20 }}>
          <label style={labelStyle}>Date of Birth</label>
          <input
            type="date"
            value={dob}
            max={today}
            onChange={(e) => setDob(e.target.value)}
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
              Date of Birth is required
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