import { useState } from 'react'
import { Route, Routes, useParams } from 'react-router-dom'
import { byId, date, label, matches, newId, paymentLabel, records, routeId, useAccount } from '../account.jsx'
import { AccountLink, Badge, Facts, Field, Filter, Ledger, Missing, PageTitle, Search, Trail, useAccountNavigation } from '../ui.jsx'

const frequencies = [['none', 'None'], ['weekly', 'Weekly'], ['monthly', 'Monthly']]
const profilePath = (id) => '/expense-profiles/' + routeId(id)
const canEdit = (profile) => profile?.type === 'business' && profile.status === 'active'

function Profiles() {
  const { data } = useAccount()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('active')
  const clear = () => { setQuery(''); setStatus('') }
  const profiles = records(data.expenseProfiles)
  const rows = profiles.flatMap((profile, index) => {
    const payment = byId(data.paymentMethods, profile.paymentMethodId)
    if ((status && profile.status !== status) || !matches(query, profile.id, profile.name, profile.type, profile.receiptEmail, profile.expenseProvider, payment?.brand, payment?.last4)) return []
    const title = profile.name || profile.id || 'Expense profile'
    return [{ id: profile.id ?? index, cells: [
      <>{profile.id ? <AccountLink to={profilePath(profile.id)}>{title}</AccountLink> : title}<span className="stacked">{profile.receiptEmail || 'No receipt email'}</span></>,
      label(profile.type), paymentLabel(payment), label(profile.reportFrequency), <Badge status={profile.status} />,
    ] }]
  })
  const filtered = Boolean(query.trim() || (status && profiles.length))

  return <>
    <PageTitle title="Expense profiles" description="Manage receipt addresses and reporting preferences for your rides." action={<AccountLink className="button" to="/expense-profiles/new">Add business profile</AccountLink>} />
    <div className="panel filters">
      <Search label="Search profiles" value={query} onChange={setQuery} placeholder="Profile name or email" />
      <Filter label="View profiles" value={status} onChange={setStatus} options={[['active', 'Active'], ['archived', 'Archived']]} />
      {filtered && rows.length > 0 && <button className="button secondary" onClick={clear}>Clear filters</button>}
    </div>
    <Ledger headers={['Profile', 'Type', 'Payment method', 'Reports', 'Status']} rows={rows} empty="No expense profiles yet" filtered={filtered} clear={clear} caption="Expense profiles" />
  </>
}

function ProfileDetail() {
  const { profileId } = useParams()
  const { data } = useAccount()
  const profile = byId(data.expenseProfiles, profileId)
  if (!profile) return <Missing title="Expense profile unavailable" to="/expense-profiles" back="All expense profiles" />
  const payment = byId(data.paymentMethods, profile.paymentMethodId)
  return <>
    <Trail to="/expense-profiles">All expense profiles</Trail>
    <PageTitle title={profile.name || 'Expense profile'} description={profile.id} action={canEdit(profile) && <AccountLink className="button" to={profilePath(profileId) + '/edit'}>Edit profile</AccountLink>} />
    <div className="detail-grid">
      <section className="panel detail-panel">
        <h2>Receipt and payment settings</h2>
        <Facts items={[
          ['Type', label(profile.type)], ['Receipt email', profile.receiptEmail], ['Payment method', paymentLabel(payment)],
          ['Report frequency', label(profile.reportFrequency)], ['Expense provider', profile.expenseProvider || 'None'],
        ]} />
      </section>
      <section className="panel detail-panel">
        <h2>Profile status</h2>
        <Badge status={profile.status} />
        <Facts items={[
          ['Created', date(profile.createdAt, data.rider?.timeZone)],
          ['Last updated', date(profile.updatedAt, data.rider?.timeZone)],
        ]} />
      </section>
    </div>
  </>
}

function ProfileForm({ profile }) {
  const { data, commit } = useAccount()
  const navigate = useAccountNavigation()
  const payments = records(data.paymentMethods).filter((payment) => payment.id)
  const [draft, setDraft] = useState({
    name: profile?.name ?? '', receiptEmail: profile?.receiptEmail ?? '',
    paymentMethodId: byId(payments, profile?.paymentMethodId)?.id ?? '',
    reportFrequency: frequencies.some(([key]) => key === profile?.reportFrequency) ? profile.reportFrequency : 'none',
    expenseProvider: profile?.expenseProvider ?? '',
  })
  const [errors, setErrors] = useState({})
  const back = profile ? profilePath(profile.id) : '/expense-profiles'

  function update(field) {
    return (event) => {
      const value = event.target.value
      setDraft((previous) => ({ ...previous, [field]: value }))
      setErrors((previous) => ({ ...previous, [field]: undefined }))
    }
  }

  function submit(event) {
    event.preventDefault()
    const values = Object.fromEntries(Object.entries(draft).map(([key, value]) => [key, value.trim()]))
    const invalid = {}
    if (!values.name) invalid.name = 'Enter a profile name.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.receiptEmail)) invalid.receiptEmail = 'Enter a valid work email address.'
    if (!byId(payments, values.paymentMethodId)) invalid.paymentMethodId = 'Select an available payment method.'
    if (!frequencies.some(([key]) => key === values.reportFrequency)) invalid.reportFrequency = 'Select a report frequency.'
    if (Object.keys(invalid).length) {
      setErrors(invalid)
      return
    }

    const id = profile?.id ?? newId('profile')
    const saved = commit((state, { now, actorId }) => {
      const existing = byId(state.expenseProfiles, profile?.id)
      if (profile && !canEdit(existing)) return state
      const changes = { ...values, updatedAt: now, updatedBy: actorId }
      const all = records(state.expenseProfiles)
      const expenseProfiles = profile
        ? all.map((entry) => entry.id === id ? { ...entry, ...changes } : entry)
        : [...all, { id, riderId: actorId, type: 'business', status: 'active', createdAt: now, ...changes }]
      return { ...state, expenseProfiles }
    }, profile ? 'Expense profile updated.' : 'Business profile added.')
    if (saved) navigate(profilePath(id))
  }

  return <>
    <Trail to={back}>{profile ? 'Profile details' : 'All expense profiles'}</Trail>
    <PageTitle title={profile ? 'Edit business profile' : 'Add business profile'} description="Set the receipt and reporting preferences for business rides." />
    <form className="panel form-panel form" onSubmit={submit} noValidate>
      <Field label="Profile name" error={errors.name}>{(props) => <input {...props} value={draft.name} onChange={update('name')} required />}</Field>
      <Field label="Work email" error={errors.receiptEmail}>{(props) => <input {...props} type="email" value={draft.receiptEmail} onChange={update('receiptEmail')} required />}</Field>
      <Field label="Payment method" error={errors.paymentMethodId}>{(props) => <select {...props} value={draft.paymentMethodId} onChange={update('paymentMethodId')} required>
        <option value="" disabled>{payments.length ? 'Select a payment method' : 'No payment methods available'}</option>
        {payments.map((payment) => <option key={payment.id} value={payment.id}>{paymentLabel(payment)}</option>)}
      </select>}</Field>
      <Field label="Report frequency" error={errors.reportFrequency}>{(props) => <select {...props} value={draft.reportFrequency} onChange={update('reportFrequency')} required>
        {frequencies.map(([key, name]) => <option key={key} value={key}>{name}</option>)}
      </select>}</Field>
      <Field label="Expense provider (optional)">{(props) => <input {...props} value={draft.expenseProvider} onChange={update('expenseProvider')} placeholder="e.g. Concur" />}</Field>
      <div className="form-actions"><AccountLink className="button secondary" to={back}>Cancel</AccountLink>
        <button className="button" disabled={!payments.length}>{profile ? 'Save changes' : 'Create business profile'}</button></div>
    </form>
  </>
}

function EditProfile() {
  const { profileId } = useParams()
  const { data } = useAccount()
  const profile = byId(data.expenseProfiles, profileId)
  if (!canEdit(profile)) return <Missing title="Profile editing unavailable" to="/expense-profiles" back="All expense profiles" />
  return <ProfileForm key={profileId} profile={profile} />
}

export function ProfileRoutes() {
  return <Routes>
    <Route index element={<Profiles />} />
    <Route path="new" element={<ProfileForm />} />
    <Route path=":profileId" element={<ProfileDetail />} />
    <Route path=":profileId/edit" element={<EditProfile />} />
    <Route path="*" element={<Missing title="Expense profile unavailable" to="/expense-profiles" back="All expense profiles" />} />
  </Routes>
}
