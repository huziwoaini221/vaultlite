import { useState, useEffect } from 'react'
import Welcome from '../pages/Welcome'
import Unlock from '../pages/Unlock'
import Vault from '../pages/Vault'

type AppState = 'loading' | 'welcome' | 'unlock' | 'vault'

export default function App() {
  const [state, setState] = useState<AppState>('loading')

  useEffect(() => {
    const encrypted = localStorage.getItem('vaultlite_encrypted')
    const pw = sessionStorage.getItem('vaultlite_master_password')
    if (encrypted && pw) {
      setState('vault')
    } else if (encrypted) {
      setState('unlock')
    } else {
      setState('welcome')
    }
  }, [])

  return (
    <div style={{ minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', color: '#1a1a2e' }}>
      {state === 'welcome' && <Welcome onInit={() => setState('vault')} />}
      {state === 'unlock' && <Unlock onUnlock={() => setState('vault')} />}
      {state === 'vault' && <Vault />}
    </div>
  )
}
