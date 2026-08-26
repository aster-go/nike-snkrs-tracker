export default function SkeletonCard() {
  return (
    <div className="bg-nike-card border border-nike-border rounded-2xl overflow-hidden">
      <div className="aspect-square skeleton" />
      <div className="p-3 space-y-3">
        <div className="flex justify-between gap-2">
          <div className="flex-1 space-y-2">
            <div className="h-4 skeleton rounded w-3/4" />
            <div className="h-3 skeleton rounded w-1/2" />
          </div>
          <div className="h-4 skeleton rounded w-16" />
        </div>
        <div className="flex gap-2">
          <div className="h-5 skeleton rounded w-20" />
          <div className="h-5 skeleton rounded w-12" />
        </div>
        <div className="h-3 skeleton rounded w-32" />
        <div className="flex flex-wrap gap-1">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-6 skeleton rounded w-10" />
          ))}
        </div>
      </div>
    </div>
  )
}
