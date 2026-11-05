"use client";
import { useActionState } from "react";
import { loginAction } from "../actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState(loginAction, null);
  return (
    <form action={action} className="mx-auto mt-24 max-w-sm space-y-4 rounded-2xl border border-line bg-surface p-6">
      <h1 className="text-xl font-bold">Shop admin</h1>
      <div className="field"><label htmlFor="pw">Password</label><input id="pw" name="password" type="password" className="input" required autoFocus /></div>
      {state?.error && <p className="text-sm text-bad" role="alert">{state.error}</p>}
      <button className="btn btn-primary w-full" disabled={pending}>Log in</button>
    </form>
  );
}
