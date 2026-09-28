import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function POST(req: Request) {
  try {
    const {
      policy_id,
      name,
      breed,
      dob,
      master_policy_id,
      pet_type
    } = await req.json();

    if (
      !policy_id ||
      !name ||
      !breed ||
      !dob ||
      !master_policy_id ||
      !pet_type
    ) {
      return NextResponse.json(
        {
          error: "All pet fields are required"
        },
        { status: 400 }
      );
    }

    const statement = db.prepare(`
      INSERT INTO pets (
        policy_id,
        name,
        breed,
        dob,
        master_policy_id,
        pet_type
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    statement.run(
      policy_id,
      name,
      breed,
      dob,
      master_policy_id,
      pet_type
    );

    return NextResponse.json({
      success: true,
      policy_id
    });

  } catch (error) {
    console.error("Error creating pet:", error);

    return NextResponse.json(
      {
        error: "Failed to create pet"
      },
      { status: 500 }
    );
  }
}