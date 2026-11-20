import { useId, useState, type FormEvent } from 'react';
import { api, ApiError } from '../api/client';
import type { EnquiryRequest } from '../types/product';

type Field = 'name' | 'email' | 'phone' | 'message';
type Values = Record<Field, string>;
type Errors = Partial<Record<Field, string>>;

type SubmitState =
  | { status: 'editing' }
  | { status: 'sending' }
  | { status: 'failed'; message: string }
  | { status: 'sent'; message: string };

const EMPTY: Values = { name: '', email: '', phone: '', message: '' };

/**
 * Checks the same rules as the backend DTO so people get instant feedback.
 * The backend still validates everything; this is a convenience, not a guard.
 */
export function validateEnquiry(values: Values): Errors {
  const errors: Errors = {};
  const name = values.name.trim();
  if (!name) errors.name = 'Enter your name';
  else if (name.length > 100) errors.name = 'Name must be 100 characters or fewer';

  const email = values.email.trim();
  if (!email) errors.email = 'Enter your email address';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email address';

  const phone = values.phone.trim();
  if (phone && !/^[0-9+()\-\s]{6,20}$/.test(phone)) {
    errors.phone = 'Phone can only contain digits, spaces and + ( ) -, 6 to 20 characters';
  }

  if (values.message.trim().length > 2000) errors.message = 'Message must be 2000 characters or fewer';
  return errors;
}

export function EnquiryForm({ productId, productTitle }: { productId: number; productTitle: string }) {
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [submit, setSubmit] = useState<SubmitState>({ status: 'editing' });
  const id = useId();

  if (submit.status === 'sent') {
    return (
      <div className="notice notice--success" role="status">
        <h3>Thank you</h3>
        <p>{submit.message}</p>
      </div>
    );
  }

  const update = (field: Field) => (event: { target: { value: string } }) =>
    setValues((current) => ({ ...current, [field]: event.target.value }));

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validateEnquiry(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmit({ status: 'sending' });
    try {
      const response = await api.submitEnquiry(toRequest(productId, values));
      setSubmit({ status: 'sent', message: response.message });
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Something went wrong. Please try again.';
      setSubmit({ status: 'failed', message });
    }
  }

  const fieldProps = (field: Field) => ({
    id: `${id}-${field}`,
    name: field,
    value: values[field],
    onChange: update(field),
    'aria-invalid': errors[field] ? true : undefined,
    'aria-describedby': errors[field] ? `${id}-${field}-error` : undefined,
  });

  const fieldError = (field: Field) =>
    errors[field] ? (
      <p id={`${id}-${field}-error`} className="field__error">
        {errors[field]}
      </p>
    ) : null;

  return (
    <form className="enquiry" onSubmit={handleSubmit} noValidate aria-label={`Enquire about ${productTitle}`}>
      <div className="field">
        <label htmlFor={`${id}-name`}>Name</label>
        <input {...fieldProps('name')} type="text" autoComplete="name" maxLength={100} required />
        {fieldError('name')}
      </div>
      <div className="field">
        <label htmlFor={`${id}-email`}>Email</label>
        <input {...fieldProps('email')} type="email" autoComplete="email" maxLength={254} required />
        {fieldError('email')}
      </div>
      <div className="field">
        <label htmlFor={`${id}-phone`}>
          Phone <span className="field__optional">(optional)</span>
        </label>
        <input {...fieldProps('phone')} type="tel" autoComplete="tel" maxLength={20} />
        {fieldError('phone')}
      </div>
      <div className="field">
        <label htmlFor={`${id}-message`}>
          Message <span className="field__optional">(optional)</span>
        </label>
        <textarea {...fieldProps('message')} rows={4} maxLength={2000} />
        {fieldError('message')}
      </div>

      {submit.status === 'failed' && (
        <p className="notice notice--error" role="alert">
          {submit.message}
        </p>
      )}

      <button type="submit" className="button" disabled={submit.status === 'sending'}>
        {submit.status === 'sending' ? 'Sending…' : 'Send enquiry'}
      </button>
    </form>
  );
}

function toRequest(productId: number, values: Values): EnquiryRequest {
  const phone = values.phone.trim();
  const message = values.message.trim();
  return {
    productId,
    name: values.name.trim(),
    email: values.email.trim(),
    ...(phone && { phone }),
    ...(message && { message }),
  };
}
