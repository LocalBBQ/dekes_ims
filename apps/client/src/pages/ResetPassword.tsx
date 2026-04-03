import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      await api.auth.resetPassword(token, password);
      navigate("/login?reset=success", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <h1 className="text-2xl font-semibold">Invalid link</h1>
          <p className="text-sm text-neutral-400">
            This reset link is missing a token. Open the link from your email, or request a new
            reset from the login page.
          </p>
          <Link
            to="/forgot-password"
            className="inline-block text-amber-500 hover:text-amber-400 text-sm font-medium"
          >
            Forgot password
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-center mb-6">Set a new password</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm text-neutral-400 mb-1">
              New password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              className="w-full px-4 py-3 rounded-lg bg-neutral-800 border border-neutral-600 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label htmlFor="confirm" className="block text-sm text-neutral-400 mb-1">
              Confirm password
            </label>
            <input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              className="w-full px-4 py-3 rounded-lg bg-neutral-800 border border-neutral-600 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 font-medium"
          >
            {loading ? "Saving…" : "Update password"}
          </button>
          <p className="text-center">
            <Link to="/login" className="text-sm text-amber-500 hover:text-amber-400">
              Back to sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
