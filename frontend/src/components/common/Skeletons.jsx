export function ProductCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="aspect-[3/4] skeleton rounded-none mb-3" />
      <div className="space-y-2 px-0.5">
        <div className="skeleton h-3.5 w-3/4 rounded" />
        <div className="skeleton h-3 w-1/3 rounded" />
        <div className="skeleton h-4 w-1/2 rounded" />
      </div>
    </div>
  )
}

export function ProductDetailSkeleton() {
  return (
    <div className="page-container py-12 animate-pulse">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="space-y-3">
          <div className="aspect-square skeleton" />
          <div className="grid grid-cols-4 gap-2">
            {[...Array(4)].map((_, i) => <div key={i} className="aspect-square skeleton" />)}
          </div>
        </div>
        <div className="space-y-5">
          <div className="skeleton h-6 w-1/3 rounded" />
          <div className="skeleton h-10 w-3/4 rounded" />
          <div className="skeleton h-8 w-1/4 rounded" />
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-3 rounded" />)}
          </div>
          <div className="flex gap-2">
            {[...Array(5)].map((_, i) => <div key={i} className="skeleton w-12 h-10 rounded" />)}
          </div>
          <div className="skeleton h-14 w-full rounded" />
        </div>
      </div>
    </div>
  )
}

export function ReviewSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="border border-stone-100 p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="skeleton w-10 h-10 rounded-full" />
            <div className="space-y-1.5">
              <div className="skeleton h-3 w-24 rounded" />
              <div className="skeleton h-2.5 w-16 rounded" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="skeleton h-3 rounded" />
            <div className="skeleton h-3 w-5/6 rounded" />
            <div className="skeleton h-3 w-4/6 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function OrderSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="border border-stone-100 p-5 space-y-3">
          <div className="flex justify-between">
            <div className="skeleton h-4 w-32 rounded" />
            <div className="skeleton h-4 w-20 rounded" />
          </div>
          <div className="skeleton h-3 w-48 rounded" />
          <div className="flex gap-3">
            {[...Array(2)].map((_, j) => <div key={j} className="skeleton w-14 h-14" />)}
          </div>
        </div>
      ))}
    </div>
  )
}