import { useEffect, useState } from "react";
import Skeleton from "./Skeleton.jsx";

export default function Downloader({ surl }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch(`https://YOUR_VERCEL_APP/api/terabox?surl=${surl}`, {
      headers: { "x-turnstile-token": window.__TURNSTILE__ }
    })
      .then(r => r.json())
      .then(setData)
      .catch(() => setData({ error: true }));
  }, []);

  if (!data) return <Skeleton />;
  if (data.error) return <p>Unable to process this link right now.</p>;

  return (
    <>
      <h2 className="text-xl font-semibold">{data.title}</h2>
      {data.thumbnail && <img src={data.thumbnail} className="rounded my-3" />}
      <p>Size: {data.size}</p>
      <a className="inline-block mt-3 px-4 py-2 bg-blue-600 rounded"
         href={data.fastcdn} target="_blank">
        Download
      </a>
    </>
  );
}
