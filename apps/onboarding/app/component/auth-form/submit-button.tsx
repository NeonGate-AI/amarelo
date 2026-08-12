'use client'

import { ArrowRight } from '@phosphor-icons/react'
import { SmoothButton } from '@repo/react-web/vendors/smoothui'
import type { ReactNode } from 'react'
import { useFormStatus } from 'react-dom'

import styles from '@component/auth-form/auth-form.module.css'

interface SubmitButtonProps {
  children: ReactNode
}

export function SubmitButton(props: SubmitButtonProps) {
  const { children } = props
  const { pending } = useFormStatus()

  return (
    <SmoothButton
      className={styles.submit}
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
