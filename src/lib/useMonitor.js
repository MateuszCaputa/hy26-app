import { useEffect, useState } from 'react'
import { monitor } from './monitor'

export function useMonitor() {
  const [state, setState] = useState(monitor.state)
  useEffect(() => monitor.subscribe(setState), [])
  return state
}
