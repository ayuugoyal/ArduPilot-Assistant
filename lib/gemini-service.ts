import type { VehicleState } from "./mavlink-interface"

export type AIResponse = {
  text: string
  actions?: AIAction[]
}

export type AIAction = {
  type: "arm" | "disarm" | "takeoff" | "land" | "rtl" | "flyTo" | "setMode"
  params?: Record<string, any>
}

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY

// Check if the API key is available
if (!GEMINI_API_KEY) {
  console.warn("Warning: GEMINI_API_KEY environment variable is not set. API calls will fall back to simulation mode.")
}

// System prompt that defines the assistant's capabilities and constraints
const SYSTEM_PROMPT = `
You are an AI assistant for ArduPilot, designed to help control and monitor drones through natural language commands.
You can perform the following actions:
1. Arm and disarm the vehicle
2. Take off to a specified altitude
3. Change flight modes (GUIDED, LOITER, RTL, AUTO, etc.)
4. Fly in specific directions (north, south, east, west) for specified distances
5. Return to launch (RTL)
6. Provide information about the vehicle's current status

When responding to user requests:
- Be concise and clear
- Confirm the actions you're taking
- Prioritize safety at all times
- Ask for clarification if a command is ambiguous
- Never perform unsafe operations

Your responses should include both a text reply and any actions that should be executed.

you will be given an array of objects which represent the chat history as vairable CHAT_HISTORY. Each object will have the following properties:
Message = {
  id: string
  content: string
  role: "user" | "assistant"
  timestamp: Date
}

repond by analyzing the chat history and the current vehicle state.
`

type Message = {
  id: string
  content: string
  role: "user" | "assistant"
  timestamp: Date
}


export async function processWithGemini(userInput: Message[], vehicleState: VehicleState): Promise<AIResponse> {
  try {
    console.log("Calling Gemini API with user input:", userInput)
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { text: SYSTEM_PROMPT },
              { text: `Current vehicle state:
                Mode: ${vehicleState.mode}
                Armed: ${vehicleState.armed}
                Altitude: ${vehicleState.altitude.toFixed(1)} meters
                Position: ${vehicleState.latitude.toFixed(6)}, ${vehicleState.longitude.toFixed(6)}
                Battery: ${vehicleState.batteryVoltage.toFixed(1)}V (${vehicleState.batteryPercent}%)
                Heading: ${vehicleState.heading.toFixed(0)} degrees
                Ground Speed: ${vehicleState.groundspeed.toFixed(1)} m/s
                
                message history: ${JSON.stringify(userInput)}
                
                Respond with a JSON object containing the following:
                1. text: Your response to the user
                2. actions: Array of actions to perform (optional)

                DO NOT GIVE ANYTHING ELSE EXCEPT THE JSON OBJECT.
                
                Example:
                {
                  "text": "Taking off to 10 meters altitude.",
                  "actions": [
                    { "type": "setMode", "params": { "mode": "GUIDED" } },
                    { "type": "arm" },
                    { "type": "takeoff", "params": { "altitude": 10 } }
                  ]
                }` 
              }
            ]
          }
        ]
      })
    });
    
    const data = await response.json();
    const generatedText = data.candidates[0].content.parts[0].text;

    console.log("Gemini API response:", generatedText);
    
    let jsonString = generatedText;
    if (generatedText.startsWith("```")) {
      const jsonMatch = generatedText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch && jsonMatch[1]) {
        jsonString = jsonMatch[1].trim();
      }
    }
    
    const parsedResponse = JSON.parse(jsonString);
    return parsedResponse;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    
    return simulateGeminiResponse(userInput.filter((message) => message.role === "user" && message.content !== SYSTEM_PROMPT).map((message) => message.content).join(" "), vehicleState);
  }
}

// Function to simulate Gemini API responses for demo purposes
function simulateGeminiResponse(userInput: string, vehicleState: VehicleState): AIResponse {
  const lowerInput = userInput.toLowerCase()

  if (lowerInput.includes("takeoff") || lowerInput.includes("take off")) {
    const altitudeMatch = userInput.match(/(\d+)\s*(m|meters|meter)/i)
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

  if (lowerInput.includes("land")) {
    return {
      text: "Landing the vehicle at the current location.",
      actions: [{ type: "setMode", params: { mode: "LAND" } }],
    }
  }

  if (lowerInput.includes("rtl") || lowerInput.includes("return") || lowerInput.includes("home")) {
    return {
      text: "Returning to the launch location.",
      actions: [{ type: "rtl" }],
    }
  }

  if (lowerInput.includes("arm") && !lowerInput.includes("disarm")) {
    return {
      text: "Arming the vehicle.",
      actions: [{ type: "arm" }],
    }
  }

  if (lowerInput.includes("disarm")) {
    return {
      text: "Disarming the vehicle.",
      actions: [{ type: "disarm" }],
    }
  }

  if (lowerInput.includes("fly")) {
    let direction = ""
    let distance = 10 

    if (lowerInput.includes("north")) direction = "north"
    else if (lowerInput.includes("south")) direction = "south"
    else if (lowerInput.includes("east")) direction = "east"
    else if (lowerInput.includes("west")) direction = "west"

    const distanceMatch = userInput.match(/(\d+)\s*(m|meters|meter)/i)
    if (distanceMatch) {
      distance = Number.parseInt(distanceMatch[1])
    }

    if (direction) {
      const { latitude, longitude } = vehicleState
      let newLat = latitude
      let newLon = longitude

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

  if (lowerInput.includes("mode")) {
    const modes = ["stabilize", "althold", "loiter", "rtl", "auto", "guided"]
    for (const mode of modes) {
      if (lowerInput.includes(mode)) {
        return {
          text: `Changing flight mode to ${mode.toUpperCase()}.`,
          actions: [{ type: "setMode", params: { mode: mode.toUpperCase() } }],
        }
      }
    }
  }

  if (lowerInput.includes("status") || lowerInput.includes("how") || lowerInput.includes("what")) {
    if (lowerInput.includes("altitude") || lowerInput.includes("height")) {
      return {
        text: `The current altitude is ${vehicleState.altitude.toFixed(1)} meters above the home position.`,
      }
    }

    if (lowerInput.includes("battery")) {
      return {
        text: `The battery is currently at ${vehicleState.batteryVoltage.toFixed(1)}V which is approximately ${vehicleState.batteryPercent}% of capacity.`,
      }
    }

    if (lowerInput.includes("position") || lowerInput.includes("location") || lowerInput.includes("where")) {
      return {
        text: `The vehicle is currently at ${vehicleState.latitude.toFixed(6)}° latitude, ${vehicleState.longitude.toFixed(6)}° longitude, and ${vehicleState.altitude.toFixed(1)} meters altitude.`,
      }
    }

    if (lowerInput.includes("mode")) {
      return {
        text: `The vehicle is currently in ${vehicleState.mode} mode.`,
      }
    }

    return {
      text: `Current Status:
- Mode: ${vehicleState.mode}
- Armed: ${vehicleState.armed ? "Yes" : "No"}
- Altitude: ${vehicleState.altitude.toFixed(1)} meters
- Battery: ${vehicleState.batteryVoltage.toFixed(1)}V (${vehicleState.batteryPercent}%)
- Position: ${vehicleState.latitude.toFixed(6)}°, ${vehicleState.longitude.toFixed(6)}°
- Heading: ${vehicleState.heading.toFixed(0)}°
- Ground Speed: ${vehicleState.groundspeed.toFixed(1)} m/s`,
    }
  }

  if (lowerInput.includes("help") || lowerInput.includes("commands") || lowerInput.includes("what can you do")) {
    return {
      text: `I can help you control your drone with commands like:
- "Take off to 50 meters"
- "Fly north 100 meters"
- "Return to home"
- "Land now"
- "What's my battery level?"
- "Change mode to loiter"
- "What's my current status?"

Just tell me what you'd like to do!`,
    }
  }

  return {
    text: "I understand you want to interact with the drone, but I'm not sure what specific action you're requesting. You can ask me to take off, land, fly in a direction, return to home, or provide status information. How can I help you?",
  }
}
