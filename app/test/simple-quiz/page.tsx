"use client"

import { useState } from "react"

export default function SimpleQuizPage() {
  const [test, setTest] = useState("Page fonctionne !")

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-4xl font-bold mb-4">{test}</h1>
      <p className="text-xl">Si vous voyez ce message, la page fonctionne.</p>
      <button 
        onClick={() => setTest("Bouton fonctionne aussi !")}
        className="mt-4 px-4 py-2 bg-blue-500 rounded"
      >
        Tester le bouton
      </button>
    </div>
  )
}


