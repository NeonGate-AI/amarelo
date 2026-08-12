import type { LucideIcon, LucideProps } from 'lucide-react-native'
import { cssInterop } from 'nativewind'

export interface IconProps extends LucideProps {
  'aria-hidden'?: boolean
  as: LucideIcon
  className?: string
}

export function Icon(props: IconProps) {
  const {
    'aria-hidden': ariaHidden,
    as: IconComponent,
    color,
    size,
    strokeWidth,
    style
  } = props

  return (
    <IconComponent
      aria-hidden={ariaHidden}
      color={color}
      size={size}
      strokeWidth={strokeWidth}
      style={style}
    />
  )
}

cssInterop(Icon, {
  className: {
    nativeStyleToProp: {
      color: true,
      height: 'size',
      width: 'size'
    },
    target: 'style'
  }
})
