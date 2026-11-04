// src/app/api/auth/[...all]/route.ts
import { toNextJsHandler } from "better-auth/next-js";
import { type NextRequest, NextResponse } from "next/server";

import { auth } from "@/infrastructure/auth/auth";

const handler = toNextJsHandler(auth);

async function GET(request: NextRequest): Promise<Response> {
  const response = await handler.GET(request);
  
  // Intercept Google callback errors
  if (request.nextUrl.pathname.includes("/callback/google")) {
    // Check if the response is a redirect with error
    if (response.status === 302 || response.status === 307) {
      const location = response.headers.get("location");
      if (location) {
        const url = new URL(location, request.url);
        // Better Auth redirects to callbackURL, check if there's an error in the flow
        // If redirect is to root/landing without session, it means signup was blocked
        if (url.pathname === "/" || url.pathname === "") {
          return NextResponse.redirect(
            new URL("/sign-in?error=SIGNUP_DISABLED", request.url),
          );
        }
      }
    }
  }
  
  return response;
}

async function POST(request: NextRequest): Promise<Response> {
  return handler.POST(request);
}

export { GET, POST };
