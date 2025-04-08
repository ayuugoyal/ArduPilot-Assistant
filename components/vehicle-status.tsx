"use client"

import { useEffect, useState } from "react"
import { mavlink, type VehicleState } from "@/lib/mavlink-interface"

export function VehicleStatus() {
  const [vehicleState, setVehicleState] = useState<VehicleState>(mavlink.getState())

  useEffect(() => {
    // Subscribe to vehicle state updates
    const unsubscribe = mavlink.addStateListener(setVehicleState)

    // Cleanup subscription on unmount
    return unsubscribe
  }, [])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white p-3 rounded border">
          <div className="text-sm text-gray-500">Flight Mode</div>
          <div className="font-medium">{vehicleState.mode}</div>
        </div>
        <div className="bg-white p-3 rounded border">
          <div className="text-sm text-gray-500">Armed</div>
          <div className="font-medium">{vehicleState.armed ? "Yes" : "No"}</div>
        </div>
        <div className="bg-white p-3 rounded border">
          <div className="text-sm text-gray-500">Altitude</div>
          <div className="font-medium">{vehicleState.altitude.toFixed(1)} m</div>
        </div>
        <div className="bg-white p-3 rounded border">
          <div className="text-sm text-gray-500">Battery</div>
          <div className="font-medium">
            {vehicleState.batteryVoltage.toFixed(1)}V ({vehicleState.batteryPercent}%)
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white p-3 rounded border">
          <div className="text-sm text-gray-500">Latitude</div>
          <div className="font-medium">{vehicleState.latitude.toFixed(6)}°</div>
        </div>
        <div className="bg-white p-3 rounded border">
          <div className="text-sm text-gray-500">Longitude</div>
          <div className="font-medium">{vehicleState.longitude.toFixed(6)}°</div>
        </div>
        <div className="bg-white p-3 rounded border">
          <div className="text-sm text-gray-500">Heading</div>
          <div className="font-medium">{vehicleState.heading.toFixed(0)}°</div>
        </div>
        <div className="bg-white p-3 rounded border">
          <div className="text-sm text-gray-500">Ground Speed</div>
          <div className="font-medium">{vehicleState.groundspeed.toFixed(1)} m/s</div>
        </div>
      </div>
    </div>
  )
}
