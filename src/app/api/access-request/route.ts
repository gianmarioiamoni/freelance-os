// src/app/api/access-request/route.ts
import { requestAccess } from "@/application/access-request/request-access";
import { NextResponse, type NextRequest } from "next/server";

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 },
      );
    }

    const result = await requestAccess({ email });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Access request error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
