'use client'

import { ArrowRight } from '@phosphor-icons/react'
import { SmoothButton } from '@repo/react/vendors/smoothui'
import type { ReactNode } from 'react'
import { useFormStatus } from 'react-dom'

interface SubmitButtonProps {
  children: ReactNode
}

export function SubmitButton(props: SubmitButtonProps) {
  const { children } = props
  const { pending } = useFormStatus()

  return (
    <SmoothButton
      className="mt-[.15rem] min-h-[2.85rem] w-full font-bold text-primary-foreground"
      color="accent"
      loading={pending}
      shape="pill"
      size="lg"
      suffix={<ArrowRight aria-hidden="true" size={18} />}
      type="submit"
      variant="solid"
    >
      {pending ? 'Só um instante' : children}
    </SmoothButton>
  )
}
