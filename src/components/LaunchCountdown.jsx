import { useState, useEffect } from 'react'

function getTimeLeft(targetDate) {
  const diff = new Date(targetDate) - new Date()
  if (diff <= 0) return null
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const secs = Math.floor((diff % (1000 * 60)) / 1000)
  return { days, hours, mins, secs, diff }
}

export default function LaunchCountdown({ startDate, stopDate }) {
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(startDate))
  const [stopTimeLeft, setStopTimeLeft] = useState(() => stopDate ? getTimeLeft(stopDate) : null)
  const isOpen = !timeLeft && stopTimeLeft // launch window is open
  const isClosed = !timeLeft && !stopTimeLeft && stopDate // launch window closed

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeLeft(startDate))
      setStopTimeLeft(stopDate ? getTimeLeft(stopDate) : null)
    }, 1000)
    return () => clearInterval(timer)
  }, [startDate, stopDate])

  if (isClosed) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-800/50 rounded-lg px-2 py-1.5">
        <span>🔒</span>
        <span>หมดเวลาลงทะเบียน</span>
      </div>
    )
  }

  if (isOpen) {
    const { days: sd, hours: sh, mins: sm, secs: ss } = stopTimeLeft
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 text-xs font-bold text-green-400 animate-pulse">
          <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
          เปิดให้ลงทะเบียนแล้ว!
        </div>
        <div className="text-xs text-gray-400">
          ปิดรับใน{' '}
          {sd > 0 && <span className="text-white font-bold">{sd}ว </span>}
          <span className="text-white font-bold">{String(sh).padStart(2,'0')}:</span>
          <span className="text-white font-bold">{String(sm).padStart(2,'0')}:</span>
          <span className="text-white font-bold">{String(ss).padStart(2,'0')}</span>
        </div>
      </div>
    )
  }

  if (!timeLeft) {
    return (
      <div className="text-xs text-gray-400 bg-gray-800/50 rounded-lg px-2 py-1.5">
        🚀 เปิดให้ซื้อแล้ว
      </div>
    )
  }

  const { days, hours, mins, secs } = timeLeft
  const isUrgent = days === 0 && hours < 24

  return (
    <div className={`rounded-lg px-2 py-1.5 ${isUrgent ? 'bg-orange-900/30 border border-orange-700/50' : 'bg-gray-800/50'}`}>
      <div className="text-xs text-gray-400 mb-1">⏳ เปิดลงทะเบียนใน</div>
      <div className="flex items-center gap-1">
        {days > 0 && (
          <span className={`font-black text-sm ${isUrgent ? 'text-orange-400' : 'text-white'}`}>
            {days}<span className="text-xs font-normal text-gray-400">ว</span>
          </span>
        )}
        <span className={`font-black text-sm tabular-nums ${isUrgent ? 'text-orange-400' : 'text-white'}`}>
          {String(hours).padStart(2,'0')}
        </span>
        <span className="text-gray-500 text-xs">:</span>
        <span className={`font-black text-sm tabular-nums ${isUrgent ? 'text-orange-400' : 'text-white'}`}>
          {String(mins).padStart(2,'0')}
        </span>
        <span className="text-gray-500 text-xs">:</span>
        <span className={`font-black text-sm tabular-nums ${isUrgent ? 'text-orange-400' : 'text-white'}`}>
          {String(secs).padStart(2,'0')}
        </span>
      </div>
    </div>
  )
}
