export default function FilterBar({ filter, setFilter, sortBy, setSortBy, search, setSearch, resultCount, view }) {
  const instockFilters = [
    { key: 'all', label: 'ทั้งหมด' },
    { key: 'available', label: '✅ พร้อมขาย' },
    { key: 'footwear', label: '👟 รองเท้า' },
    { key: 'apparel', label: '👕 เครื่องแต่งกาย' },
    { key: 'multi', label: '🗂 Set' },
  ]

  const upcomingFilters = [
    { key: 'all', label: 'ทั้งหมด' },
    { key: 'footwear', label: '👟 รองเท้า' },
    { key: 'apparel', label: '👕 เครื่องแต่งกาย' },
    { key: 'multi', label: '🗂 Set' },
    { key: 'invite', label: '✉️ Invite Only' },
  ]

  const instockSorts = [
    { key: 'newest', label: 'ใหม่ล่าสุด' },
    { key: 'price_asc', label: 'ราคา ต่ำ→สูง' },
    { key: 'price_desc', label: 'ราคา สูง→ต่ำ' },
    { key: 'name', label: 'ชื่อ A–Z' },
  ]

  const upcomingSorts = [
    { key: 'launch_asc', label: '⏳ เร็วที่สุดก่อน' },
    { key: 'newest', label: 'ล่าสุด' },
    { key: 'price_asc', label: 'ราคา ต่ำ→สูง' },
    { key: 'price_desc', label: 'ราคา สูง→ต่ำ' },
  ]

  const feedFilters = [
    { key: 'all', label: 'ทั้งหมด' },
    { key: 'product', label: '👟 สินค้า' },
    { key: 'story', label: '📖 Stories' },
    { key: 'content', label: '📝 Content' },
  ]

  const feedSorts = [
    { key: 'newest', label: 'ใหม่ล่าสุด' },
    { key: 'name', label: 'ชื่อ A–Z' },
  ]

  const filters = view === 'upcoming' ? upcomingFilters : view === 'feed' ? feedFilters : instockFilters
  const sorts = view === 'upcoming' ? upcomingSorts : view === 'feed' ? feedSorts : instockSorts

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ค้นหา รุ่น / สี / รหัส..."
          className="w-full bg-nike-card border border-nike-border text-white placeholder-gray-500 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-white transition-colors"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
          >
            ✕
          </button>
        )}
      </div>

      {/* Filter + Sort Row */}
      <div className="flex flex-wrap items-center gap-2 justify-between">
        {/* Filter pills */}
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
                filter === f.key
                  ? 'bg-white text-black border-white'
                  : 'bg-transparent text-gray-300 border-nike-border hover:border-gray-400'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Sort + Result count */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 whitespace-nowrap">
            {resultCount} รายการ
          </span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-nike-card border border-nike-border text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-white appearance-none cursor-pointer"
          >
            {sorts.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
