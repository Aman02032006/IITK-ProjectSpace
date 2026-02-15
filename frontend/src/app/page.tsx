"use client"
import { useEffect, useState } from "react"
import axios from "axios"
import LoginPage from "./auth/loginPage"

export default function Home() {
  const [status, setStatus] = useState("Connecting to backend...")

  useEffect(() => {
    // Attempt to fetch from FastAPI
    axios.get("http://127.0.0.1:8000/")
      .then((response) => {
        setStatus(response.data.message)
      })
      .catch((error) => {
        console.error(error)
        setStatus("Error: Backend is unreachable. Is it running?")
      })
  }, [])

  return (
    // <div className="flex min-h-screen flex-col items-center justify-center p-24 bg-slate-50">
    //   <h1 className="text-4xl font-bold text-slate-900 mb-4">
    //     IITK ProjectSpace
    //   </h1>
    //   <div className="p-6 bg-white rounded-xl shadow-md border">
    //     <p className="text-lg text-slate-700">
    //       System Status: <span className="font-mono font-bold text-blue-600">{status}</span>
    //     </p>
    //   </div>
    // </div>
    <LoginPage />
  )
}