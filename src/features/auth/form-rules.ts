import { z } from 'zod'

import { authCopy } from '#/features/auth/copy'

// One schema per form, shared by the screen for validation and for the types
// it submits. Better Auth's defaults bound the password (8–128).

const invalid = authCopy.invalid

const username = z
  .string()
  .transform((value) => value.trim().normalize('NFC'))
  .pipe(
    z
      .string()
      .min(1, invalid.usernameRequired)
      .pipe(
        z
          .string()
          .min(3, invalid.usernameTooShort)
          .max(30, invalid.usernameTooLong)
          .regex(/^[\p{L}\p{N}_.]+$/u, invalid.usernameCharacters),
      ),
  )

const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.string().min(1, invalid.emailRequired).pipe(z.email(invalid.emailInvalid)))

export const signUpSchema = z.object({
  username,
  email,
  password: z
    .string()
    .min(1, invalid.passwordRequired)
    .pipe(z.string().min(8, invalid.passwordTooShort).max(128, invalid.passwordTooLong)),
})

/** No length rule on sign-in, so an older password is never rejected here. */
export const signInSchema = z.object({
  email,
  password: z.string().min(1, invalid.passwordRequired),
})

export type SignUpInput = z.infer<typeof signUpSchema>
export type SignInInput = z.infer<typeof signInSchema>

export type FieldName = 'username' | 'email' | 'password'

/** The first message per field, or nothing when the values are valid. */
export function fieldErrorsOf(
  schema: typeof signUpSchema | typeof signInSchema,
  values: Record<FieldName, string>,
): Partial<Record<FieldName, string>> {
  const result = schema.safeParse(values)
  if (result.success) return {}
  const errors: Partial<Record<FieldName, string>> = {}
  for (const issue of result.error.issues) {
    const [field] = issue.path
    if (field === 'username' || field === 'email' || field === 'password') {
      errors[field] ??= issue.message
    }
  }
  return errors
}
