import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { master_policy_id, email } = await req.json();

    if (!master_policy_id || !email) {
      return NextResponse.json(
        {
          error: "master_policy_id and email are required"
        },
        { status: 400 }
      );
    }

    const statement = db.prepare(`
      INSERT INTO policies (
        master_policy_id,
        email
      )
      VALUES (?, ?)
    `);

    statement.run(master_policy_id, email);

    return NextResponse.json({
      success: true,
      master_policy_id
    });

  } catch (error) {
    console.error("Error creating policy:", error);

    return NextResponse.json(
      {
        error: "Failed to create policy"
      },
      { status: 500 }
    );
  }
}