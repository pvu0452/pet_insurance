"use client";

import React, { useEffect, useState } from "react";
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
}

export default function DetailsPage() {

  const [loadingBreeds, setLoadingBreeds] = useState(true);
  const [options, setOptions] = useState<Option[]>([]);
  const [selectedOption, setSelectedOption] = useState("");
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
  bg-white
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
  });


  const [pets, setPets] = useState<Pet[]>([
  {
    name: "",
    petType: null,
    gender: null,
    breed: "",
    dob: "",
  }
]);


  const [cover, setCover] = useState<any>(null);


  const [paymentMethod, setPaymentMethod] = useState("card");

  // Credit card details
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");

  // Direct debit details
  const [bsb, setBsb] = useState("");
  const [accountNumber, setAccountNumber] = useState("");

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [coverConfirmed, setCoverConfirmed] = useState(false);


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


 useEffect(() => {
  setMounted(true);
  fetchOptions();

  const storedCover = sessionStorage.getItem("cover");
  const storedPet = sessionStorage.getItem("petDetails");


  console.log("COVER STORAGE:", storedCover);
  console.log("PET STORAGE:", storedPet);


  if (storedCover) {
    setCover(JSON.parse(storedCover));
  }


  if (storedPet) {

    const petData = JSON.parse(storedPet);

    console.log("PET DATA PARSED:", petData);


    setPets([{
      name: petData.pets[0]?.name || "",
      petType: petData.pets[0]?.petType || "",
      breed: petData.pets[0]?.breed || "",
      dob: petData.pets[0]?.dob || "",
      gender: petData.pets[0]?.gender || "",
    }]);


    setCustomer(prev => ({
      ...prev,
      address: petData.address || "",
    }));

  }


}, []);

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


  async function confirmPayment(){

    if(!termsAccepted || !coverConfirmed){
      alert("Please accept all acknowledgements");
      return;
    }

    const checkoutData = {

      customer,
      pets,
      cover,

      payment:
        paymentMethod === "card"
          ? {
              method: "card",
              cardNumber,
              expiry,
              cvv,
            }
          : {
              method: "direct",
              bsb,
              accountNumber,
            }

    };


    sessionStorage.setItem(
      "checkout",
      JSON.stringify(checkoutData)
    );

    alert("Checkout ready for Stripe");
    const res = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: {
      "Content-Type": "application/json",
      },
      body: JSON.stringify({
        unit_amount: (cover?.price * 100),
        productName: "Pet Insurance Quote",
      }),
    });
    
    const data = await res.json();
    
    window.location.href = data.url;
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
className="w-28 opacity-70 mb-5"
/>



{/* Progress */}

<div className="mb-8">

<div className="flex justify-between text-xs text-gray-500 mb-2">

{
steps.map(step=>(
<span key={step}>{step}</span>
))
}

</div>


<div className="h-2 bg-gray-200 rounded-full">

<div
className="h-2 bg-gray-800 rounded-full"
style={{
width:`${progress}%`
}}
/>

</div>

</div>





{/* CUSTOMER */}

<Section title="Your Details">


<div className="space-y-4">

<FormField label="Full Name">

<input
value={customer.name}
onChange={(e)=>
setCustomer({
...customer,
name:e.target.value
})
}
className={inputStyle}
/>

</FormField>



<FormField label="Mobile Number">

<input
value={customer.mobile}
onChange={(e)=>
setCustomer({
...customer,
mobile:e.target.value
})
}
className={inputStyle}
/>

</FormField>




<FormField label="Email">

<input
value={customer.email}
onChange={(e)=>
setCustomer({
...customer,
email:e.target.value
})
}
className={inputStyle}
/>

</FormField>




<FormField label="Address">

<input
value={customer.address}
onChange={(e)=>
setCustomer({
...customer,
address:e.target.value
})
}
className={inputStyle}
/>

</FormField>

</div>


</Section>






{/* PET */}

<Section title="Your Pet">


<div className="grid grid-cols-2 gap-4">


<FormField label="Pet Name">

<input
  value={pets[0]?.name ?? ""}
  onChange={(e) =>
    setPets([
      {
        ...pets[0],
        name: e.target.value
      }
    ])
  }
  className={inputStyle}
/>

</FormField>



<FormField label="Species">

<input
  value={pets[0]?.petType ?? ""}
  readOnly
  className={inputStyle}
/>

</FormField>


</div>




<FormField label="Breed">
  <Select<Option, false>
    options={options.filter(
      (option) =>
        !pets[0]?.petType ||
        option.petType?.toLowerCase() === pets[0]?.petType?.toLowerCase()
    )}
    value={
      options.find(
        (option) => option.value === pets[0]?.breed
      ) || null
    }
    onChange={(selected) => {
      setPets([
        {
          ...pets[0],
          breed: selected?.value || "",
        }
      ]);
    }}
    //styles={selectStyles}
    isLoading={loadingBreeds}
    placeholder="Select your pet's breed"
    noOptionsMessage={() =>
      loadingBreeds
        ? "Loading breeds..."
        : "No breeds found"
    }
    className={inputStyle}
  />

</FormField>



<div className="grid grid-cols-2 gap-4">


<FormField label="Date of Birth">

<input
  value={pets[0]?.dob ?? ""}
readOnly
className={inputStyle}
/>

</FormField>



<FormField label="Sex">

<input
  value={pets[0]?.gender ?? ""}
readOnly
className={inputStyle}
/>

</FormField>


</div>



</Section>







{/* COVER */}

<Section title="Your Cover">


<div className="
bg-white
border
border-gray-200
rounded-xl
p-4
space-y-3
">


<Row label="Plan" value={cover?.plan}/>

<Row 
label="Monthly Cost"
value={`$${cover?.price || "-"}`}
/>


<Row
label="Annual Benefit Limit"
value={cover?.limit}
/>


<Row
label="Annual Excess"
value={cover?.excess}
/>


<Row
label="Benefit Percentage"
value={`${cover?.benefit || "-"}%`}
/>


</div>


</Section>







{/* PAYMENT */}

<Section title="Payment Method">


<div className="grid grid-cols-2 gap-4">


<button

onClick={()=>setPaymentMethod("card")}

className={`
border
rounded-xl
p-4
text-left
text-gray-900
transition
${
paymentMethod==="card"
?
"border-gray-800 bg-gray-100"
:
"border-gray-300 bg-white"
}
`}
>

💳

<div className="font-semibold">
Credit Card
</div>

</button>




<button

onClick={()=>setPaymentMethod("direct")}

className={`
border
rounded-xl
p-4
text-left
text-gray-900
transition
${
paymentMethod==="direct"
?
"border-gray-800 bg-gray-100"
:
"border-gray-300 bg-white"
}
`}
>

🏦

<div className="font-semibold">
Direct Debit
</div>

</button>


</div>




{
paymentMethod==="card" &&

<div className="mt-4 space-y-4">

<FormField label="Card Number">

<input
value={cardNumber}
onChange={(e)=>setCardNumber(e.target.value)}
className={inputStyle}
placeholder="1234 5678 9012 3456"
/>

</FormField>


<div className="grid grid-cols-2 gap-4">

<FormField label="Expiry Date">

<input
value={expiry}
onChange={(e)=>setExpiry(e.target.value)}
className={inputStyle}
placeholder="MM/YY"
/>

</FormField>


<FormField label="CVV">

<input
value={cvv}
onChange={(e)=>setCvv(e.target.value)}
className={inputStyle}
placeholder="123"
/>

</FormField>

</div>

</div>

}



{
paymentMethod==="direct" &&

<div className="mt-4 space-y-4">

<FormField label="BSB">

<input
value={bsb}
onChange={(e)=>setBsb(e.target.value)}
className={inputStyle}
placeholder="123-456"
/>

</FormField>


<FormField label="Account Number">

<input
value={accountNumber}
onChange={(e)=>setAccountNumber(e.target.value)}
className={inputStyle}
placeholder="12345678"
/>

</FormField>


</div>

}


</Section>






{/* ACK */}

<Section title="Acknowledgements">


<ul className="text-sm text-gray-600 space-y-2">

<li>✓ Payment selection matches chosen plan.</li>
<li>✓ Cover terms and conditions accepted.</li>
<li>✓ Data policy and privacy terms accepted.</li>
<li>✓ Selected benefits have been reviewed.</li>

</ul>



<label className="flex gap-2 mt-5 text-sm">

<input
type="checkbox"
checked={termsAccepted}
onChange={(e)=>setTermsAccepted(e.target.checked)}
/>

I agree to the terms and privacy policy.

</label>



<label className="flex gap-2 mt-3 text-sm">

<input
type="checkbox"
checked={coverConfirmed}
onChange={(e)=>setCoverConfirmed(e.target.checked)}
/>

I confirm my cover details are correct.

</label>



</Section>






<button

onClick={confirmPayment}

className="
w-full
bg-gray-800
text-white
py-3
rounded-xl
font-semibold
mt-6
"

>

Confirm and Pay

</button>



</div>

</div>

);

}







function Section({
title,
children
}:{
title:string;
children:React.ReactNode;
}){


return (

<div className="
bg-white
rounded-xl
border
border-gray-200
p-5
mb-5
">


<h2 className="
font-semibold
text-lg
mb-4
text-gray-900
">

{title}

</h2>


{children}


</div>

);

}





function FormField({
  label,
  children
}:{
  label:string;
  children:React.ReactNode;
}){

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





function Row({
label,
value
}:{
label:string;
value:any;
}){


return (

<div className="
flex
justify-between
text-sm
">

<span className="text-gray-700">
{label}
</span>

<span className="
font-semibold
text-gray-900
">
{value || "-"}
</span>

</div>

);

}