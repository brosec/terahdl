import { useState } from "react";
import ToolCard from "./ToolCard.jsx";
import Turnstile from "./Turnstile.jsx";
import Downloader from "./Downloader.jsx";
import Skeleton from "./Skeleton.jsx";

export default function ToolApp() {
  const [input, setInput] = useState("");
  const [surl, setSurl] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(false);

  function extractSurl(text) {
    const m = text.match(/\/s\/([a-zA-Z0-9_-]+)/);
    return m ? m[1] : text;
  }

  function handleSubmit(e) {
    e.preventDefault();
    setSurl(extractSurl(input));
    setToken(null);
  }

  return (
    <ToolCard>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Paste TeraBox link"
          required
          className="flex-1 px-4 py-3 rounded bg-slate-800 border border-slate-700"
        />

        <button className="px-6 py-3 bg-blue-600 rounded font-semibold">
          Continue
        </button>
      </form>

      {surl && !token && (
        <div className="mt-4">
          <Turnstile onVerify={setToken} />
        </div>
      )}

      {token && (
        <div className="mt-6">
          <Downloader surl={surl} token={token} />
        </div>
      )}

    </ToolCard>
  );
}
