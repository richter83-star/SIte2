"use client";

import { Suspense } from "react";
import SignInForm from "./signin-form";

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-zinc-950">Loading...</div>}>
      <SignInForm />
    </Suspense>
  );
}
