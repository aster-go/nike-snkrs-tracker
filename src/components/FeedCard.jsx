import { useState } from 'react'
import ProductCard from './ProductCard'

function StoryCard({ item }) {
  const [imgError, setImgError] = useState(false)
  const imageUrl = imgError ? null : item.cover_card?.portrait_image?.url
  const nikeUrl = `https://www.nike.com/th/launch/t/${item.seo_slug || ''}`

  return (
    <a
      href={nikeUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-nike-card border border-nike-border rounded-2xl overflow-hidden card-hover group"
    >
      <div className="relative aspect-square bg-gray-900 overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={item.title}
            className="product-image w-full h-full object-cover"
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-600 text-5xl">
            📖
          </div>
        )}
        <div className="absolute top-2 left-2">
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-900/90 text-purple-300 border border-purple-600 uppercase tracking-wider">
            Story
          </span>
        </div>
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-black/30 transition-opacity" />
      </div>

      <div className="p-3 space-y-2">
        {item.author_name && (
          <div className="flex items-center gap-2">
            {item.author_avatar_url && (
              <img
                src={item.author_avatar_url}
                alt={item.author_name}
                className="w-5 h-5 rounded-full object-cover"
                onError={(e) => { e.target.style.display = 'none' }}
              />
            )}
            <span className="text-xs text-purple-400 font-medium">{item.author_name}</span>
          </div>
        )}
        <h3 className="text-sm font-bold text-white leading-tight" title={item.title}>
          {item.title}
        </h3>
        {item.author_byline && (
          <p className="text-xs text-gray-500">{item.author_byline}</p>
        )}
        {item.publication_date && (
          <p className="text-xs text-gray-600">
            {new Date(item.publication_date).toLocaleDateString('th-TH', {
              year: 'numeric', month: 'short', day: 'numeric',
            })}
          </p>
        )}
      </div>
    </a>
  )
}

function ContentCard({ item }) {
  const [imgError, setImgError] = useState(false)
  const imageUrl = imgError ? null : (item.cover_card?.portrait_image?.url || item.cover_card?.square_image?.url)
  const nikeUrl = `https://www.nike.com/th/launch/t/${item.seo_slug || ''}`
  const colorTheme = item.cover_card?.color_theme

  return (
    <a
      href={nikeUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-nike-card border border-nike-border rounded-2xl overflow-hidden card-hover group"
    >
      <div className="relative aspect-square overflow-hidden bg-gray-900">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={item.title}
            className="product-image w-full h-full object-cover"
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-600 text-5xl">
            📰
          </div>
        )}
        <div className="absolute top-2 left-2">
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-800/90 text-gray-300 border border-gray-600 uppercase tracking-wider">
            Content
          </span>
        </div>
      </div>

      <div className="p-3 space-y-1.5">
        <h3 className={`text-sm font-bold leading-tight ${colorTheme === 'light' ? 'text-gray-200' : 'text-white'}`}
          title={item.title}
        >
          {item.title}
        </h3>
        {item.cover_card?.title && (
          <p className="text-xs text-gray-400">{item.cover_card.title}</p>
        )}
        {item.publication_date && (
          <p className="text-xs text-gray-600">
            {new Date(item.publication_date).toLocaleDateString('th-TH', {
              year: 'numeric', month: 'short', day: 'numeric',
            })}
          </p>
        )}
      </div>
    </a>
  )
}

export default function FeedCard({ item }) {
  const type = item.type

  if (type === 'product-card') {
    return <ProductCard item={item} isUpcoming={false} />
  }

  if (type === 'story-card') {
    return <StoryCard item={item} />
  }

  if (type === 'content-card') {
    return <ContentCard item={item} />
  }

  return null
}

export function getFeedCardType(item) {
  return item.type || 'product-card'
}
