import { useState } from 'react'
import { ArrowRight, Award, Download, Link2, ShieldCheck } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { useWorkspace } from '../context/Workspace.jsx'
import { list, own, validId } from '../data/learning.js'
import { withSid } from '../utils/dataManager.js'
import { downloadCertificate } from '../utils/certificatePdf.js'
import { Back, Empty, Missing, PageHeading, SearchField, SelectField, SiteLink, Status, certificatePath, dateText, matches, verificationPath } from '../components/ui.jsx'

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }
  const previous = document.activeElement
  const field = document.createElement('textarea')
  field.value = text
  field.readOnly = true
  field.className = 'sr-only'
  document.body.append(field)
  try {
    field.select()
    if (!document.execCommand('copy')) throw new Error('Clipboard unavailable')
  } finally {
    field.remove()
    previous?.focus()
  }
}

export function Accomplishments() {
  const { state } = useWorkspace()
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('newest')
  const credentials = own(state, 'certificates').filter(row => row.status === 'issued')
  const results = credentials.filter(row => matches(query, row.courseTitle, row.issuerName))
    .sort((a, b) => (sort === 'oldest' ? 1 : -1) * String(a.createdAt || '').localeCompare(String(b.createdAt || '')))
  return <>
    <PageHeading title="Accomplishments" subtitle="Find your earned certificates and their verification details." />
    <div className="filters">
      <SearchField label="Search certificates" value={query} setValue={setQuery} />
      <SelectField label="Sort certificates" value={sort} setValue={setSort} options={[[ 'newest', 'Newest first'], ['oldest', 'Oldest first']]} />
    </div>
    <p className="result-count" aria-live="polite">{results.length} {results.length === 1 ? 'certificate' : 'certificates'}</p>
    {results.length ? <div className="record-list">
      {results.map((row, index) => <article className="record credential-record" key={row.id || index}>
        <span className="row-icon soft-gold"><Award size={21} aria-hidden="true" /></span>
        <div className="record-main">
          <h3>{validId(row.id) ? <SiteLink to={certificatePath(row.id)}>{row.courseTitle || 'Course certificate'}</SiteLink> : row.courseTitle || 'Course certificate'}</h3>
          <p>{row.issuerName || 'Course provider'}</p>
        </div>
        <div className="record-progress"><Status value={row.status} />{dateText(row.createdAt) && <span className="muted">{dateText(row.createdAt)}</span>}</div>
        {validId(row.id) && <SiteLink className="button secondary" to={certificatePath(row.id)}>View certificate <ArrowRight size={16} /></SiteLink>}
      </article>)}
    </div> : <Empty title={credentials.length ? 'No certificates match' : 'No certificates yet'} description={credentials.length ? 'Try searching for another course or issuer.' : 'Finish a certificate-eligible course to earn your first credential.'} to={credentials.length ? undefined : '/'} action="Back to My Learning" />}
  </>
}

function CredentialPaper({ certificate }) {
  return <article className="certificate-paper" aria-label="Course certificate">
    <div className="certificate-accent" aria-hidden="true"><Award size={29} /></div>
    <div className="certificate-brand">Coursera</div>
    <h2>Course Certificate</h2>
    <p>Presented to</p>
    <div className="recipient">{certificate.learnerName || 'Learner'}</div>
    <p>for completing</p>
    <h3>{certificate.courseTitle || 'Course'}</h3>
    <p>Issued by {certificate.issuerName || 'Course provider'}</p>
    <div className="certificate-details">
      <span>{dateText(certificate.createdAt) ? 'Issued ' + dateText(certificate.createdAt) : 'Issue date unavailable'}</span>
      <span>Verification code <code>{certificate.verificationCode || 'Unavailable'}</code></span>
    </div>
  </article>
}

export function Certificate() {
  const { certificateId } = useParams()
  return <CertificateView key={certificateId} certificateId={certificateId} />
}

function CertificateView({ certificateId }) {
  const { state, dispatch, notify } = useWorkspace()
  const [showUrl, setShowUrl] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const certificate = own(state, 'certificates').find(row => row.id === certificateId && row.status === 'issued')
  if (!certificate) return <Missing to="/accomplishments" action="Back to Accomplishments" />
  const verify = validId(certificate.verificationCode) ? verificationPath(certificate.verificationCode) : ''
  const path = verify ? withSid(verify) : ''
  const url = path ? new URL(path, window.location.origin).href : ''
  const record = details => ({ type: 'certificateAction', courseId: certificate.courseId, certificateId, ...details })
  const downloadable = [certificate.courseTitle, certificate.learnerName, certificate.issuerName, certificate.courseId].every(validId) && Boolean(verify && dateText(certificate.createdAt))
  const canRecord = validId(state.learner?.id) && validId(certificate.courseId)
  return <>
    <Back to="/accomplishments">Accomplishments</Back>
    <PageHeading title={certificate.courseTitle || 'Course certificate'} eyebrow="Accomplishments" />
    <div className="certificate-toolbar">
      <Status value="issued" />
      <div className="actions">
        {verify && <SiteLink className="text-link" to={verify}>Open verification page</SiteLink>}
        <button className="secondary" disabled={!verify || !canRecord} onClick={async () => {
          try {
            await copyText(url)
            setShowUrl(false)
            await dispatch(record({ verificationPath: path }), 'Verification link copied.')
          } catch {
            setShowUrl(true)
            notify('Copy the verification link from the field below.', 'failure')
          }
        }}><Link2 size={17} /> Copy verification link</button>
        <button disabled={!downloadable || !canRecord || downloading} onClick={async () => {
          setDownloading(true)
          try {
            const fileName = await downloadCertificate(certificate, dateText(certificate.createdAt))
            await dispatch(record({ fileName }), 'Certificate download started.')
          } catch {
            notify('The certificate PDF could not be downloaded. Try again.', 'failure')
          } finally {
            setDownloading(false)
          }
        }}><Download size={17} /> {downloading ? 'Preparing PDF…' : 'Download PDF'}</button>
      </div>
    </div>
    {(!downloadable || !canRecord) && <p className="info-note">Some download or copy actions are unavailable because credential details are missing.</p>}
    {showUrl && <label className="copy-fallback">Verification link
      <input value={url} readOnly onFocus={event => event.target.select()} />
    </label>}
    <CredentialPaper certificate={certificate} />
  </>
}

export function Verification() {
  const { verificationCode } = useParams()
  const { state } = useWorkspace()
  const certificate = list(state.certificates).find(row => row.verificationCode === verificationCode && row.status === 'issued')
  if (!certificate) return <Empty title="Credential unavailable" description="No issued credential matches this verification code in the current session." to="/accomplishments" action="Back to Accomplishments" />
  return <>
    <Back to="/accomplishments">Accomplishments</Back>
    <PageHeading title="Certificate verification" />
    <div className="verification-note"><ShieldCheck size={22} aria-hidden="true" /><div><strong>Verified course certificate</strong><p>This credential matches an issued certificate in this workspace.</p></div></div>
    <CredentialPaper certificate={certificate} />
  </>
}
