import { Page, ButtonLink, SiteLink, Disclosure } from './ui'

export default function Introduction({ title, description, action, to, secondary, requirements, guidance }) {
  return <Page title={title}>
    <div className="intro-grid">
      <div>
        <p className="lead">{description}</p>
        <div className="actions"><ButtonLink to={to}>{action}</ButtonLink>{secondary && <SiteLink to={secondary.to}>{secondary.label}</SiteLink>}</div>
      </div>
      <aside className="card requirements">
        <h2>Before you begin</h2>
        <ul>{requirements.map((text) => <li key={text}>{text}</li>)}</ul>
      </aside>
    </div>
    {guidance?.length > 0 && <section className="content-section">
      <h2>Help with this service</h2>
      {guidance.map(({ title: question, answer }) => <Disclosure key={question} title={question}>{answer}</Disclosure>)}
    </section>}
  </Page>
}
