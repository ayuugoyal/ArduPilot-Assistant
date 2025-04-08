import { mavlink, type VehicleState } from "./mavlink-interface"

// This is a simulated AI service for the prototype
// In a real implementation, this would connect to OpenAI or Google Gemini

export type AIRequest = {
  text: string
  vehicleState?: VehicleState
}

export type AIResponse = {
  text: string
  actions?: AIAction[]
}

export type AIAction = {
  type: "arm" | "disarm" | "takeoff" | "land" | "rtl" | "flyTo" | "setMode"
  params?: Record<string, any>
}

export class AIService {
  async processRequest(request: AIRequest): Promise<AIResponse> {
    const { text, vehicleState = mavlink.getState() } = request
    const lowerText = text.toLowerCase()

    // Simple rule-based processing for the prototype
    // In a real implementation, this would use OpenAI or Google Gemini

    if (lowerText.includes("takeoff") || lowerText.includes("take off")) {
      // Extract altitude if specified
      const altitudeMatch = text.match(/(\d+)\s*(m|meters|meter)/i)
      const altitude = altitudeMatch ? Number.parseInt(altitudeMatch[1]) : 10

      return {
        text: `Taking off to ${altitude} meters altitude.`,
        actions: [
          { type: "setMode", params: { mode: "GUIDED" } },
          { type: "arm" },
          { type: "takeoff", params: { altitude } },
        ],
      }
    }

    if (lowerText.includes("land")) {
      return {
        text: "Landing the vehicle at the current location.",
        actions: [{ type: "setMode", params: { mode: "LAND" } }],
      }
    }

    if (lowerText.includes("rtl") || lowerText.includes("return") || lowerText.includes("home")) {
      return {
        text: "Returning to the launch location.",
        actions: [{ type: "rtl" }],
      }
    }

    if (lowerText.includes("arm")) {
      return {
        text: "Arming the vehicle.",
        actions: [{ type: "arm" }],
      }
    }

    if (lowerText.includes("disarm")) {
      return {
        text: "Disarming the vehicle.",
        actions: [{ type: "disarm" }],
      }
    }

    // Handle directional commands
    if (lowerText.includes("fly")) {
      let direction = ""
      let distance = 10 // Default 10 meters

      // Extract direction
      if (lowerText.includes("north")) direction = "north"
      else if (lowerText.includes("south")) direction = "south"
      else if (lowerText.includes("east")) direction = "east"
      else if (lowerText.includes("west")) direction = "west"

      // Extract distance
      const distanceMatch = text.match(/(\d+)\s*(m|meters|meter)/i)
      if (distanceMatch) {
        distance = Number.parseInt(distanceMatch[1])
      }

      if (direction) {
        // Calculate new position based on direction and distance
        const { latitude, longitude } = vehicleState
        let newLat = latitude
        let newLon = longitude

        // Very simplified calculation (not accurate for large distances)
        const latDegPerMeter = 0.000009
        const lonDegPerMeter = 0.000011

        if (direction === "north") newLat += latDegPerMeter * distance
        else if (direction === "south") newLat -= latDegPerMeter * distance
        else if (direction === "east") newLon += lonDegPerMeter * distance
        else if (direction === "west") newLon -= lonDegPerMeter * distance

        return {
          text: `Flying ${direction} for ${distance} meters.`,
          actions: [
            { type: "setMode", params: { mode: "GUIDED" } },
            { type: "flyTo", params: { lat: newLat, lon: newLon, alt: vehicleState.altitude } },
          ],
        }
      }
    }

    // Handle mode changes
    if (lowerText.includes("mode")) {
      const modes = ["stabilize", "althold", "loiter", "rtl", "auto", "guided"]
      for (const mode of modes) {
        if (lowerText.includes(mode)) {
          return {
            text: `Changing flight mode to ${mode.toUpperCase()}.`,
            actions: [{ type: "setMode", params: { mode: mode.toUpperCase() } }],
          }
        }
      }
    }

    // Handle information requests
    if (lowerText.includes("altitude") || lowerText.includes("height")) {
      return {
        text: `The current altitude is ${vehicleState.altitude.toFixed(1)} meters above the home position.`,
      }
    }

    if (lowerText.includes("battery")) {
      return {
        text: `The battery is currently at ${vehicleState.batteryVoltage.toFixed(1)}V which is approximately ${vehicleState.batteryPercent}% of capacity.`,
      }
    }

    if (lowerText.includes("position") || lowerText.includes("location") || lowerText.includes("where")) {
      return {
        text: `The vehicle is currently at ${vehicleState.latitude.toFixed(6)}° latitude, ${vehicleState.longitude.toFixed(6)}° longitude, and ${vehicleState.altitude.toFixed(1)} meters altitude.`,
      }
    }

    // Default response
    return {
      text: "I understand your request. Would you like me to perform a specific action with the drone, or do you need information about its current status?",
    }
  }

  async executeActions(actions: AIAction[]): Promise<boolean> {
    for (const action of actions) {
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
              action.params?.lat || mavlink.getState().latitude,
              action.params?.lon || mavlink.getState().longitude,
              action.params?.alt || mavlink.getState().altitude,
            )
            break
        }
      } catch (error) {
        console.error(`Failed to execute action ${action.type}:`, error)
        return false
      }
    }
    return true
  }
}

export const aiService = new AIService()
