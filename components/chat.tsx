"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Mic, Send, StopCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { SpeechRecognition } from "@/components/speech-recognition"
import { processWithGemini } from "@/lib/gemini-service"
import { mavlink } from "@/lib/mavlink-interface"

type Message = {
  id: string
  content: string
  role: "user" | "assistant"
  timestamp: Date
}

export function Chat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      content: "Hello! I'm your ArduPilot AI Assistant. How can I help you with your drone today?",
      role: "assistant",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSendMessage = async () => {
    if (!input.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      role: "user",
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsProcessing(true)

    try {
      // Get current vehicle state
      const vehicleState = mavlink.getState()

      // Process with Gemini API
      console.log("Processing with Gemini API...")
      console.log(messages)
      const response = await processWithGemini([...messages, userMessage], vehicleState)

      // Execute any actions returned by the AI
      if (response.actions && response.actions.length > 0) {
        for (const action of response.actions) {
          try {
            switch (action.type) {
              case "arm":
                await mavlink.arm()
                break
              case "disarm":
                await mavlink.disarm()
                break
              case "takeoff":
                await mavlink.takeoff(action.params?.altitude || 10)
                break
              case "rtl":
                await mavlink.returnToLaunch()
                break
              case "setMode":
                await mavlink.setMode(action.params?.mode || "GUIDED")
                break
              case "flyTo":
                await mavlink.flyTo(
                  action.params?.lat || vehicleState.latitude,
                  action.params?.lon || vehicleState.longitude,
                  action.params?.alt || vehicleState.altitude,
                )
                break
            }
          } catch (error) {
            console.error(`Failed to execute action ${action.type}:`, error)
          }
        }
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response.text,
        role: "assistant",
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error("Error processing message:", error)

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "I'm sorry, I encountered an error processing your request. Please try again.",
        role: "assistant",
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsProcessing(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleSpeechResult = (transcript: string) => {
    setInput(transcript)
    setIsRecording(false)
  }

  const toggleRecording = () => {
    setIsRecording(!isRecording)
  }

  return (
    <div className="flex flex-col h-[400px] border rounded-lg shadow-sm overflow-hidden">
      <div className="bg-slate-100 p-3 border-b">
        <h2 className="font-medium">AI Assistant</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[80%] rounded-lg px-4 py-2",
                message.role === "user" ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-800",
              )}
            >
              {message.content}
            </div>
          </div>
        ))}
        {isProcessing && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-lg px-4 py-2 bg-gray-100 text-gray-800">
              <div className="flex space-x-2">
                <div
                  className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
                  style={{ animationDelay: "0ms" }}
                ></div>
                <div
                  className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
                  style={{ animationDelay: "150ms" }}
                ></div>
                <div
                  className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
                  style={{ animationDelay: "300ms" }}
                ></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-3 border-t">
        <div className="flex space-x-2">
          <Button variant={isRecording ? "destructive" : "outline"} size="icon" onClick={toggleRecording}>
            {isRecording ? <StopCircle className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message or press the mic to speak..."
            className="flex-1"
          />
          <Button onClick={handleSendMessage} disabled={!input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Speech recognition component */}
      <SpeechRecognition isListening={isRecording} onResult={handleSpeechResult} onEnd={() => setIsRecording(false)} />
    </div>
  )
}
