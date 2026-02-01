import { useEffect, useState } from "react";
import Skeleton from "./Skeleton.jsx";

export default function Downloader({ surl, token }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // STOP if token missing
    if (!token || !surl) return;

    async function load() {
      try {
        const res = await fetch(
          `https://tera.weber.eu.org/api/terabox?surl=${surl}`,
          {
            headers: {
              "x-turnstile-token": token
            }
          }
        );

        if (!res.ok) throw new Error("API failed");

        const json = await res.json();
        setData(json);
      } catch {
        setError(true);
      }
    }

    load();
  }, [token, surl]);

  if (!token) return null;

  if (error)
    return (
      <div className="mt-4 p-4 glass rounded">
        Unable to fetch file details. Please retry.
      </div>
    );

  if (!data) return <Skeleton />;

  return (
    <div className="mt-4 space-y-3">
      <h2 className="text-xl font-semibold">{data.title}</h2>

      {data.thumbnail && (
        <img
          src={data.thumbnail}
          className="rounded max-w-full"
          alt="Thumbnail"
        />
      )}

      <p><strong>Size:</strong> {data.size}</p>

      <a
        href={data.fastcdn}
        target="_blank"
        className="inline-block px-5 py-2 bg-blue-600 rounded font-semibold"
      >
        Download
      </a>
    </div>
  );
}
