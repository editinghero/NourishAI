import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/login")({
  component: Login,
});

function Login() {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: user, password: pass }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to login");
      window.location.href = "/";
    } catch (e: any) {
      setErr(e.message || "Failed to login");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form
        onSubmit={handle}
        className="w-full max-w-sm rounded-3xl bg-card p-6 shadow-xl card-soft"
      >
        <h1 className="mb-6 text-2xl font-bold">Welcome back</h1>
        {err && (
          <div className="mb-4 text-sm text-[color:var(--danger)]">{err}</div>
        )}
        <div className="space-y-4">
          <input
            className="w-full rounded-2xl bg-input px-4 py-3"
            placeholder="Username"
            value={user}
            onChange={(e) => setUser(e.target.value)}
            required
          />
          <input
            className="w-full rounded-2xl bg-input px-4 py-3"
            type="password"
            placeholder="Password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            required
          />
          <button className="w-full rounded-full bg-primary py-3 font-bold text-primary-foreground shadow-[var(--shadow-pill)]">
            Log In
          </button>
        </div>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link
            to="/signup"
            className="font-bold text-foreground hover:underline"
          >
            Sign up
          </Link>
        </p>
      </form>
    </div>
  );
}
