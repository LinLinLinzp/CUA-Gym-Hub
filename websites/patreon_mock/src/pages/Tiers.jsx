import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import { BackLink, Confirm, Empty, FieldError, Icon, Missing, PageHeader, Status } from '../ui.jsx'
import { SiteLink, find, idFor, list, lower, money, recordPath, upsert, useSiteNavigate, useWorkspace } from '../workspace.jsx'

function dependencies(state, tierId) {
  return {
    members: list(state.members).filter(member => member.tierId === tierId).length,
    posts: list(state.posts).filter(post => post.status !== 'deleted' && list(post.tierIds).includes(tierId)).length,
  }
}

export function Tiers() {
  const { state } = useWorkspace()
  const tiers = list(state.tiers).filter(tier => tier.status !== 'retired')
  const memberCounts = new Map()
  for (const member of list(state.members)) {
    if (member.status === 'active') memberCounts.set(member.tierId, (memberCounts.get(member.tierId) ?? 0) + 1)
  }
  return <>
    <PageHeader title="Tiers" description="Manage membership levels, benefits and availability.">
      <SiteLink className="button primary" to="/tiers/new"><Icon name="plus" />New tier</SiteLink>
    </PageHeader>
    {!tiers.length && <div className="paper"><Empty title="No tiers yet">Create a tier to offer paid membership.</Empty></div>}
    <section className="tier-grid" aria-label="Membership tiers">
      {tiers.map(tier => {
        const count = memberCounts.get(tier.id) ?? 0
        return <article key={tier.id} className="paper tier-card">
          <div className="tier-card-top"><h2>{tier.name || 'Unnamed tier'}</h2><Status value={tier.status} /></div>
          <p className="tier-price">{money(tier.monthlyPrice)} <span>/ month</span></p>
          {tier.description && <p className="prewrap">{tier.description}</p>}
          {!!list(tier.benefits).length && <ul className="benefits">{list(tier.benefits).map((benefit, index) => <li key={index}>{benefit}</li>)}</ul>}
          <footer><span>{count} active {count === 1 ? 'member' : 'members'}</span>
            <SiteLink className="button" to={recordPath('tiers', tier.id)} aria-label={`Edit tier: ${tier.name || 'Unnamed tier'}`}>Edit tier</SiteLink>
          </footer>
        </article>
      })}
    </section>
  </>
}

export function TierEditor() {
  const { tierId } = useParams()
  const { state } = useWorkspace()
  const tier = find(state.tiers, tierId)
  if (tierId && (!tier || tier.status === 'retired')) return <Missing title="Tier unavailable" section="tiers" />
  return <TierForm key={tierId ?? 'new'} tier={tier} />
}

function TierForm({ tier }) {
  const { state, commit, notify } = useWorkspace()
  const navigate = useSiteNavigate()
  const [name, setName] = useState(tier?.name ?? '')
  const [price, setPrice] = useState(tier?.monthlyPrice ?? '')
  const [description, setDescription] = useState(tier?.description ?? '')
  const [benefits, setBenefits] = useState(() => list(tier?.benefits).map((text, index) => ({ key: index, text })))
  const [benefitKey, setBenefitKey] = useState(benefits.length)
  const [errors, setErrors] = useState({})
  const [confirmation, setConfirmation] = useState('')
  const linked = tier && dependencies(state, tier.id)
  const canRemove = linked && !linked.posts && !linked.members

  function save(event) {
    event.preventDefault()
    const result = commit((latest, { now, actor }) => {
      const existing = tier && find(latest.tiers, tier.id)
      if (tier && (!existing || existing.status === 'retired')) return { error: { form: 'This tier is unavailable.' } }
      const trimmedName = name.trim()
      const trimmedPrice = String(price).trim()
      const monthlyPrice = Number(trimmedPrice)
      const check = {}
      if (!trimmedName) check.name = 'Enter a tier name.'
      else if (list(latest.tiers).some(item => item.id !== tier?.id && item.status !== 'retired' && lower(item.name).trim() === lower(trimmedName))) check.name = 'A tier already uses this name.'
      if (!/^(?:\d+(?:\.\d{1,2})?|\.\d{1,2})$/.test(trimmedPrice) || !Number.isFinite(monthlyPrice) || monthlyPrice <= 0) check.price = 'Enter a positive USD amount with up to two decimal places.'
      if (Object.keys(check).length) return { error: check }
      const record = {
        ...existing, id: existing?.id ?? idFor('tier'), name: trimmedName, description: description.trim(), monthlyPrice, currency: 'USD',
        benefits: benefits.map(benefit => benefit.text.trim()).filter(Boolean), status: existing?.status ?? 'published',
        createdAt: existing?.createdAt ?? now, createdBy: existing?.createdBy ?? actor, updatedAt: now, updatedBy: actor,
        unpublishedAt: existing?.unpublishedAt ?? null, retiredAt: existing?.retiredAt ?? null,
      }
      return { state: { ...latest, tiers: upsert(latest.tiers, record) } }
    })
    if (result.error) return setErrors(result.error)
    notify(tier ? 'Tier updated.' : 'Tier created.')
    navigate('/tiers')
  }

  function changeAvailability(status) {
    const result = commit((latest, { now, actor }) => {
      const existing = find(latest.tiers, tier.id)
      if (!existing || existing.status === 'retired') return { error: { form: 'This tier is unavailable.' } }
      const currentLinks = dependencies(latest, tier.id)
      if (status === 'retired' && (currentLinks.posts || currentLinks.members)) return { error: { form: 'This tier is still linked to members or posts.' } }
      const record = { ...existing, status, updatedAt: now, updatedBy: actor }
      if (status === 'retired') record.retiredAt = now
      else record.unpublishedAt = status === 'unpublished' ? now : null
      return { state: { ...latest, tiers: upsert(latest.tiers, record) } }
    })
    if (result.error) return setErrors(result.error)
    setConfirmation('')
    notify({ retired: 'Tier deleted.', unpublished: 'Tier unpublished.', published: 'Tier republished.' }[status])
    if (status === 'retired') navigate('/tiers')
  }

  const dialog = {
    unpublished: ['Unpublish tier?', 'Unpublish', 'Existing members keep their tier, and new members will no longer see it.'],
    published: ['Republish tier?', 'Republish', 'This tier will become available to new members.'],
    retired: ['Delete tier?', 'Delete tier', 'This tier will be removed from the tier list.'],
  }[confirmation]
  return <>
    <BackLink section="tiers">Back to tiers</BackLink>
    <PageHeader title={tier ? 'Edit tier' : 'New tier'}>{tier && <Status value={tier.status} />}</PageHeader>
    <form className="editor-layout" onSubmit={save} noValidate>
      <section className="paper writing-panel">
        <label className="field">Tier name<input aria-label="Tier name" value={name} aria-invalid={!!errors.name} onChange={event => setName(event.target.value)} placeholder="e.g. Field Notes" /><FieldError>{errors.name}</FieldError></label>
        <label className="field">Monthly price (USD)<input aria-label="Monthly price (USD)" inputMode="decimal" value={price} aria-invalid={!!errors.price} onChange={event => setPrice(event.target.value)} placeholder="0.00" /><FieldError>{errors.price}</FieldError></label>
        <label className="field">Description<textarea rows={4} value={description} onChange={event => setDescription(event.target.value)} /></label>
        <fieldset className="benefit-fields">
          <legend>Benefits</legend>
          {benefits.map((benefit, index) => <div className="benefit-row" key={benefit.key}>
            <label className="field"><span className="sr-only">Benefit {index + 1}</span>
              <input value={benefit.text} placeholder={`Benefit ${index + 1}`} onChange={event => setBenefits(previous => previous.map(item => item.key === benefit.key ? { ...item, text: event.target.value } : item))} />
            </label>
            <button type="button" aria-label={`Remove benefit ${index + 1}`} onClick={() => setBenefits(previous => previous.filter(item => item.key !== benefit.key))}>Remove</button>
          </div>)}
          <button type="button" onClick={() => { setBenefits(previous => [...previous, { key: benefitKey, text: '' }]); setBenefitKey(benefitKey + 1) }}><Icon name="plus" size={16} />Add benefit</button>
        </fieldset>
        <FieldError>{!confirmation && errors.form}</FieldError>
        <div className="actions"><button type="submit" className="primary">{tier ? 'Save changes' : 'Create tier'}</button><SiteLink to="/tiers" className="button">Cancel</SiteLink></div>
      </section>
      {tier && <aside className="paper settings-panel">
        <h2>Availability</h2>
        <div className="availability-actions">
          <button type="button" onClick={() => { setErrors({}); setConfirmation(tier.status === 'unpublished' ? 'published' : 'unpublished') }}>
            {tier.status === 'unpublished' ? 'Republish' : 'Unpublish'}
          </button>
          {canRemove
            ? <button type="button" className="danger-text" onClick={() => { setErrors({}); setConfirmation('retired') }}>Delete tier</button>
            : <div className="hint dependency"><strong>Tier is in use</strong><p>{linked.members} linked {linked.members === 1 ? 'member' : 'members'} · {linked.posts} linked {linked.posts === 1 ? 'post' : 'posts'}</p><p>{tier.status === 'unpublished' ? 'This tier is hidden from new members.' : 'Unpublish this tier to hide it from new members.'}</p></div>}
        </div>
      </aside>}
    </form>
    {dialog && <Confirm title={dialog[0]} action={dialog[1]} danger={confirmation === 'retired'} error={errors.form}
      onClose={() => setConfirmation('')} onConfirm={() => changeAvailability(confirmation)}>“{tier.name || 'Unnamed tier'}” · {dialog[2]}</Confirm>}
  </>
}

