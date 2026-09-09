import { ZodError, type z } from 'zod';
import { NotAllowedError } from '@/lib/auth';

/** What every Server Action hands back to a form. */
export type ActionResult<T = undefined> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export function ok<T = undefined>(data: T, message?: string): ActionResult<T> {
  return { ok: true, data, message };
}

export function fail(error: string, fieldErrors?: Record<string, string>): ActionResult<never> {
  return { ok: false, error, fieldErrors };
}

function flattenZod(error: ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_';
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

/**
 * Wraps an action body so a Zod failure, a permission failure or a Postgres
 * error all come back as a plain message the form can show, rather than an
 * unhandled exception and a blank screen.
 */
export async function run<T>(body: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await body();
  } catch (error) {
    if (error instanceof ZodError) {
      const fieldErrors = flattenZod(error);
      return fail(Object.values(fieldErrors)[0] ?? 'Please check the form', fieldErrors);
    }
    if (error instanceof NotAllowedError) {
      return fail(error.message);
    }
    // Next's redirect() and notFound() throw on purpose — let them through.
    if (
      error &&
      typeof error === 'object' &&
      'digest' in error &&
      typeof (error as { digest?: unknown }).digest === 'string' &&
      (error as { digest: string }).digest.startsWith('NEXT_')
    ) {
      throw error;
    }
    const message = error instanceof Error ? error.message : 'Something went wrong';
    return fail(message);
  }
}

/** Parses FormData with a schema, throwing a ZodError that `run` turns into field errors. */
export function parseForm<S extends z.ZodTypeAny>(schema: S, formData: FormData): z.infer<S> {
  const raw: Record<string, FormDataEntryValue | FormDataEntryValue[]> = {};
  for (const key of new Set(formData.keys())) {
    const values = formData.getAll(key);
    raw[key] = values.length > 1 || key.endsWith('[]') ? values : (values[0] as FormDataEntryValue);
  }
  const normalised = Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [key.replace(/\[\]$/, ''), value]),
  );
  return schema.parse(normalised);
}
