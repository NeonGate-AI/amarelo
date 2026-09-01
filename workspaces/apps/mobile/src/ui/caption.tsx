import { ScrollRevealParagraph } from '@repo/react/ui/scroll-reveal-paragraph'

import type { CaptionContent } from '../state'

interface CaptionProps {
  caption: CaptionContent
}

export function Caption({ caption }: CaptionProps) {
  return (
    <div aria-atomic="true" aria-live="polite" className="relative text-center">
      <span className="sr-only">{caption.accessible}</span>
      <ScrollRevealParagraph
        aria-hidden="true"
        autoDuration={3.8}
        className="caption-visual text-[0.9375rem] leading-6 font-medium"
        key={caption.accessible}
        mode="auto"
        paragraph={caption.lines.join('\n')}
      />
    </div>
  )
}
