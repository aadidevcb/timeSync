import BASE_URL from '../api.js'

const INTERVAL_MS = 14 * 60 * 1000 // 14 minutes

export function startKeepAlive() {
  const ping = () =>
    fetch(`${BASE_URL}/health`).catch(() => {})

  ping() // ping immediately on start
  setInterval(ping, INTERVAL_MS)
}
