import { useState, useEffect, useRef, useCallback } from 'react'

const STORAGE_KEY = 'snkrs_notif_settings'

const defaultSettings = {
  enabled: false,
  sound: true,
  browserNotif: true,
  pollInterval: 10, // seconds for imminent launches
}

function loadSettings() {
  try {
    return { ...defaultSettings, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') }
  } catch {
    return defaultSettings
  }
}

function playBeep(volume = 0.8) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()
    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)
    oscillator.frequency.setValueAtTime(880, ctx.currentTime)
    oscillator.frequency.setValueAtTime(1100, ctx.currentTime + 0.1)
    oscillator.frequency.setValueAtTime(880, ctx.currentTime + 0.2)
    gainNode.gain.setValueAtTime(volume, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.5)
  } catch {}
}

export function useNotifications(upcomingProducts) {
  const [settings, setSettings] = useState(loadSettings)
  const [liveProducts, setLiveProducts] = useState([])
  const [notifLog, setNotifLog] = useState([])
  const notifiedRef = useRef(new Set())
  const pollRef = useRef(null)

  const saveSettings = useCallback((newSettings) => {
    const merged = { ...settings, ...newSettings }
    setSettings(merged)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
    return merged
  }, [settings])

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return 'unsupported'
    if (Notification.permission === 'granted') return 'granted'
    const result = await Notification.requestPermission()
    return result
  }, [])

  const fireNotification = useCallback((product, launchId, title) => {
    if (notifiedRef.current.has(launchId)) return
    notifiedRef.current.add(launchId)

    const notifEntry = {
      id: launchId,
      title,
      time: new Date(),
      product,
    }
    setNotifLog((prev) => [notifEntry, ...prev.slice(0, 49)])
    setLiveProducts((prev) => {
      if (prev.find((p) => p.launchId === launchId)) return prev
      return [{ launchId, title, product, time: new Date() }, ...prev]
    })

    if (settings.sound) playBeep()

    if (settings.browserNotif && Notification.permission === 'granted') {
      const n = new Notification(`🟢 LIVE! ${title}`, {
        body: 'เปิดรับสมัครแล้ว! คลิกเพื่อไปที่ Nike SNKRS',
        icon: 'https://static.nike.com/a/images/w_1536,c_limit/bzl2wmsfh7kgdkufrrjq/swoosh-wordmark-white.png',
        tag: launchId,
        requireInteraction: true,
      })
      n.onclick = () => {
        window.open(`https://www.nike.com/th/launch/t/${product.seo_slug || ''}`, '_blank')
        n.close()
      }
    }
  }, [settings])

  // Poll launch states for upcoming products that have launch_id
  useEffect(() => {
    if (!settings.enabled || !upcomingProducts?.length) return

    const productsWithLaunch = upcomingProducts.flatMap((item) => {
      return (item.products || []).map((p) => {
        const launch = p.launches?.[0]
        if (!launch?.launch_id) return null
        return { item, product: p, launch, threadId: item.thread_id, slug: item.seo_slug }
      }).filter(Boolean)
    })

    if (!productsWithLaunch.length) return

    const poll = async () => {
      for (const { item, product, launch } of productsWithLaunch) {
        const now = new Date()
        const startDate = new Date(launch.start_entry_date)
        const diff = startDate - now
        // Only poll actively if within 60 minutes of launch
        if (diff > 60 * 60 * 1000) continue

        try {
          const res = await fetch(`/api/launch-state/${launch.launch_id}`)
          if (!res.ok) continue
          const data = await res.json()
          if (data.launchState === 'ACCEPTING_ENTRIES') {
            const title = item.title || product.title
            fireNotification({ ...product, seo_slug: item.seo_slug }, launch.launch_id, title)
          }
        } catch {}

        // Small delay between requests
        await new Promise((r) => setTimeout(r, 500))
      }
    }

    poll()
    pollRef.current = setInterval(poll, settings.pollInterval * 1000)
    return () => clearInterval(pollRef.current)
  }, [settings.enabled, settings.pollInterval, upcomingProducts, fireNotification])

  return {
    settings,
    saveSettings,
    requestPermission,
    liveProducts,
    notifLog,
    clearLive: () => setLiveProducts([]),
    clearLog: () => setNotifLog([]),
  }
}
