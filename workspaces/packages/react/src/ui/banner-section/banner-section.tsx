import type { ReactNode } from 'react'

export interface BannerImageSource {
  src: string
}

export interface BannerSectionProps {
  alt: string
  children: ReactNode
  height: number
  priority?: boolean
  sizes?: string
  src: BannerImageSource | string
  width: number
}

export function BannerSection(props: BannerSectionProps) {
  const { alt, children, height, priority, sizes, src, width } = props
  const resolvedSrc = typeof src === 'string' ? src : src.src

  return (
    <section>
      <div className="relative overflow-hidden">
        {/* biome-ignore lint/performance/noImgElement: this cross-framework package cannot require a Next.js image component. */}
        <img
          alt={alt}
          className="block h-auto w-full"
          fetchPriority={priority ? 'high' : undefined}
          height={height}
          loading={priority ? 'eager' : 'lazy'}
          sizes={sizes}
          src={resolvedSrc}
          width={width}
        />
        {children}
      </div>
    </section>
  )
}
