"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { Mail, Smartphone } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { PasswordField, TextField } from "@/components/auth/Fields";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { Welcome, describeError, useAuthFlow } from "@/components/auth/useAuthFlow";
import { authClient, authMode, detectIdentifierKind, googleClientId, mobileSignInUnavailable, notConnectedMessage, validateIdentifier } from "@/lib/auth";
import styles from "@/components/auth/Auth.module.css";

type Errors = Partial<Record<"email" | "password", string>>;

/** Sign in with email and password, or continue with Google. */
export function LoginView() {
  const { fromCheckout, welcome, finish, query } = useAuthFlow();
  const [email, setEmail] = useState(""); // the email address or mobile number, whichever the person types
  const [touched, setTouched] = useState(false);
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async (task: () => Promise<void>) => {
    setFormError("");
    setNotice("");
    setBusy(true);
    try {
      await task();
    } catch (error) {
      const { message, errors: fieldErrors } = describeError(error);
      setErrors({ email: fieldErrors.email, password: fieldErrors.password });
      // a message that belongs to an input is shown at that input; everything else at the top of the form
      if (!fieldErrors.email && !fieldErrors.password) setFormError(message);
    } finally {
      setBusy(false);
    }
  };

  const kind = detectIdentifierKind(email);
  // The "not available" notice shows from the first digit or "+", and goes the moment a letter or "@" is typed. The keyboard is
  // always the email one (it has digits, letters and "@"), so a digit-leading email can always be typed.
  const isMobile = kind === "mobile";
  // No email error while typing: it appears after leaving the box (or on submit). A mobile value only ever gets the notice.
  const blurError = email.trim() && touched && !isMobile ? validateIdentifier(email) : "";

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget; // currentTarget is null once the handler returns, so keep the form for the animation frame
    // Interim: the store signs in with email and password only. A mobile number is never sent to the server.
    const idError = validateIdentifier(email); // for a mobile value this is the same "not available" notice
    const found: Errors = { email: idError || undefined, password: password ? undefined : "Enter your password." };
    setErrors(found);
    if (found.email || found.password) {
      requestAnimationFrame(() => form.querySelector<HTMLElement>("[aria-invalid=true]")?.focus());
      return;
    }
    void run(async () => finish(await authClient.signIn(email.trim().toLowerCase(), password)));
  };

  const onGoogle = (credential: string) => void run(async () => finish(await authClient.signInWithGoogle(credential)));

  return (
    <AuthShell>
      {welcome ? (
        <Welcome {...welcome} />
      ) : (
        <>
          <h1 className={styles.title}>Welcome back</h1>
          <p className={styles.lead}>{fromCheckout ? "Please sign in to continue to checkout. Your bag is saved." : "Sign in to track your orders, save addresses and try sarees on with AI."}</p>

          {authMode === "off" && <p className={styles.notice} role="status">{notConnectedMessage}</p>}

          <GoogleButton text="signin_with" clientId={googleClientId} disabled={busy} onCredential={onGoogle} onUnavailable={setNotice} />
          <div className={styles.divider}>or sign in with email</div>

          <form className={styles.form} onSubmit={submit} noValidate>
            {formError && <p className={styles.alert} role="alert">{formError}</p>}
            {notice && <p className={styles.notice} role="status">{notice}</p>}
            <TextField
              label={kind === "mobile" ? "Mobile number" : kind === "email" ? "Email address" : "Email or mobile number"}
              type="text"
              value={email}
              onChange={(event) => { setEmail(event.target.value); setTouched(false); setErrors((current) => ({ ...current, email: undefined })); }}
              onBlur={() => setTouched(true)}
              placeholder="you@example.com"
              autoComplete="username"
              inputMode="email"
              autoCapitalize="none"
              spellCheck={false}
              data-kind={kind}
              icon={kind === "mobile" ? <Smartphone size={18} data-icon="mobile" /> : <Mail size={18} data-icon="email" />}
              hint={isMobile ? mobileSignInUnavailable : undefined}
              hintRole="status"
              reserveMessage
              error={errors.email || blurError || undefined}
              required
            />
            <PasswordField
              label="Password"
              value={password}
              onChange={(event) => { setPassword(event.target.value); setErrors((current) => ({ ...current, password: undefined })); }}
              placeholder="Your password"
              autoComplete="current-password"
              error={errors.password}
              required
              labelAside={<Link className={styles.inlineLink} href={`/forgot-password${query}`}>Forgot password?</Link>}
            />
            <button type="submit" className={styles.submit} disabled={busy}>
              {busy ? <><span className={styles.spinner} aria-hidden="true" />Signing in…</> : "Sign In"}
            </button>
          </form>

          <p className={styles.switch}>New to Pratyangi Fashions? <Link href={`/signup${query}`}>Create an account</Link></p>
          {authMode === "demo" && <p className={styles.demoNote}>Demo mode: accounts are kept only in this browser. This is not real sign-in.</p>}
        </>
      )}
    </AuthShell>
  );
}
