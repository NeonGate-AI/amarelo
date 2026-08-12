import Image, { type ImageProps } from 'next/image'
import type { ReactNode } from 'react'

export interface BannerSectionProps {
  alt: string
  children: ReactNode
  height: number
  priority?: boolean
  sizes?: string
  src: ImageProps['src']
  width: number
}

export function BannerSection(props: BannerSectionProps) {
  const { alt, children, height, priority, sizes, src, width } = props

  return (
    <section>
      <div className="relative overflow-hidden">
        <Image
          alt={alt}
          className="block h-auto w-full"
          height={height}
          priority={priority}
          sizes={sizes}
          src={src}
          width={width}
        />
        {children}
      </div>
    </section>
  )
}
