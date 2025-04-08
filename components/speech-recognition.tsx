"use client"

import { useEffect } from "react"

type SpeechRecognitionProps = {
  isListening: boolean
  onResult: (transcript: string) => void
  onEnd?: () => void
}

export function SpeechRecognition({ isListening, onResult, onEnd }: SpeechRecognitionProps) {
  useEffect(() => {
    // Check if browser supports speech recognition
    if (typeof window !== "undefined" && ("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      // Get the appropriate speech recognition constructor
      const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition
      const recognition = new SpeechRecognitionAPI()

      recognition.continuous = false
      recognition.interimResults = true
      recognition.lang = "en-US"

      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0])
          .map((result) => result.transcript)
          .join("")

        onResult(transcript)
      }

      recognition.onend = () => {
        if (onEnd) onEnd()
      }

      if (isListening) {
        try {
          recognition.start()
        } catch (e) {
          console.error("Speech recognition error:", e)
        }
      }

      return () => {
        try {
          recognition.stop()
        } catch (e) {
          // Ignore errors when stopping
        }
      }
    } else {
      console.warn("Speech Recognition API not supported in this browser")
    }
  }, [isListening, onResult, onEnd])

  return null
}
