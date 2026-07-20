"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME, signSessionCookie, verifyPasscode } from "@/lib/auth/passcode";

export type LoginState = { error?: string } | undefined;

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const passcode = String(formData.get("passcode") ?? "");

  if (!verifyPasscode(passcode)) {
    return { error: "Incorrect passcode." };
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, signSessionCookie(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });

  redirect("/dashboard");
}
