"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const getErrorMessage = () => {
    switch (error) {
      case "Configuration":
        return "There is a problem with the server configuration.";
      case "AccessDenied":
        return "Access denied. You do not have permission to sign in.";
      case "Verification":
        return "The verification token has expired or has already been used.";
      case "OAuthSignin":
        return "Error in constructing an authorization URL.";
      case "OAuthCallback":
        return "Error in handling the response from an OAuth provider.";
      case "OAuthCreateAccount":
        return "Could not create OAuth provider user in the database.";
      case "EmailCreateAccount":
        return "Could not create email provider user in the database.";
      case "Callback":
        return "Error in the OAuth callback handler route.";
      case "OAuthAccountNotLinked":
        return "Email already associated with another account.";
      case "EmailSignin":
        return "Sending the email with the verification token failed.";
      case "CredentialsSignin":
        return "Sign in failed. Check the details you provided are correct.";
      case "SessionRequired":
        return "Please sign in to access this page.";
      default:
        return "An error occurred during authentication.";
    }
  };

  return (
    <Card className="w-full max-w-md bg-zinc-900 border-zinc-800">
      <CardHeader className="space-y-1">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-6 w-6 text-red-500" />
          <CardTitle className="text-2xl font-bold text-zinc-100">
            Authentication Error
          </CardTitle>
        </div>
        <CardDescription className="text-zinc-400">
          {getErrorMessage()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-zinc-500">
          If this problem persists, please contact support.
        </p>
      </CardContent>
      <CardFooter className="flex gap-2">
        <Link href="/auth/signin" className="flex-1">
          <Button className="w-full bg-cyan-500 hover:bg-cyan-600">
            Try Again
          </Button>
        </Link>
        <Link href="/" className="flex-1">
          <Button variant="outline" className="w-full border-zinc-700">
            Go Home
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
      <Suspense fallback={<div>Loading...</div>}>
        <ErrorContent />
      </Suspense>
    </div>
  );
}
