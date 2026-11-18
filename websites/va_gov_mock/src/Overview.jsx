import { Link, useLocation } from 'react-router-dom'
import { Icon, serviceLinks } from './Shell'
import { appointmentSection, dateLabel, money, newest, recordPath } from './records'

export default function Overview({ state }) {
  const { search } = useLocation()
  const openClaims = state.claims.filter(claim => claim.status !== 'decided').length
  const visits = state.appointments.filter(visit => appointmentSection(visit) === 'Upcoming').length
  const refills = state.prescriptions.filter(rx => rx.status === 'active' && rx.refillsRemaining > 0 &&
    !state.refillRequests.some(request => request.prescriptionId === rx.id && request.status === 'requested')).length
  const balance = state.copayBills.filter(bill => bill.status === 'open').reduce((sum, bill) => sum + (Number(bill.balance) || 0), 0)
  const summaries = [
    `${openClaims} active ${openClaims === 1 ? 'claim' : 'claims'}`,
    `${visits} upcoming ${visits === 1 ? 'visit' : 'visits'}`,
    `${refills} ${refills === 1 ? 'prescription' : 'prescriptions'} ready to refill`,
    `${money(balance)} in open copays`,
  ]
  const activity = [
    ...state.claims.map(claim => ({ label: claim.conditions?.join(', ') || claim.id, kind: 'Claim', date: claim.updatedAt || claim.createdAt, path: recordPath('/claims', claim.id) })),
    ...state.appointments.map(visit => ({ label: visit.clinic || visit.id, kind: 'Appointment', date: visit.updatedAt || visit.createdAt, path: recordPath('/appointments', visit.id) })),
    ...state.prescriptions.map(rx => ({ label: rx.medication || rx.id, kind: 'Prescription', date: rx.lastFilledAt, path: recordPath('/prescriptions', rx.id) })),
    ...state.benefitPayments.map(payment => ({ label: money(payment.amount, payment.currency), kind: 'Benefit payment', date: payment.paidOn, path: recordPath('/payments/history', payment.id) })),
    ...state.copayBills.map(bill => ({ label: bill.id, kind: 'Copay bill', date: bill.updatedAt || bill.issuedOn, path: recordPath('/payments/copays', bill.id) })),
  ].filter(item => item.date).sort(newest('date', 'path')).slice(0, 4)
  return <>
    <section className="hero" aria-labelledby="welcome">
      <div className="hero-art" aria-hidden="true"><i /><i /><i /><b /></div>
      <div className="hero-content">
        <h1 id="welcome" tabIndex={-1}>{state.profile.firstName ? `Welcome, ${state.profile.firstName}` : 'Welcome to your account'}</h1>
        <p>Manage your VA benefits and health care in one place.</p>
      </div>
    </section>
    <section className="overview-section">
      <h2>Your services</h2>
      <div className="service-grid">
        {serviceLinks.map(({ path, title, icon, hint }, index) => <Link className="service-card" to={path + search} key={path}>
          <span className={`service-icon ${icon}`}><Icon name={icon} /></span>
          <span className="service-title">{title}<span aria-hidden="true">→</span></span>
          <span className="service-hint">{hint}</span>
          <strong className="service-summary">{summaries[index]}</strong>
        </Link>)}
      </div>
    </section>
    <section className="overview-section">
      <h2>Recent activity</h2>
      <div className="activity panel">
        {activity.length ? activity.map(item => <Link to={item.path + search} key={item.path}>
          <span><small>{item.kind}</small><strong>{item.label}</strong></span><time dateTime={item.date}>{dateLabel(item.date)}</time><span aria-hidden="true">→</span>
        </Link>) : <p className="empty">No recent activity.</p>}
      </div>
    </section>
  </>
}
