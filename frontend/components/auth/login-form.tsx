"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { AuthLoadingScreen } from "@/components/auth/auth-loading-screen";
import { useAuth } from "@/components/auth/auth-provider";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { Spinner } from "@/components/ui/spinner";
import { isApiError } from "@/lib/api/errors";
import { getSafeInternalPath } from "@/lib/auth/redirects";

const DEMO_EMAIL = "demo@route53.local";
const DEMO_PASSWORD = "Route53Demo123!";

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Enter your email address.")
    .max(320, "Email must be 320 characters or fewer.")
    .email("Enter a valid email address."),
  password: z
    .string()
    .min(1, "Enter your password.")
    .max(1024, "Password must be 1024 characters or fewer."),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, status } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const destination = getSafeInternalPath(searchParams.get("next"));
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    if (status === "authenticated") {
      router.replace(destination);
    }
  }, [destination, router, status]);

  async function submit(values: LoginFormValues) {
    try {
      await login(values);
      router.replace(destination);
    } catch (error) {
      const message = isApiError(error)
        ? error.message
        : "Sign-in failed. Please try again.";
      setError("root", { type: "server", message });
    }
  }

  function useDemoCredentials() {
    setValue("email", DEMO_EMAIL, { shouldDirty: true, shouldValidate: true });
    setValue("password", DEMO_PASSWORD, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  if (status === "loading" || status === "authenticated") {
    return <AuthLoadingScreen />;
  }

  return (
    <main className="flex min-h-screen bg-[var(--page-background)]">
      <div className="hidden w-[38%] max-w-xl flex-col justify-between bg-[var(--global-header)] p-10 text-white lg:flex">
        <div>
          <p className="text-sm font-semibold tracking-wide text-slate-300">
            Cloud Console
          </p>
          <h1 className="mt-14 max-w-md text-3xl font-semibold leading-tight">
            Route 53 Clone
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-6 text-slate-300">
            An original infrastructure-management console for mocked hosted
            zones and DNS record sets.
          </p>
        </div>
        <p className="text-xs leading-5 text-slate-400">
          Demonstration environment · No real AWS account or DNS infrastructure
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center p-4 sm:p-8">
        <section
          aria-labelledby="login-heading"
          className="w-full max-w-md rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-panel)]"
        >
          <div className="border-b border-[var(--border)] px-6 py-5">
            <div className="mb-3 flex items-center gap-2 lg:hidden">
              <LockKeyhole
                aria-hidden="true"
                className="size-5 text-[var(--primary)]"
              />
              <span className="text-sm font-semibold">Route 53 Clone</span>
            </div>
            <h2 className="text-xl font-semibold" id="login-heading">
              Sign in to the mock cloud console
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Use the public demo account to access the assignment.
            </p>
          </div>

          <form
            className="space-y-4 px-6 py-5"
            noValidate
            onSubmit={(event) => void handleSubmit(submit)(event)}
          >
            {errors.root?.message ? (
              <ErrorAlert
                message={errors.root.message}
                title="Sign-in failed"
              />
            ) : null}

            <div>
              <label className="field-label" htmlFor="email">
                Email
              </label>
              <input
                aria-describedby={errors.email ? "email-error" : undefined}
                aria-invalid={Boolean(errors.email)}
                autoComplete="username"
                className="text-input"
                id="email"
                maxLength={320}
                type="email"
                {...register("email")}
              />
              {errors.email ? (
                <p className="field-error" id="email-error">
                  {errors.email.message}
                </p>
              ) : null}
            </div>

            <div>
              <label className="field-label" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <input
                  aria-describedby={
                    errors.password ? "password-error" : undefined
                  }
                  aria-invalid={Boolean(errors.password)}
                  autoComplete="current-password"
                  className="text-input pr-10"
                  id="password"
                  maxLength={1024}
                  type={showPassword ? "text" : "password"}
                  {...register("password")}
                />
                <button
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-0 inline-flex w-10 items-center justify-center text-[var(--muted)] hover:text-[var(--text)]"
                  onClick={() => setShowPassword((visible) => !visible)}
                  type="button"
                >
                  {showPassword ? (
                    <EyeOff aria-hidden="true" className="size-4" />
                  ) : (
                    <Eye aria-hidden="true" className="size-4" />
                  )}
                </button>
              </div>
              {errors.password ? (
                <p className="field-error" id="password-error">
                  {errors.password.message}
                </p>
              ) : null}
            </div>

            <button
              className="primary-button w-full"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? (
                <>
                  <Spinner label="Signing in" />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </button>

            <button
              className="secondary-button w-full"
              disabled={isSubmitting}
              onClick={useDemoCredentials}
              type="button"
            >
              Use demo credentials
            </button>
          </form>

          <div className="border-t border-[var(--border)] bg-[var(--surface-subtle)] px-6 py-4 text-xs leading-5 text-[var(--muted)]">
            <p className="font-semibold text-[var(--text)]">
              Public mocked credentials
            </p>
            <p>Email: {DEMO_EMAIL}</p>
            <p>Password: {DEMO_PASSWORD}</p>
            <p className="mt-1">
              These credentials are assignment fixtures, not a production
              secret.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
