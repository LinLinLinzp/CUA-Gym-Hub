import { useParams } from 'react-router-dom'
import { Missing } from '../components/Empty.jsx'
import { BackLink, Cover, runtime } from '../components/ui.jsx'
import { TitleActions } from '../components/TitleActions.jsx'
import { useAccount } from '../state/AccountProvider.jsx'
import { titleById, titleLabel } from '../state/selectors.js'

export function TitleDetails() {
  const { state } = useAccount()
  const { titleId } = useParams()
  const title = titleById(state, titleId)
  if (!title) return <Missing title="Title not found" to="/browse" label="Back to Browse" />

  const fields = [
    ['Written by', title.author],
    ['Narrated by', title.narrator],
    ['Listening time', runtime(title.durationMinutes)],
  ]

  return (
    <section>
      <BackLink to="/browse">Back to Browse</BackLink>
      <div className="title-detail">
        <Cover title={title} large eager />
        <div className="title-detail-content">
          {title.genre && <span className="pill">{title.genre}</span>}
          <h1 tabIndex={-1}>{titleLabel(title)}</h1>
          <dl className="facts">
            {fields.filter(([, value]) => value).map(([label, value]) => (
              <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
            ))}
          </dl>
          <TitleActions title={title} />
        </div>
      </div>
      {title.description && <div className="synopsis"><h2>About this audiobook</h2><p>{title.description}</p></div>}
    </section>
  )
}
