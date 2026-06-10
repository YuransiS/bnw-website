import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { type EmailOtpType } from "@supabase/supabase-js";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/admin";

  const redirectTo = new URL(next, request.url);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(redirectTo);
    }
  }
  
  if (token_hash) {
    const supabase = await createClient();
    // Cycle through possible OTP types to verify token securely without requiring local PKCE verifier cookie
    const typesToTry: EmailOtpType[] = type 
      ? [type] 
      : ["signup", "invite", "magiclink", "recovery", "email_change"];
      
    for (const t of typesToTry) {
      const { error } = await supabase.auth.verifyOtp({
        type: t,
        token_hash,
      });
      if (!error) {
        return NextResponse.redirect(redirectTo);
      }
    }
  }

  // Return the user to an error page with instructions
  const errorRedirect = new URL("/admin/login?error=auth-callback-failed", request.url);
  return NextResponse.redirect(errorRedirect);
}
