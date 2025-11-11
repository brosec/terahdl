import React, {useState} from 'react'

export default function App(){
  const [link, setLink] = useState('')
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-3xl">
        <h1 className="text-3xl font-bold mb-4">Terabox Downloader</h1>
        <form onSubmit={(e)=>{e.preventDefault(); alert('Inspect: '+link)}}>
          <input value={link} onChange={e=>setLink(e.target.value)} placeholder="Paste Terabox link" className="w-full p-3 rounded-md border" />
          <button className="mt-3 px-4 py-2 bg-sky-600 text-white rounded-md">Inspect</button>
        </form>
      </div>
    </main>
  )
}
