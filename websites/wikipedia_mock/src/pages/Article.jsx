import { useOutletContext } from 'react-router-dom'
import { articlePath, dateLabel } from '../data/records.js'
import { sourceSections } from '../data/source.js'
import { SiteLink } from '../navigation.jsx'

export function SourceProse({ body, article }) {
  return <div className="prose">
    {sourceSections(body).map(section => <section key={section.index} id={article ? 'section-' + section.index : undefined}>
      {(section.index > 0 || article) && <div className="align-row">
        <h2>{section.title}</h2>
        {article && <SiteLink className="section-edit" to={articlePath(article) + '/edit?section=' + section.index}
          aria-label={'Edit section: ' + section.title}>Edit section</SiteLink>}
      </div>}
      {section.text.trim().split(/\r?\n\s*\r?\n/).filter(Boolean).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
    </section>)}
  </div>
}

export function Article() {
  const article = useOutletContext()
  const sections = sourceSections(article.body ?? '')
  return <section className="paper reading">
    <nav className="reading-index" aria-label="Article contents">
      <strong>Contents</strong>
      <ol>{sections.map(section => <li key={section.index}><a href={'#section-' + section.index}>{section.title}</a></li>)}</ol>
    </nav>
    <div>
      <SourceProse body={article.body ?? ''} article={article} />
      {article.updatedAt && <p className="metadata" style={{ marginTop: 20 }}>Last edited {dateLabel(article.updatedAt)}</p>}
    </div>
  </section>
}
