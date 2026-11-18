import { useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { AlertEditor } from './Alerts.jsx'
import { SaveToFolder } from './Folders.jsx'
import { array, byId, docPath, includes, jurisdictionOptions, nameOf, norm, reportable, reportPath, signals, treatments } from './model.js'
import { useWorkspace } from './store.jsx'
import { Badge, Icon, List, Missing, Modal, Moment, PageHead, Panel, Select, SiteLink, useSidNavigate } from './ui.jsx'
import { withSid } from './utils/dataManager.js'

const formatNames = { standard: 'Standard', alwd: 'ALWD', header: 'Header citation' }
const normalizedCitation = (text) => norm(text).replace(/[^a-z0-9]/g, '')

export function citationFormats(doc) {
  if (doc.type === 'case' && (doc.citationFormats?.standard || doc.citationFormats?.alwd)) {
    return Object.fromEntries(['standard', 'alwd'].filter((style) => doc.citationFormats[style]).map((style) => [style, doc.citationFormats[style]]))
  }
  return doc.citation ? { header: doc.citation } : {}
}

export function checkCitation(commit, documentId, query) {
  return commit((current, meta) => {
    if (!reportable(byId(current.documents, documentId), current.citingReferences)) return 'The citation report is unavailable.'
    const action = { id: meta.id('cite-action'), documentId, type: 'checked', ...meta.create }
    if (query?.trim()) action.query = query.trim()
    return { citationActions: [...current.citationActions, action] }
  }, 'Citation report checked.')
}

function lookupScore(doc, query) {
  const candidates = [doc.citation, ...array(doc.citationAliases)]
  const normalized = normalizedCitation(query)
  if (normalized && candidates.some((candidate) => normalizedCitation(candidate) === normalized)) return 4
  if (norm(doc.title) === norm(query)) return 3
  if (normalized && candidates.some((candidate) => normalizedCitation(candidate).includes(normalized))) return 2
  return includes(doc.title, query) ? 1 : 0
}

export function Citations() {
  const { state, commit } = useWorkspace()
  const navigate = useSidNavigate()
  const [params] = useSearchParams()
  const query = params.get('q')?.trim() || ''
  const results = query ? state.documents.filter((doc) => doc.type === 'case')
    .map((doc) => ({ doc, score: lookupScore(doc, query) })).filter(({ score }) => score)
    .sort((a, b) => b.score - a.score || nameOf(a.doc).localeCompare(nameOf(b.doc))) : []
  return <>
    <PageHead title="Citations" description="Find a case and check its later treatment with Shepard’s." />
    <Panel>
      <div className="toolbar">
        <LookupForm key={query} query={query} onSearch={(value) => navigate(`/citations${value ? `?q=${encodeURIComponent(value)}` : ''}`)} />
      </div>
      <List count={results.length} label="match" empty={query ? 'No cases match that citation or case name.' : 'Enter a reporter citation, citation alias or case name to begin.'}>
        {results.map(({ doc }) => <li className="row" key={doc.id}><div className="row-main"><span className="row-icon"><Icon name="citation" /></span><div className="row-copy">
          <SiteLink to={docPath(doc.id)}>{nameOf(doc)}</SiteLink>
          <p className="meta">{[doc.citation, doc.court || doc.source, doc.date?.slice(0, 4)].filter(Boolean).join(' · ') || 'Case metadata unavailable'}</p>
        </div></div>
          <div className="actions"><Badge value={doc.signal} />
            {reportable(doc, state.citingReferences) ? <button onClick={() => {
              if (!checkCitation(commit, doc.id, query)) navigate(reportPath(doc.id))
            }}>Open Shepard’s report</button> : <span className="meta">Report unavailable</span>}
          </div>
        </li>)}
      </List>
    </Panel>
  </>
}

function LookupForm({ query, onSearch }) {
  const [draft, setDraft] = useState(query)
  return <form className="search-bar" role="search" onSubmit={(event) => { event.preventDefault(); onSearch(draft.trim()) }}>
    <label className="field"><span>Citation or case name</span><input type="search" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="e.g. 214 F.4th 731 or Barton v. Alder Logistics" /></label>
    <button className="primary"><Icon name="search" />Find case</button>
  </form>
}

export function CitationPreview({ doc, startSaving = false, onClose }) {
  const { state, commit, announce } = useWorkspace()
  const formats = citationFormats(doc)
  const preferred = state.profile?.citationFormat
  const [format, setFormat] = useState(Object.hasOwn(formats, preferred) ? preferred : Object.keys(formats)[0] || '')
  const [withLink, setWithLink] = useState(false)
  const [saving, setSaving] = useState(false)
  const [copying, setCopying] = useState(false)
  const [failed, setFailed] = useState(false)
  const preview = useRef(null)
  const lock = useRef(false)
  const casePath = docPath(doc.id)
  const citationText = formats[format] || ''
  const text = withLink ? `${citationText} ${new URL(withSid(casePath), window.location.origin).href}` : citationText
  const portable = withLink ? `${citationText}\n${casePath}` : citationText

  async function copy() {
    if (lock.current) return
    lock.current = true
    setCopying(true)
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      lock.current = false
      setCopying(false)
      setFailed(true)
      preview.current?.focus()
      preview.current?.select()
      return
    }
    const issue = commit((current, meta) => {
      const action = { id: meta.id('cite-action'), type: 'copied', documentId: doc.id, format, includeLink: withLink, citationText: text, ...meta.create }
      const changes = { citationActions: [...current.citationActions, action] }
      if (format !== 'header') changes.profile = { ...current.profile, citationFormat: format }
      return changes
    }, 'Citation copied to clipboard.')
    if (issue) announce(issue)
    onClose()
  }

  return <>
    <Modal title={startSaving ? 'Citation to save' : 'Copy citation'} onClose={() => { if (!lock.current) onClose() }}>
      {citationText ? <div className="compact-stack">
        <Select label="Citation format" options={Object.fromEntries(Object.keys(formats).map((key) => [key, formatNames[key]]))} value={format} onChange={setFormat} disabled={copying} />
        <label className="check"><input type="checkbox" checked={withLink} onChange={(event) => setWithLink(event.target.checked)} disabled={copying} />Include local link</label>
        <label className="field"><span>Citation preview</span><textarea ref={preview} readOnly value={startSaving ? portable : text} /></label>
        {failed && <p className="error" role="alert">Clipboard access was unavailable. Select the text to copy it manually, or retry.</p>}
        <div className="dialog-actions">
          <button onClick={onClose} disabled={copying}>Cancel</button>
          <button onClick={() => setSaving(true)} disabled={copying} className={startSaving ? 'primary' : undefined}>Save citation to folder</button>
          {!startSaving && <button className="primary" onClick={copy} disabled={copying}>{failed ? 'Retry copy' : 'Copy'}</button>}
        </div>
      </div> : <p className="empty">There is no citation available for this document.</p>}
    </Modal>
    {saving && citationText && <SaveToFolder item={{ kind: 'citation', documentId: doc.id, title: nameOf(doc), format, includeLink: withLink, citationText: portable }}
      onClose={() => setSaving(false)} onSaved={onClose} />}
  </>
}

export function CitationReport() {
  const { documentId } = useParams()
  return <ReportView key={documentId} documentId={documentId} />
}

function ReportView({ documentId }) {
  const { state } = useWorkspace()
  const [treatment, setTreatment] = useState('')
  const [jurisdiction, setJurisdiction] = useState('')
  const [modal, setModal] = useState('')
  const doc = byId(state.documents, documentId)
  if (!reportable(doc, state.citingReferences)) return <Missing title="Citation report unavailable" description="There is no Shepard’s report for this authority." to="/citations" label="Back to citations" />
  const linked = state.citingReferences.filter((row) => row.documentId === documentId)
    .map((row) => ({ row, citing: byId(state.documents, row.citingDocumentId) }))
  const results = linked.filter(({ row, citing }) => (!treatment || row.treatment === treatment) && (!jurisdiction || citing?.jurisdiction === jurisdiction))
  const options = jurisdictionOptions(linked.map(({ citing }) => citing), jurisdiction)
  const citable = Object.keys(citationFormats(doc)).length > 0
  return <>
    <PageHead title="Shepard’s report" description={nameOf(doc)} actions={<>
      {citable && <><button onClick={() => setModal('copy')}>Copy citation</button><button onClick={() => setModal('save')}>Save citation to folder</button></>}
      <button className="primary" onClick={() => setModal('alert')}><Icon name="bell" />Create Shepard’s alert</button>
    </>}><nav className="crumbs" aria-label="Breadcrumb"><SiteLink to="/citations">Citations</SiteLink><Icon name="chevron" size={13} /><span>Report</span></nav></PageHead>
    <div className="stack">
      <Panel title="Authority">
        <dl className="data-grid">
          <div><dt>Case</dt><dd><SiteLink to={docPath(doc.id)}>{nameOf(doc)}</SiteLink></dd></div>
          <div><dt>Citation</dt><dd>{doc.citation || 'Citation unavailable'}</dd></div>
          <div><dt>Overall treatment</dt><dd><Badge value={doc.signal} label={signals[doc.signal] || 'Treatment unavailable'} /></dd></div>
        </dl>
      </Panel>
      <Panel title="Citing decisions">
        <div className="toolbar filters">
          <Select label="Treatment" options={treatments} empty="All treatments" value={treatment} onChange={setTreatment} />
          <Select label="Jurisdiction" options={options} empty="All jurisdictions" value={jurisdiction} onChange={setJurisdiction} />
          {(treatment || jurisdiction) && <button onClick={() => { setTreatment(''); setJurisdiction('') }}>Clear filters</button>}
        </div>
        <List count={results.length} label="decision" empty={linked.length ? 'No citing decisions match these filters.' : 'There are no citing decisions for this authority.'}>
          {results.map(({ row, citing }) => <li className="row" key={row.id}><div className="row-main"><span className="row-icon"><Icon name="file" /></span>
            <div className="row-copy">
              {citing ? <SiteLink to={docPath(citing.id)}>{nameOf(citing)}</SiteLink> : <strong>Citing document unavailable</strong>}
              {citing && <p className="meta">{[citing.citation, citing.court || citing.source].filter(Boolean).join(' · ')}</p>}
              {row.excerpt && <p className="result-excerpt">{row.excerpt}</p>}
            </div></div><div className="row-data"><Badge value={row.treatment} /><Moment value={citing?.date} /></div>
          </li>)}
        </List>
      </Panel>
    </div>
    {(modal === 'copy' || modal === 'save') && <CitationPreview doc={doc} startSaving={modal === 'save'} onClose={() => setModal('')} />}
    {modal === 'alert' && <AlertEditor type="shepards" source={{ documentId }} onClose={() => setModal('')} />}
  </>
}
