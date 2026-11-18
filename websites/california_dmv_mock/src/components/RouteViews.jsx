import { ButtonLink, Empty, Page } from './ui'

export function MissingRecord({ title, message, to, action }) {
  return <Page title={title} compact>
    <Empty title={message} />
    <div className="actions"><ButtonLink to={to}>{action}</ButtonLink></div>
  </Page>
}
