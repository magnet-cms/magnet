import {
  FieldValues,
  FormProvider as Form,
  SubmitHandler,
  UseFormReturn,
} from 'react-hook-form'

import clsx from 'clsx'

type Props<T extends FieldValues> = {
  children: React.ReactNode
  onSubmit: SubmitHandler<T>
  className?: string
} & UseFormReturn<T>

export const FormProvider = <T extends FieldValues>({
  children,
  className,
  onSubmit,
  ...methods
}: Props<T>) => {
  return (
    <Form {...methods}>
      <form
        onSubmit={methods.handleSubmit(onSubmit)}
        className={clsx(className)}
      >
        {children}
      </form>
    </Form>
  )
}
