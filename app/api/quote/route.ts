import { NextResponse } from "next/server";


const API_URL =
  "https://api4pet-dev-msac6e2qpq-ts.a.run.app";


export async function POST(req: Request) {

  try {

    console.log("🔥 NEW QUOTE ROUTE HIT");

    const data = await req.json();

    console.log("REQUEST SENT TO WAS:");
    console.log(data);


    const response = await fetch(
      `${API_URL}/api/v1/quote/price`,
      {
        method: "POST",
        headers:{
          "Content-Type":"application/json",
        },
        body: JSON.stringify(data),
      }
    );


    const result = await response.json();


    console.log("WAS RESPONSE:");
    console.log(result);


    if(!response.ok){

      return NextResponse.json(
        {
          error:true,
          message:
            result.message ||
            "Quote request failed"
        },
        {
          status:response.status
        }
      );

    }


    return NextResponse.json(result);


  } catch(error){

    console.error("ROUTE ERROR:", error);

    return NextResponse.json(
      {
        error:true,
        message:"Internal server error"
      },
      {
        status:500
      }
    );

  }

}