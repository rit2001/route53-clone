import { Suspense } from "react";

import { AuthLoadingScreen } from "@/components/auth/auth-loading-screen";
import { LoginForm } from "@/components/auth/login-form";

export const metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <Suspense fallback={<AuthLoadingScreen />}>
      <LoginForm />
    </Suspense>
  );
}
