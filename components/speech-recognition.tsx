"use client"

import { useEffect } from "react"

// More complete type definitions for Speech Recognition API
declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition
    webkitSpeechRecognition?: new () => SpeechRecognition
  }

  interface SpeechRecognition extends EventTarget {
    continuous: boolean
    interimResults: boolean
    lang: string
    start(): void
    stop(): void
    onresult: (event: SpeechRecognitionEvent) => void
    onend: () => void
    onerror: (event: any) => void
  }

  interface SpeechRecognitionEvent {
    results: SpeechRecognitionResultList
    resultIndex: number
    readonly isTrusted: boolean
  }

  interface SpeechRecognitionResultList {
    readonly length: number
    item(index: number): SpeechRecognitionResult
    [index: number]: SpeechRecognitionResult
  }

  interface SpeechRecognitionResult {
    item(index: number): SpeechRecognitionAlternative
    [index: number]: SpeechRecognitionAlternative
  }

  interface SpeechRecognitionAlternative {
    readonly transcript: string
    readonly confidence: number
  }
}

type SpeechRecognitionProps = {
  isListening: boolean
  onResult: (transcript: string) => void
  onEnd?: () => void
}

export function SpeechRecognition({ isListening, onResult, onEnd }: SpeechRecognitionProps) {
  useEffect(() => {
    // Check if browser supports speech recognition
    if (typeof window === "undefined") return;

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      console.warn("Speech Recognition API not supported in this browser");
      return;
    }

    const recognition = new SpeechRecognitionAPI();

    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = Array.from(event.results)
        .map(result => result[0])
        .map(result => result.transcript)
        .join("");

      onResult(transcript);
    };

    recognition.onend = () => {
      if (onEnd) onEnd();
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event);
      if (onEnd) onEnd();
    };

    if (isListening) {
      try {
        recognition.start();
      } catch (e) {
        console.error("Speech recognition error:", e);
        if (onEnd) onEnd();
      }
    }

    return () => {
      try {
        recognition.stop();
      } catch (e) {
        console.error("Error stopping speech recognition:", e);
      }
    };
  }, [isListening, onResult, onEnd]);

  return null;
}
