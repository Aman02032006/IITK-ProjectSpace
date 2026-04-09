"use client"
import { useEffect, useState } from "react"
import axios from "axios"
import LoginPage from "./auth/AuthPageClient"

// Main root route component; checks backend connectivity and renders the entry login page
export default function Home() {
  const [, setStatus] = useState("Connecting to backend...")

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
    <LoginPage />
  )
}
