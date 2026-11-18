import { CreditCard } from 'lucide-react'

export function MaskedPayment({ payment }) {
  return <span className="masked-payment"><CreditCard size={18} />{payment?.last4 ? `${payment.brand || 'Card'} ending in ${payment.last4}` : 'Payment unavailable'}</span>
}

export function PersonFields({ value, update, errors }) {
  return <div className="person-fields">
    <label className="field">Full name<input name="fullName" autoComplete="name" value={value.fullName}
      onChange={(event) => update('fullName', event.target.value)} aria-invalid={Boolean(errors.fullName)} aria-describedby={errors.fullName ? 'person-name-error' : undefined} />
      {errors.fullName && <span className="small error" id="person-name-error">{errors.fullName}</span>}</label>
    <label className="field">Email address<input name="email" type="email" autoComplete="email" value={value.email}
      onChange={(event) => update('email', event.target.value)} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'person-email-error' : undefined} />
      {errors.email && <span className="small error" id="person-email-error">{errors.email}</span>}</label>
  </div>
}
