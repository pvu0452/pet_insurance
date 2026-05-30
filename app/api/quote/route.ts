import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const data = await req.json();

  const {
    petType,
    age,
    breed,
    gender,
    plan,
    excess,
    limit,
    benefit,
    address,
  } = data;

  // TEMP LOGIC (placeholder)
  let base = plan === "basic" ? 30 : plan === "upgraded" ? 45 : 60;

  if (petType === "dog") base *= 1.15;
  if (age > 7) base *= 1.2;
  if (excess === 100) base *= 1.25;
  if (excess === 500) base *= 0.85;
  if (benefit === 90) base *= 1.2;
  if (limit === 30000) base *= 1.1;

  const price = Math.round(base);

  return NextResponse.json({
    price,
    received: data, // useful for debugging + demo
  });
}