import { Chat } from "@/components/chat"
import { ThemeProvider } from "@/components/theme-provider"
import { VehicleStatus } from "@/components/vehicle-status"
import { FlightMap } from "@/components/flight-map"
import Image from "next/image"

export default function Home() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="ardupilot-theme">
      <main className="flex min-h-screen flex-col items-center justify-between p-4 md:p-8">
        <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm flex">
          <div className="flex items-center space-x-2">
            <Image src="/ardupilot_logo.png" alt="ArduPilot Logo" className="h-8 w-auto"
              width={200}
              height={50}
            />
            <h1 className="text-xl font-bold">ArduPilot AI Assistant</h1>
          </div>
          <div className="flex items-center space-x-2">
            <span className="bg-green-100 text-green-800 px-2 py-1 rounded-md text-xs font-medium">Connected</span>
          </div>
        </div>

        <div className="w-full max-w-5xl flex-1 flex flex-col md:flex-row gap-4 my-8">
          <div className="flex-1 border rounded-lg shadow-sm overflow-hidden">
            <div className="bg-slate-100 p-3 border-b">
              <h2 className="font-medium">Vehicle Status</h2>
            </div>
            <div className="p-4">
              <VehicleStatus />
            </div>
          </div>
          <div className="flex-1 border rounded-lg shadow-sm overflow-hidden">
            <div className="bg-slate-100 p-3 border-b">
              <h2 className="font-medium">Flight Data</h2>
            </div>
            <div className="p-4 h-[300px]">
              <FlightMap />
            </div>
          </div>
        </div>

        <div className="w-full max-w-5xl">
          <Chat />
        </div>
      </main>
    </ThemeProvider>
  )
}
