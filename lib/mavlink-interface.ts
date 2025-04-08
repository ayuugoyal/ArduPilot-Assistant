export type VehicleState = {
  armed: boolean
  mode: string
  altitude: number
  latitude: number
  longitude: number
  batteryVoltage: number
  batteryPercent: number
  heading: number
  groundspeed: number
}

class MAVLinkInterface {
  private state: VehicleState = {
    armed: true,
    mode: "GUIDED",
    altitude: 45.2,
    latitude: 47.6062,
    longitude: -122.3321,
    batteryVoltage: 12.6,
    batteryPercent: 85,
    heading: 90,
    groundspeed: 5.2,
  }

  private listeners: ((state: VehicleState) => void)[] = []
  private homePosition = { latitude: 47.6062, longitude: -122.3321 }

  constructor() {
    // Simulate periodic updates
    setInterval(() => {
      // Small random changes to simulate movement
      this.state.altitude += (Math.random() - 0.5) * 0.2
      this.state.batteryVoltage -= Math.random() * 0.01
      this.state.batteryPercent = Math.round(((this.state.batteryVoltage - 10.5) / (12.6 - 10.5)) * 100)

      // If in RTL mode, move toward home
      if (this.state.mode === "RTL") {
        const distToHome = Math.sqrt(
          Math.pow(this.state.latitude - this.homePosition.latitude, 2) +
            Math.pow(this.state.longitude - this.homePosition.longitude, 2),
        )

        if (distToHome > 0.0001) {
          // If not at home yet
          // Move 10% closer to home
          this.state.latitude = this.state.latitude + (this.homePosition.latitude - this.state.latitude) * 0.1
          this.state.longitude = this.state.longitude + (this.homePosition.longitude - this.state.longitude) * 0.1

          // Calculate heading to home
          const dx = this.homePosition.longitude - this.state.longitude
          const dy = this.homePosition.latitude - this.state.latitude
          this.state.heading = ((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360
        } else if (this.state.altitude > 5) {
          // Descend when close to home
          this.state.altitude -= 0.5
        } else {
          // Land and disarm when at home and low altitude
          this.state.altitude = 0
          this.state.armed = false
          this.state.mode = "LAND"
        }
      }

      // Notify listeners
      this.notifyListeners()
    }, 1000)
  }

  public getState(): VehicleState {
    return { ...this.state }
  }

  public addStateListener(callback: (state: VehicleState) => void) {
    this.listeners.push(callback)
    // Immediately call with current state
    callback(this.getState())
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback)
    }
  }

  private notifyListeners() {
    const state = this.getState()
    this.listeners.forEach((listener) => listener(state))
  }

  // Command methods
  public async arm(): Promise<boolean> {
    this.state.armed = true
    this.notifyListeners()
    return true
  }

  public async disarm(): Promise<boolean> {
    this.state.armed = false
    this.notifyListeners()
    return true
  }

  public async takeoff(altitude: number): Promise<boolean> {
    if (!this.state.armed) {
      await this.arm()
    }
    this.state.mode = "GUIDED"

    // Simulate takeoff
    const startAlt = this.state.altitude
    const targetAlt = altitude
    const duration = 5000 // 5 seconds
    const startTime = Date.now()

    return new Promise((resolve) => {
      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)

        this.state.altitude = startAlt + (targetAlt - startAlt) * progress
        this.notifyListeners()

        if (progress === 1) {
          clearInterval(interval)
          resolve(true)
        }
      }, 100)
    })
  }

  public async setMode(mode: string): Promise<boolean> {
    this.state.mode = mode
    this.notifyListeners()
    return true
  }

  public async flyTo(lat: number, lon: number, alt: number): Promise<boolean> {
    if (this.state.mode !== "GUIDED") {
      await this.setMode("GUIDED")
    }

    // Simulate movement
    const startLat = this.state.latitude
    const startLon = this.state.longitude
    const startAlt = this.state.altitude
    const duration = 10000 // 10 seconds
    const startTime = Date.now()

    // Calculate heading to destination
    const dx = lon - startLon
    const dy = lat - startLat
    this.state.heading = ((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360
    this.state.groundspeed = 5 + Math.random() * 2 // Random speed between 5-7 m/s

    return new Promise((resolve) => {
      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)

        this.state.latitude = startLat + (lat - startLat) * progress
        this.state.longitude = startLon + (lon - startLon) * progress
        this.state.altitude = startAlt + (alt - startAlt) * progress
        this.notifyListeners()

        if (progress === 1) {
          clearInterval(interval)
          resolve(true)
        }
      }, 100)
    })
  }

  public async returnToLaunch(): Promise<boolean> {
    await this.setMode("RTL")
    return true
  }
}

// Singleton instance
export const mavlink = new MAVLinkInterface()
