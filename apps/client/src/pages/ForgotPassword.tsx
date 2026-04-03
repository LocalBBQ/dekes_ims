import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.auth.forgotPassword(email);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-center mb-6">Coffee Shop Inventory</h1>
        {done ? (
          <div className="space-y-4 text-center">
            <p className="text-neutral-300 text-sm">
              If an account exists for that email, you will receive a password reset link shortly.
            </p>
            <Link
              to="/login"
              className="inline-block text-amber-500 hover:text-amber-400 text-sm font-medium"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-neutral-400 text-center">
              Enter your email and we will send you a link to reset your password.
            </p>
            <div>
              <label htmlFor="email" className="block text-sm text-neutral-400 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-4 py-3 rounded-lg bg-neutral-800 border border-neutral-600 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="you@example.com"
              />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 font-medium"
            >
              {loading ? "Sending…" : "Send reset link"}
            </button>
            <p className="text-center">
              <Link
                to="/login"
                className="text-sm text-amber-500 hover:text-amber-400"
              >
                Back to sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
