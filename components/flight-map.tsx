"use client"

import { useEffect, useRef, useState } from "react"
import { mavlink, type VehicleState } from "@/lib/mavlink-interface"

export function FlightMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [vehicleState, setVehicleState] = useState<VehicleState>(mavlink.getState())

  // Store flight path
  const [flightPath, setFlightPath] = useState<{ lat: number; lon: number }[]>([
    { lat: vehicleState.latitude, lon: vehicleState.longitude },
  ])

  // Home position
  const [homePosition] = useState({
    lat: vehicleState.latitude,
    lon: vehicleState.longitude,
  })

  useEffect(() => {
    // Subscribe to vehicle state updates
    const unsubscribe = mavlink.addStateListener((state) => {
      setVehicleState(state)

      // Add current position to flight path if it has moved significantly
      const lastPos = flightPath[flightPath.length - 1]
      const distMoved = Math.sqrt(
        Math.pow((state.latitude - lastPos.lat) * 111000, 2) +
          Math.pow((state.longitude - lastPos.lon) * 111000 * Math.cos((state.latitude * Math.PI) / 180), 2),
      )

      if (distMoved > 1) {
        // If moved more than 1 meter
        setFlightPath((prev) => [...prev, { lat: state.latitude, lon: state.longitude }])
      }
    })

    // Cleanup subscription on unmount
    return unsubscribe
  }, [flightPath])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Set canvas dimensions
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width
    canvas.height = rect.height

    // Calculate scale and offset to fit all points
    const padding = 20
    const minLat = Math.min(...flightPath.map((p) => p.lat), homePosition.lat)
    const maxLat = Math.max(...flightPath.map((p) => p.lat), homePosition.lat)
    const minLon = Math.min(...flightPath.map((p) => p.lon), homePosition.lon)
    const maxLon = Math.max(...flightPath.map((p) => p.lon), homePosition.lon)

    // Ensure minimum area even if no movement
    const latSpan = Math.max(maxLat - minLat, 0.0005)
    const lonSpan = Math.max(maxLon - minLon, 0.0005)

    const scaleX = (canvas.width - padding * 2) / lonSpan
    const scaleY = (canvas.height - padding * 2) / latSpan

    // Function to convert lat/lon to canvas coordinates
    const toCanvasCoords = (lat: number, lon: number) => {
      const x = (lon - minLon) * scaleX + padding
      const y = canvas.height - ((lat - minLat) * scaleY + padding) // Invert Y axis
      return { x, y }
    }

    // Draw home position
    const home = toCanvasCoords(homePosition.lat, homePosition.lon)
    ctx.fillStyle = "#3b82f6" // blue
    ctx.beginPath()
    ctx.arc(home.x, home.y, 6, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = "white"
    ctx.beginPath()
    ctx.arc(home.x, home.y, 3, 0, Math.PI * 2)
    ctx.fill()

    // Draw flight path
    if (flightPath.length > 1) {
      ctx.strokeStyle = "#9ca3af" // gray
      ctx.lineWidth = 2
      ctx.beginPath()

      const start = toCanvasCoords(flightPath[0].lat, flightPath[0].lon)
      ctx.moveTo(start.x, start.y)

      for (let i = 1; i < flightPath.length; i++) {
        const point = toCanvasCoords(flightPath[i].lat, flightPath[i].lon)
        ctx.lineTo(point.x, point.y)
      }

      ctx.stroke()
    }

    // Draw current position
    const current = toCanvasCoords(vehicleState.latitude, vehicleState.longitude)
    ctx.fillStyle = "#ef4444" // red
    ctx.beginPath()
    ctx.arc(current.x, current.y, 5, 0, Math.PI * 2)
    ctx.fill()

    // Draw heading indicator
    const headingRad = (vehicleState.heading * Math.PI) / 180
    const headingLength = 15
    ctx.strokeStyle = "#ef4444" // red
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(current.x, current.y)
    ctx.lineTo(current.x + Math.sin(headingRad) * headingLength, current.y - Math.cos(headingRad) * headingLength)
    ctx.stroke()

    // Draw coordinates
    ctx.fillStyle = "#1f2937" // dark gray
    ctx.font = "10px sans-serif"
    ctx.fillText(`Home: ${homePosition.lat.toFixed(6)}°, ${homePosition.lon.toFixed(6)}°`, 10, canvas.height - 10)
  }, [vehicleState, flightPath, homePosition])

  return (
    <div className="h-full bg-white rounded flex items-center justify-center">
      <canvas ref={canvasRef} className="w-full h-full rounded" />
    </div>
  )
}
