import { useState, useRef, useEffect, useCallback } from 'react'
import { BrowserMultiFormatReader, Result, BarcodeFormat } from '@zxing/library'

interface QRScannerProps {
  onResult: (secret: string, label?: string, issuer?: string) => void
  onClose: () => void
}

export default function QRScanner({ onResult, onClose }: QRScannerProps) {
  const [mode, setMode] = useState<'file' | 'camera'>('file')
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const readerRef = useRef<BrowserMultiFormatReader | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const parseOTPAuth = (text: string): { secret: string; label?: string; issuer?: string } | null => {
    try {
      const url = new URL(text)
      if (url.protocol !== 'otpauth:' || url.hostname !== 'totp') return null
      const secret = url.searchParams.get('secret')
      if (!secret) return null
      const label = url.pathname.slice(1) || undefined
      const issuer = url.searchParams.get('issuer') || undefined
      return { secret: secret.replace(/\s/g, ''), label, issuer }
    } catch {
      return null
    }
  }

  const handleDecode = useCallback((result: Result) => {
    const parsed = parseOTPAuth(result.getText())
    if (parsed) {
      onResult(parsed.secret, parsed.label, parsed.issuer)
      onClose()
    } else {
      setError('Not a valid TOTP QR code (expected otpauth://totp/...)')
    }
  }, [onResult, onClose])

  const startCamera = useCallback(async () => {
    if (readerRef.current) return
    const reader = new BrowserMultiFormatReader()
    readerRef.current = reader
    setScanning(true)
    setError('')
    try {
      const devices = await reader.listVideoInputDevices()
      if (devices.length === 0) throw new Error('No camera found')
      await reader.decodeFromVideoDevice(devices[0].deviceId, videoRef.current!, (result, err) => {
        if (result) handleDecode(result)
        if (err && !(err instanceof Error && err.name === 'NotFoundException')) {
          console.warn('QR scan error:', err)
        }
      })
    } catch (err) {
      setError((err as Error).message)
      setScanning(false)
      readerRef.current = null
    }
  }, [handleDecode])

  const stopCamera = useCallback(() => {
    if (readerRef.current) {
      readerRef.current.reset()
      readerRef.current = null
    }
    setScanning(false)
  }, [])

  const handleFile = useCallback(async (file: File) => {
    setError('')
    const reader = new BrowserMultiFormatReader()
    try {
      const url = URL.createObjectURL(file)
      const img = new Image()
      img.src = url
      await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject })
      const result = await reader.decodeFromImage(img)
      URL.revokeObjectURL(url)
      handleDecode(result)
    } catch (err) {
      setError('Failed to decode QR code from image')
    }
  }, [handleDecode])

  useEffect(() => {
    if (mode === 'camera') startCamera()
    else stopCamera()
    return () => stopCamera()
  }, [mode, startCamera, stopCamera])

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={{ margin: 0, fontSize: 16 }}>Scan TOTP QR Code</h3>
        <button onClick={onClose} style={styles.closeBtn}>×</button>
      </div>

      <div style={styles.tabs}>
        <button onClick={() => setMode('file')} style={{ ...styles.tab, ...(mode === 'file' ? styles.tabActive : {}) }}>Upload Image</button>
        <button onClick={() => setMode('camera')} style={{ ...styles.tab, ...(mode === 'camera' ? styles.tabActive : {}) }}>Camera</button>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {mode === 'file' && (
        <div style={styles.dropZone}>
          <input ref={fileInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
          <button onClick={() => fileInputRef.current?.click()} style={styles.btn}>
            Choose QR Code Image
          </button>
          <p style={styles.hint}>Supports PNG, JPG, WebP. The QR code must contain an <code>otpauth://totp/...</code> URI.</p>
        </div>
      )}

      {mode === 'camera' && (
        <div style={styles.cameraContainer}>
          <video ref={videoRef} style={styles.video} playsInline autoPlay muted />
          {!scanning && <div style={styles.overlay}>Starting camera...</div>}
        </div>
      )}

      <button onClick={onClose} style={styles.cancelBtn}>Cancel</button>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, padding: 20, boxSizing: 'border-box',
  },
  header: { width: '100%', maxWidth: 400, display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff', marginBottom: 16 },
  closeBtn: { background: 'transparent', border: 'none', color: '#fff', fontSize: 28, cursor: 'pointer', lineHeight: 1 },
  tabs: { display: 'flex', gap: 8, marginBottom: 16, maxWidth: 400 },
  tab: { flex: 1, padding: '10px', borderRadius: 6, border: '1px solid #555', background: '#2a2a3e', color: '#ccc', cursor: 'pointer', fontSize: 14 },
  tabActive: { background: '#3182ce', borderColor: '#3182ce', color: '#fff' },
  error: { maxWidth: 400, marginBottom: 12, padding: '8px 12px', borderRadius: 6, background: '#fff5f5', border: '1px solid #fc8181', color: '#c53030', fontSize: 13 },
  dropZone: { maxWidth: 400, textAlign: 'center', padding: '32px 16px', border: '2px dashed #555', borderRadius: 8, background: '#1e1e32' },
  btn: { padding: '10px 24px', borderRadius: 6, border: 'none', background: '#3182ce', color: '#fff', fontSize: 14, cursor: 'pointer' },
  hint: { marginTop: 12, fontSize: 12, color: '#888' },
  cameraContainer: { maxWidth: 400, width: '100%', borderRadius: 8, overflow: 'hidden', background: '#000' },
  video: { width: '100%', height: 'auto', display: 'block' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontSize: 14 },
  cancelBtn: { maxWidth: 400, marginTop: 16, padding: '10px', borderRadius: 6, border: '1px solid #555', background: 'transparent', color: '#ccc', cursor: 'pointer', fontSize: 14 },
}