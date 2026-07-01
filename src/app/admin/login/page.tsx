"use client";

import { useActionState } from "react";
import { adminLogin } from "../../actions";
import styles from "../admin.module.css";

export default function AdminLoginPage() {
  const [state, formAction, isPending] = useActionState(adminLogin, null);

  return (
    <div className={styles.loginContainer}>
      <div>
        <h2 className={styles.loginTitle}>Admin Access</h2>
        <p className={styles.loginDesc}>
          Provide username and password to log in and manage portfolio images.
        </p>
      </div>

      <form action={formAction} className={styles.loginForm}>
        <div className={styles.inputGroup}>
          <label htmlFor="username" className={styles.label}>
            Username
          </label>
          <input
            type="text"
            id="username"
            name="username"
            required
            className={styles.input}
            disabled={isPending}
            autoFocus
          />
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="password" className={styles.label}>
            Password
          </label>
          <input
            type="password"
            id="password"
            name="password"
            required
            className={styles.input}
            disabled={isPending}
          />
        </div>

        {state?.error && (
          <div className={styles.errorBox}>
            {state.error}
          </div>
        )}

        <button type="submit" disabled={isPending} className={styles.submitBtn}>
          {isPending ? "Authenticating..." : "Log In"}
        </button>
      </form>
    </div>
  );
}
