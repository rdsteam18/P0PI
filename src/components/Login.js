import React from "react";
import { auth, provider } from "../firebase";
import { signInWithPopup } from "firebase/auth";

export default function Login() {
  async function handleLogin() {
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      alert("Login failed: " + err.message);
    }
  }

  return (
    <div className="login-container">
      <button onClick={handleLogin} className="login-btn">
        Login with Google
      </button>
    </div>
  );
}
