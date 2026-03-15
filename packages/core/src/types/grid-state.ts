export type GridMode = 'up' | 'down'

export interface GridState {
  tribeId: string
  mode: GridMode
  isSimulation: boolean    // true = drill or personal simulation, false = real declaration
  setBy: string            // memberPub or 'device' for local-only
  setByName: string
  setAt: number
  expiresAt: number        // setAt + 3/5/7 days (real) or drill end (simulation)
  message?: string
}
