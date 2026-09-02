'use client'

import { CheckFatIcon } from '@phosphor-icons/react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import {
  cloneElement,
  createContext,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState
} from 'react'

import {
  DURATION_INSTANT,
  SPRING_DEFAULT,
  SPRING_SNAPPY
} from '@repo/react/vendors/smoothui/lib'
import { cn } from '@repo/react/utilities'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STAGGER_DELAY = 0.04
const SHAKE_KEYFRAMES = [0, -6, 5, -4, 3, -1, 0]

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FormErrors = Record<string, string | undefined>

export interface FormProps {
  /** Form contents */
  children: React.ReactNode
  /** Optional CSS class */
  className?: string
  /** External errors object (e.g. from react-hook-form's `formState.errors`) */
  errors?: FormErrors
  /** Callback invoked on native form submit with current errors map */
  onFormSubmit?: (e: React.FormEvent<HTMLFormElement>) => void
}

export interface FormFieldProps {
  /** Field contents (label, input, message) */
  children: React.ReactNode
  /** Optional CSS class for the field wrapper */
  className?: string
  /** Unique field name — used to look up errors */
  name: string
}

export interface FormLabelProps {
  /** Label text */
  children: React.ReactNode
  /** Optional CSS class */
  className?: string
}

export interface FormMessageProps {
  /** Override the error message (otherwise pulled from FormField context) */
  children?: React.ReactNode
  /** Optional CSS class */
  className?: string
}

export interface FormDescriptionProps {
  /** Description text */
  children: React.ReactNode
  /** Optional CSS class */
  className?: string
}

interface FormControlProps {
  children: React.ReactNode
  className?: string
}

interface FormFieldInnerProps {
  children: React.ReactNode
  className?: string
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface FormContextValue {
  errors: FormErrors
  prevErrors: FormErrors
  submitCount: number
}

interface FormFieldContextValue {
  error: string | undefined
  fieldIndex: number
  formDescriptionId: string
  formItemId: string
  formMessageId: string
  id: string
  name: string
  prevError: string | undefined
  submitCount: number
}

const FormContext = createContext<FormContextValue>({
  errors: {},
  submitCount: 0,
  prevErrors: {}
})
const FormFieldContext = createContext<FormFieldContextValue | null>(null)

const useFormCtx = () => useContext(FormContext)

const useFormFieldCtx = () => {
  const ctx = useContext(FormFieldContext)
  if (!ctx) {
    throw new Error('FormLabel / FormMessage must be used inside <FormField>')
  }
  return ctx
}

// ---------------------------------------------------------------------------
// Form
// ---------------------------------------------------------------------------

export function Form(props: FormProps) {
  const { children, className, errors = {}, onFormSubmit } = props

  const [submitCount, setSubmitCount] = useState(0)
  const prevErrorsRef = useRef<FormErrors>({})
  const [prevErrors, setPrevErrors] = useState<FormErrors>({})

  const ctxValue = useMemo(
    () => ({ errors, submitCount, prevErrors }),
    [errors, submitCount, prevErrors]
  )

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    setPrevErrors(prevErrorsRef.current)
    prevErrorsRef.current = errors
    setSubmitCount((currentCount) => currentCount + 1)
    if (onFormSubmit) {
      onFormSubmit(event)
    }
  }

  return (
    <FormContext.Provider value={ctxValue}>
      <form
        className={cn('grid gap-3', className)}
        noValidate
        onSubmit={handleSubmit}
      >
        {children}
      </form>
    </FormContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// FormField — staggered entrance + validation shake
// ---------------------------------------------------------------------------

let fieldCounter = 0

export function FormField(props: FormFieldProps) {
  const { children, className, name } = props

  const id = useId()
  const fieldIndexRef = useRef<number | null>(null)
  const { errors, prevErrors, submitCount } = useFormCtx()

  const error = errors[name]
  const prevError = prevErrors[name]

  if (fieldIndexRef.current === null) {
    fieldIndexRef.current = fieldCounter
    fieldCounter += 1
  }

  const ctxValue = useMemo(
    () => ({
      name,
      id,
      error,
      formItemId: `${id}-form-item`,
      formDescriptionId: `${id}-form-item-description`,
      formMessageId: `${id}-form-item-message`,
      fieldIndex: fieldIndexRef.current ?? 0,
      submitCount,
      prevError
    }),
    [name, id, error, submitCount, prevError]
  )

  useEffect(
    () => () => {
      if (fieldIndexRef.current === 0) {
        fieldCounter = 0
      }
    },
    []
  )

  return (
    <FormFieldContext.Provider value={ctxValue}>
      <FormFieldInner className={className}>{children}</FormFieldInner>
    </FormFieldContext.Provider>
  )
}

/** Inner component that can consume FormFieldContext */
function FormFieldInner(props: FormFieldInnerProps) {
  const { children, className } = props

  const [shakeKey, setShakeKey] = useState(0)
  const shouldReduceMotion = useReducedMotion()
  const { error, fieldIndex, submitCount } = useFormFieldCtx()

  const shouldShake = error && submitCount > 0

  // biome-ignore lint/correctness/useExhaustiveDependencies: <not my lib>
  useEffect(() => {
    if (shouldShake) {
      setShakeKey((k) => k + 1)
    }
  }, [shouldShake, submitCount])

  return (
    <motion.div
      animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      className={cn('grid gap-1.5', className)}
      data-slot="form-field"
      initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
      transition={
        shouldReduceMotion
          ? DURATION_INSTANT
          : {
              ...SPRING_DEFAULT,
              delay: fieldIndex * STAGGER_DELAY
            }
      }
    >
      <motion.div
        animate={
          shouldShake && !shouldReduceMotion ? { x: SHAKE_KEYFRAMES } : { x: 0 }
        }
        className="grid gap-1.5"
        key={shakeKey}
        transition={
          shouldReduceMotion
            ? DURATION_INSTANT
            : { duration: 0.4, ease: [0.36, 0.07, 0.19, 0.97] }
        }
      >
        {children}
      </motion.div>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// FormLabel
// ---------------------------------------------------------------------------

export function FormLabel(props: FormLabelProps) {
  const { children, className } = props

  const { formItemId, error } = useFormFieldCtx()

  return (
    <label
      className={cn(
        'font-medium text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        error && 'text-destructive',
        className
      )}
      data-slot="form-label"
      htmlFor={formItemId}
    >
      {children}
    </label>
  )
}

// ---------------------------------------------------------------------------
// FormControl — renders a wrapper with animated focus ring
// ---------------------------------------------------------------------------

export function FormControl(props: FormControlProps) {
  const { children, className } = props

  const [isFocused, setIsFocused] = useState(false)
  const shouldReduceMotion = useReducedMotion()
  const { error, formDescriptionId, formItemId, formMessageId } =
    useFormFieldCtx()

  function handleBlur() {
    setIsFocused(false)
  }

  function handleFocus() {
    setIsFocused(true)
  }

  return (
    <motion.div
      animate={
        shouldReduceMotion
          ? {}
          : {
              boxShadow: isFocused
                ? '0 0 0 3px hsl(var(--ring) / 0.3)'
                : '0 0 0 0px hsl(var(--ring) / 0)'
            }
      }
      className={cn('rounded-md', className)}
      data-slot="form-control"
      onBlur={handleBlur}
      onFocus={handleFocus}
      transition={shouldReduceMotion ? DURATION_INSTANT : SPRING_SNAPPY}
    >
      {cloneChildWithA11y(children, {
        id: formItemId,
        'aria-describedby': error
          ? `${formDescriptionId} ${formMessageId}`
          : formDescriptionId,
        'aria-invalid': error ? true : undefined
      })}
    </motion.div>
  )
}

function cloneChildWithA11y(
  children: React.ReactNode,
  a11yProps: Record<string, unknown>
): React.ReactNode {
  const child = Array.isArray(children) ? children[0] : children
  if (child && typeof child === 'object' && 'type' in child) {
    const element = child as React.ReactElement<Record<string, unknown>>
    // biome-ignore lint/suspicious/noExplicitAny: cloneElement requires flexible typing
    return cloneElement(element as any, a11yProps)
  }
  return children
}

// ---------------------------------------------------------------------------
// FormDescription
// ---------------------------------------------------------------------------

export function FormDescription(props: FormDescriptionProps) {
  const { children, className } = props

  const { formDescriptionId } = useFormFieldCtx()

  return (
    <p
      className={cn('text-muted-foreground text-sm', className)}
      data-slot="form-description"
      id={formDescriptionId}
    >
      {children}
    </p>
  )
}

// ---------------------------------------------------------------------------
// FormMessage — animated error message with success state
// ---------------------------------------------------------------------------

export function FormMessage(props: FormMessageProps) {
  const { children, className } = props

  const shouldReduceMotion = useReducedMotion()
  const { error, formMessageId, submitCount, prevError } = useFormFieldCtx()

  const body = children ?? error

  // Show success checkmark when error was just cleared after a submit
  const wasError = prevError && !error && submitCount > 0

  return (
    <div>
      <AnimatePresence mode="wait">
        {body ? (
          <motion.p
            animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            className={cn('text-destructive text-sm', className)}
            data-slot="form-message"
            exit={
              shouldReduceMotion
                ? { opacity: 0, transition: { duration: 0 } }
                : { opacity: 0, y: -4 }
            }
            id={formMessageId}
            initial={
              shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: -4 }
            }
            key={typeof body === 'string' ? body : 'message'}
            role="alert"
            transition={shouldReduceMotion ? DURATION_INSTANT : SPRING_DEFAULT}
          >
            {body}
          </motion.p>
        ) : wasError ? (
          <motion.div
            animate={
              shouldReduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }
            }
            className="flex items-center gap-1 text-sm"
            exit={
              shouldReduceMotion
                ? { opacity: 0, transition: { duration: 0 } }
                : { opacity: 0, scale: 0.9 }
            }
            initial={
              shouldReduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.8 }
            }
            key="success"
            transition={
              shouldReduceMotion
                ? DURATION_INSTANT
                : {
                    type: 'spring' as const,
                    stiffness: 300,
                    damping: 20,
                    duration: 0.25
                  }
            }
          >
            <motion.span
              animate={shouldReduceMotion ? {} : { scale: 1 }}
              initial={shouldReduceMotion ? {} : { scale: 0 }}
              transition={
                shouldReduceMotion
                  ? DURATION_INSTANT
                  : {
                      type: 'spring' as const,
                      stiffness: 400,
                      damping: 15,
                      duration: 0.2,
                      delay: 0.05
                    }
              }
            >
              <CheckFatIcon size={3.5} className="text-emerald-500" />
            </motion.span>
            <span className="text-emerald-500">Looks good</span>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
