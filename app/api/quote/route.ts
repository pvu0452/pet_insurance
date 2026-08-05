import { NextResponse } from "next/server";
const API_URL =
  "https://api4pet-dev-msac6e2qpq-ts.a.run.app";


export async function POST(req: Request) {

  const data = await req.json();


  const {
    petType,
    dob,
    breed,
    gender,
    plan,
    excess,
    limit,
    benefit,
    address,
  } = data;


  function calculateAge(dob:string){

    const birthDate = new Date(dob);
    const today = new Date();

    let age =
      today.getFullYear() -
      birthDate.getFullYear();


    const monthDifference =
      today.getMonth() -
      birthDate.getMonth();


    if(
      monthDifference < 0 ||
      (
        monthDifference === 0 &&
        today.getDate() < birthDate.getDate()
      )
    ){
      age--;
    }


    return age;

  }


  const age = calculateAge(dob);



  let base =
    plan === "basic"
      ? 30
      : plan === "upgraded"
      ? 45
      : 60;


  if (petType === "dog")
    base *= 1.15;


  if (age > 7)
    base *= 1.2;


  if (excess === 100)
    base *= 1.25;


  if (excess === 500)
    base *= 0.85;


  if (benefit === 70)
    base *= 0.9;


  if (benefit === 90)
    base *= 1.2;


  if (limit === 30000)
    base *= 1.1;


  const price = Math.round(base);


  return NextResponse.json({
    price,
    received:data,
    calculatedAge:age
  });

}