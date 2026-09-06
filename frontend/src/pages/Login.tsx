import { useState } from "react";
import {
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { auth } from "../lib/firebase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleGoogleLogin() {
    try {
      setLoading(true);
      setError("");

      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error(error);
      setError("Unable to sign in with Google.");
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailLogin(event: React.FormEvent) {
    event.preventDefault();

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (error: any) {
      console.error(error);

      switch (error.code) {
        case "auth/invalid-credential":
        case "auth/wrong-password":
        case "auth/user-not-found":
          setError("Invalid email or password.");
          break;

        case "auth/too-many-requests":
          setError("Too many attempts. Please try again later.");
          break;

        default:
          setError("Unable to log in. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-[382px] rounded-lg border border-[#e5e8e6] px-11 py-10">
        <h1 className="mb-6 text-center text-[30px] font-bold tracking-[-1px]">
          Login
        </h1>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-center text-xs text-red-600">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-[#e4f6ed] text-[12px] text-gray-800 transition hover:bg-[#d9f1e5] disabled:opacity-60"
        >
          <span className="font-medium text-[#4285f4]">G</span>
          {loading ? "Signing in..." : "Login with Google"}
        </button>

        <div className="my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-[#e5e8e6]" />
          <span className="text-[10px] text-gray-400">
            or sign up through email
          </span>
          <div className="h-px flex-1 bg-[#e5e8e6]" />
        </div>

        <form onSubmit={handleEmailLogin} className="space-y-2">
          <input
            type="email"
            placeholder="Email ID"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={loading}
            className="h-11 w-full rounded-lg bg-[#f3f6f4] px-4 text-[12px] outline-none placeholder:text-gray-500 focus:ring-1 focus:ring-[#00a844]"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={loading}
            className="h-11 w-full rounded-lg bg-[#f3f6f4] px-4 text-[12px] outline-none placeholder:text-gray-500 focus:ring-1 focus:ring-[#00a844]"
          />

          <button
            type="submit"
            disabled={loading}
            className="mt-3 h-9 w-full rounded-lg bg-[#00ae46] text-[12px] text-white transition hover:bg-[#009b3e] disabled:opacity-60"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
