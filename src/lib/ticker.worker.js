// Zegar w workerze: timery w workerach nie są dławione, gdy karta jest w tle,
// więc pomiar trwa, nawet gdy użytkownik pracuje w innym oknie.
let id = null
self.onmessage = (e) => {
  const { cmd, interval } = e.data
  if (cmd === 'start') {
    clearInterval(id)
    id = setInterval(() => self.postMessage('tick'), interval)
  } else if (cmd === 'stop') {
    clearInterval(id)
    id = null
  }
}
