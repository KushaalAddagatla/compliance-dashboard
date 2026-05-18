import { useEffect, useState } from 'react'
import { AlertTriangle, ThumbsDown, X, ChevronRight, Check, Zap } from 'lucide-react'
import api from '../api'

const FRAMEWORKS = ['', 'NIST-800-53', 'CIS-AWS', 'SOC2']
const SEVERITIES = ['', 'HIGH', 'MEDIUM', 'LOW']

function SeverityChip({ severity }) {
  return <span className={`chip chip-${severity?.toLowerCase()}`}>{severity}</span>
}

function Skeleton({ height = 20, width = '100%' }) {
  return <div className="skeleton" style={{ height, width }} />
}

function EmptyState() {
  return (
    <div className="empty-state">
      <div className="empty-icon"><AlertTriangle size={32} /></div>
      <div className="empty-message">No violations found</div>
      <div className="empty-sub">Try adjusting filters or trigger a pipeline run</div>
    </div>
  )
}

function ViolationDrawer({ violation, onClose, onFeedback }) {
  const [reason, setReason]       = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Remediation plan state
  const [remediation, setRemediation]     = useState(null)   // null=loading, false=none, obj=plan
  const [remLoading, setRemLoading]       = useState(false)
  const [approvalStatus, setApprovalStatus] = useState(null)
  const [approving, setApproving]         = useState(false)

  // Fetch remediation plan whenever the selected violation changes
  useEffect(() => {
    if (!violation) return
    setRemediation(null)
    setRemLoading(true)
    setApprovalStatus(null)
    api.get(`/api/violations/${violation.id}/remediation`)
      .then(r => { setRemediation(r.data); setApprovalStatus(r.data.approvalStatus) })
      .catch(() => setRemediation(false))   // 404 = no plan generated yet
      .finally(() => setRemLoading(false))
  }, [violation?.id])

  if (!violation) return null

  function handleFeedback() {
    setSubmitting(true)
    api.post(`/api/violations/${violation.id}/feedback`, { reason: reason || 'Marked as false positive' })
      .then(() => { setSubmitted(true); onFeedback(violation.id) })
      .finally(() => setSubmitting(false))
  }

  function updateApproval(status) {
    if (!remediation) return
    setApproving(true)
    api.patch(`/api/remediations/${remediation.id}/status`, { status })
      .then(() => setApprovalStatus(status))
      .finally(() => setApproving(false))
  }

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer">
        <div className="drawer-header">
          <div>
            <div className="drawer-title">{violation.controlId}</div>
            <div className="drawer-sub">{violation.framework}</div>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="drawer-body">
          {/* Violation metadata */}
          <div className="detail-row">
            <span className="detail-label">Resource</span>
            <span className="detail-value mono">{violation.resourceId}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Type</span>
            <span className="detail-value">{violation.resourceType}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Severity</span>
            <span className="detail-value"><SeverityChip severity={violation.severity} /></span>
          </div>
          <div className="detail-row">
            <span className="detail-label">First seen</span>
            <span className="detail-value">{new Date(violation.firstSeenAt).toLocaleString()}</span>
          </div>

          <div className="detail-section">
            <div className="detail-label">Reasoning</div>
            <div className="detail-text">{violation.reasoning}</div>
          </div>

          {violation.citedExcerpt && (
            <div className="detail-section">
              <div className="detail-label">Cited framework excerpt</div>
              <blockquote className="cited-excerpt">"{violation.citedExcerpt}"</blockquote>
            </div>
          )}

          {/* ── Remediation plan ──────────────────────────────────── */}
          <hr className="remediation-divider" />

          <div className="detail-section">
            <div className="detail-label">Remediation plan</div>

            {remLoading && (
              <div className="remediation-loading">Loading plan…</div>
            )}

            {!remLoading && remediation === false && (
              <div className="no-remediation">
                No plan generated yet — trigger a pipeline run to create one.
              </div>
            )}

            {!remLoading && remediation && (
              <>
                {remediation.autoRemediable && (
                  <div style={{ marginBottom: 6 }}>
                    <span className="auto-badge"><Zap size={10} /> Auto-remediable</span>
                  </div>
                )}

                <div className="detail-text" style={{ whiteSpace: 'pre-wrap' }}>
                  {remediation.steps}
                </div>

                {remediation.cliCommands && (
                  <div className="detail-section" style={{ marginTop: 8 }}>
                    <div className="detail-label">AWS CLI commands</div>
                    <pre className="code-block">{remediation.cliCommands}</pre>
                  </div>
                )}

                {remediation.terraformPatch && (
                  <div className="detail-section" style={{ marginTop: 8 }}>
                    <div className="detail-label">Terraform patch</div>
                    <pre className="code-block">{remediation.terraformPatch}</pre>
                  </div>
                )}

                {/* Approve / Reject */}
                <div className="detail-section" style={{ marginTop: 10 }}>
                  <div className="detail-label">Human approval</div>
                  {approvalStatus === 'PENDING' ? (
                    <div className="approval-row">
                      <button
                        className="btn-approve"
                        onClick={() => updateApproval('APPROVED')}
                        disabled={approving}
                      >
                        <Check size={13} />
                        {approving ? '…' : 'Approve'}
                      </button>
                      <button
                        className="btn-reject"
                        onClick={() => updateApproval('REJECTED')}
                        disabled={approving}
                      >
                        <X size={13} />
                        {approving ? '…' : 'Reject'}
                      </button>
                    </div>
                  ) : (
                    <div className={`approval-done ${approvalStatus?.toLowerCase()}`}>
                      {approvalStatus === 'APPROVED' ? '✓ Approved' : '✕ Rejected'}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* ── False positive feedback ───────────────────────────── */}
          <hr className="remediation-divider" />

          <div className="detail-section feedback-section">
            <div className="detail-label">False positive?</div>
            {submitted ? (
              <div className="feedback-thanks">Feedback recorded — thank you</div>
            ) : (
              <>
                <textarea
                  className="feedback-input"
                  placeholder="Optional: explain why this is a false positive"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  rows={2}
                />
                <button
                  className="btn-ghost"
                  onClick={handleFeedback}
                  disabled={submitting}
                >
                  <ThumbsDown size={14} />
                  {submitting ? 'Submitting…' : 'Mark as false positive'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default function Violations() {
  const [violations, setViolations] = useState([])
  const [loading, setLoading] = useState(true)
  const [framework, setFramework] = useState('')
  const [severity, setSeverity] = useState('')
  const [selected, setSelected] = useState(null)
  const [falsePositives, setFalsePositives] = useState(new Set())

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ limit: 100 })
    if (framework) params.set('framework', framework)
    if (severity) params.set('severity', severity)

    api.get(`/api/violations?${params}`)
      .then(r => setViolations(r.data))
      .finally(() => setLoading(false))
  }, [framework, severity])

  function handleFeedback(id) {
    setFalsePositives(prev => new Set([...prev, id]))
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Violations</h1>
        {!loading && (
          <div className="result-count">
            {violations.length} result{violations.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="filter-row">
        <select className="filter-select" value={framework} onChange={e => setFramework(e.target.value)}>
          <option value="">All frameworks</option>
          {FRAMEWORKS.slice(1).map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <select className="filter-select" value={severity} onChange={e => setSeverity(e.target.value)}>
          <option value="">All severities</option>
          {SEVERITIES.slice(1).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="table-skeletons">
          {[0,1,2,3,4].map(i => <Skeleton key={i} height={44} />)}
        </div>
      ) : violations.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="table-wrap">
          <table className="violations-table">
            <thead>
              <tr>
                <th>Resource</th>
                <th>Control ID</th>
                <th>Framework</th>
                <th>Severity</th>
                <th>First seen</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {violations.map(v => (
                <tr
                  key={v.id}
                  className={falsePositives.has(v.id) ? 'row-muted' : ''}
                  onClick={() => setSelected(v)}
                >
                  <td>
                    <div className="resource-cell">
                      {v.isNew && <span className="badge-new">NEW</span>}
                      <span className="mono">{truncate(v.resourceId, 32)}</span>
                      <span className="resource-type">{v.resourceType}</span>
                    </div>
                  </td>
                  <td><code>{v.controlId}</code></td>
                  <td>{v.framework}</td>
                  <td><SeverityChip severity={v.severity} /></td>
                  <td className="timestamp">{relativeDate(v.firstSeenAt)}</td>
                  <td>
                    <button className="view-btn" onClick={e => { e.stopPropagation(); setSelected(v) }}>
                      <ChevronRight size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ViolationDrawer
        violation={selected}
        onClose={() => setSelected(null)}
        onFeedback={handleFeedback}
      />
    </div>
  )
}

function truncate(str, n) {
  return str && str.length > n ? str.slice(0, n) + '…' : str
}

function relativeDate(iso) {
  if (!iso) return '—'
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return new Date(iso).toLocaleDateString()
}
