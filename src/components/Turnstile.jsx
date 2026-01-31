import { useEffect } from "react";

export default function Turnstile({ onVerify }) {
  useEffect(() => {
    if (window.turnstile) return;

    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
    s.async = true;
    s.defer = true;
    document.body.appendChild(s);
  }, []);

  return (
    <div
      className="cf-turnstile mt-4"
      data-sitekey="0x4AAAAAABiU3tfYRzLQEw28"
      data-callback={onVerify}
    />
  );
}
