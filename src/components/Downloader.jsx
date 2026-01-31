import { useEffect, useState } from "react";
import Skeleton from "./Skeleton.jsx";

export default function Downloader({ surl, token }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!surl || !token) return;

    fetch(`https://tera.weber.eu.org/api/terabox?surl=${encodeURIComponent(surl)}`, {
      headers: {
        "x-turnstile-token": token
      }
    })
      .then(res => {
        if (!res.ok) throw new Error("API failed");
        return res.json();
      })
      .then(setData)
      .catch(() => setError(true));
  }, [surl, token]);

  if (error) {
    return <p className="text-slate-400">Unable to process this link right now.</p>;
  }

  if (!data) {
    return <Skeleton />;
  }

  return (
    <>
      <h2 className="text-xl font-semibold">{data.title}</h2>

      {data.thumbnail && (
        <img
          src={data.thumbnail}
          alt="Thumbnail"
          className="rounded my-4 max-w-full"
        />
      )}

      <p className="mb-2"><strong>Size:</strong> {data.size}</p>

      <a
        href={data.fastcdn}
        target="_blank"
        rel="noopener"
        className="inline-block mt-3 px-5 py-2 bg-blue-600 rounded font-semibold"
      >
        Download
      </a>
    </>
  );
}
