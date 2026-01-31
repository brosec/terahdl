import { useEffect, useRef } from "react";

export default function Turnstile({ onVerify }) {
  const ref = useRef(null);

  useEffect(() => {
    function render() {
      if (!window.turnstile || !ref.current) return;

      window.turnstile.render(ref.current, {
        sitekey: "0x4AAAAAABiU3tfYRzLQEw28",
        callback: onVerify
      });
    }

    if (window.turnstile) {
      render();
    } else {
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
      script.async = true;
      script.defer = true;
      script.onload = render;
      document.body.appendChild(script);
    }
  }, []);

  return <div ref={ref} className="mt-4"></div>;
}
