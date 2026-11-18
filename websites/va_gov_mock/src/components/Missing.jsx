import { AccountLink, Page } from './ui'

export default function Missing({ title = 'Page unavailable', to = '/', back = 'Overview' }) {
  return <Page title={title} back={back} to={to}>
    <p className="panel empty">This page or record is unavailable in your account. <AccountLink to={to}>Return to {back}</AccountLink>.</p>
  </Page>
}
