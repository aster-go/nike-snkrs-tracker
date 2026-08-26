export default function StatsBar({ stats, filter, view }) {
  const instockCards = [
    { label: 'สินค้าทั้งหมด', value: stats.total, icon: '📦', key: 'all', color: 'text-white' },
    { label: 'พร้อมขาย', value: stats.available, icon: '✅', key: 'available', color: 'text-green-400' },
    { label: 'รองเท้า', value: stats.footwear, icon: '👟', key: 'footwear', color: 'text-blue-400' },
    { label: 'เครื่องแต่งกาย', value: stats.apparel, icon: '👕', key: 'apparel', color: 'text-purple-400' },
  ]

  const upcomingCards = [
    { label: 'รายการทั้งหมด', value: stats.total, icon: '🗓', key: 'all', color: 'text-white' },
    { label: 'เปิดใน 24 ชม.', value: stats.today, icon: '🔥', key: 'today', color: 'text-orange-400' },
    { label: 'สัปดาห์นี้', value: stats.thisWeek, icon: '📅', key: 'thisWeek', color: 'text-yellow-400' },
    { label: 'ระบบ LEO', value: stats.leo, icon: '⚡', key: 'leo', color: 'text-blue-400' },
  ]

  const feedCards = [
    { label: 'ทั้งหมด', value: stats.total, icon: '📰', key: 'all', color: 'text-white' },
    { label: 'สินค้า', value: stats.productCards, icon: '👟', key: 'product', color: 'text-blue-400' },
    { label: 'Stories', value: stats.storyCards, icon: '📖', key: 'story', color: 'text-purple-400' },
    { label: 'Content', value: stats.contentCards, icon: '📝', key: 'content', color: 'text-yellow-400' },
  ]

  const cards = view === 'upcoming' ? upcomingCards : view === 'feed' ? feedCards : instockCards

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
      {cards.map((card) => (
        <div
          key={card.key}
          className={`bg-nike-card border rounded-xl p-3 transition-colors ${
            filter === card.key ? 'border-white' : 'border-nike-border'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-lg">{card.icon}</span>
            <span className={`text-2xl font-black ${card.color}`}>{card.value ?? 0}</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">{card.label}</p>
        </div>
      ))}
    </div>
  )
}
