import { Cover, runtime } from './ui.jsx'
import { SiteLink, titlePath } from './links.jsx'
import { titleLabel } from '../state/selectors.js'

export function TitleIdentity({ title, children, eager = false }) {
  const label = titleLabel(title)
  return (
    <div className="title-identity">
      {title?.id
        ? <SiteLink className="cover-link" to={titlePath(title.id)} aria-label={`View ${label}`} tabIndex={-1}>
            <Cover title={title} eager={eager} />
          </SiteLink>
        : <Cover title={title} />}
      <div className="title-text">
        {title?.id
          ? <SiteLink className="row-title" to={titlePath(title.id)}>{label}</SiteLink>
          : <strong className="row-title">{label}</strong>}
        <div className="byline">
          {title?.author && <span>{title.author}</span>}
          {title?.narrator && <span>Narrated by {title.narrator}</span>}
        </div>
        {children}
      </div>
    </div>
  )
}

export function TitleRuntime({ title }) {
  const duration = runtime(title?.durationMinutes)
  return duration ? <span>{duration}</span> : null
}
