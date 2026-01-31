import { useState } from "react";
import Turnstile from "./Turnstile.jsx";
import Downloader from "./Downloader.jsx";

export default function DownloadApp({ surl }) {
  const [token, setToken] = useState(null);

  if (!surl) {
    return (
      <p className="text-slate-400">
        Enter a valid TeraBox share link from the homepage to continue.
      </p>
    );
  }

  return (
    <>
      {!token && (
        <>
          <p className="text-slate-400 mb-3">
            Please verify to continue.
          </p>
          <Turnstile onVerify={setToken} />
        </>
      )}

      {token && <Downloader surl={surl} token={token} />}
    </>
  );
}
