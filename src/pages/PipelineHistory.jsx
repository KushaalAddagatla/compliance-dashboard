import { useEffect, useRef, useState } from 'react'
import { History, CheckCircle, AlertCircle, Loader, Play } from 'lucide-react'
import api from '../api'

function Skeleton({ height = 20, width = '100%' }) {
  return <div className="skeleton" style={{ height, width }} />
}

function EmptyState() {
  return (
    <div className="empty-state">
      <div className="empty-icon"><History size={32} /></div>
      <div className="empty-message">No pipeline runs yet</div>
      <div className="empty-sub">Click "Trigger Manual Run" to start the first pipeline</div>
    </div>
  )
}

function StatusChip({ status }) {
  if (status === 'COMPLETED') return (
    <span className="status-chip status-ok"><CheckCircle size={11} /> Completed</span>
  )
  if (status === 'FAILED') return (
    <span className="status-chip status-failed"><AlertCircle size={11} /> Failed</span>
  )
  // RUNNING
  return (
    <span className="status-chip status-running"><Loader size={11} /> Running…</span>
  )
}

export default function PipelineHistory() {
  const [runs, setRuns]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [triggering, setTriggering] = useState(false)
  const [triggerMsg, setTriggerMsg] = useState(null)
  const pollRef = useRef(null)

  function fetchRuns() {
    return api.get('/api/pipeline-runs?limit=50')
      .then(r => setRuns(r.data))
  }

  // Auto-poll every 3s while any run is RUNNING
  function maybeSchedulePoll(runsList) {
    const hasRunning = runsList.some(r => r.status === 'RUNNING')
    if (hasRunning && !pollRef.current) {
      pollRef.current = setInterval(() => {
        fetchRuns().then(r => {
          // r is undefined (setRuns is the side effect); read state via the setter
          setRuns(prev => {
            const stillRunning = prev.some(x => x.status === 'RUNNING')
            if (!stillRunning && pollRef.current) {
              clearInterval(pollRef.current)
              pollRef.current = null
            }
            return prev
          })
        })
      }, 3000)
    } else if (!hasRunning && pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  useEffect(() => {
    fetchRuns()
      .then(() => setRuns(prev => { maybeSchedulePoll(prev); return prev }))
      .finally(() => setLoading(false))
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Re-evaluate polling whenever runs change
  useEffect(() => { maybeSchedulePoll(runs) }, [runs]) // eslint-disable-line react-hooks/exhaustive-deps

  function triggerRun() {
    setTriggering(true)
    setTriggerMsg(null)
    api.post('/api/pipeline/trigger')
      .then(r => {
        setTriggerMsg(`Pipeline started — run ${r.data.pipelineRunId.slice(0, 8)}…`)
        return fetchRuns()
      })
      .catch(() => setTriggerMsg('Failed to trigger pipeline — is the backend running?'))
      .finally(() => setTriggering(false))
  }

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 className="page-title">Pipeline History</h1>
          {!loading && (
            <div className="result-count">{runs.length} run{runs.length !== 1 ? 's' : ''}</div>
          )}
        </div>
        <button className="btn-primary" onClick={triggerRun} disabled={triggering}>
          <Play size={13} />
          {triggering ? 'Starting…' : 'Trigger Manual Run'}
        </button>
      </div>

      {triggerMsg && (
        <div style={{ fontSize: 12, color: '#818cf8', marginBottom: 12, marginTop: -4 }}>
          {triggerMsg}
        </div>
      )}

      {loading ? (
        <div className="table-skeletons">
          {[0,1,2,3].map(i => <Skeleton key={i} height={48} />)}
        </div>
      ) : runs.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="table-wrap">
          <table className="violations-table">
            <thead>
              <tr>
                <th>Run ID</th>
                <th>Started</th>
                <th>Duration</th>
                <th>Status</th>
                <th>Violations</th>
                <th>New</th>
              </tr>
            </thead>
            <tbody>
              {runs.map(run => (
                <tr key={run.id}>
                  <td><span className="mono">{run.id.slice(0, 8)}…</span></td>
                  <td className="timestamp">{formatDate(run.startTime)}</td>
                  <td className="timestamp">{duration(run.startTime, run.endTime)}</td>
                  <td><StatusChip status={run.status} /></td>
                  <td>
                    {run.violationsFound > 0
                      ? <span style={{ color: '#fb923c', fontWeight: 600 }}>{run.violationsFound}</span>
                      : <span style={{ color: '#22c55e', fontWeight: 600 }}>{run.violationsFound}</span>
                    }
                  </td>
                  <td>
                    {run.newViolations > 0
                      ? <span className="badge-new">{run.newViolations} new</span>
                      : <span style={{ color: '#4b5563', fontSize: 12 }}>—</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {runs.some(r => r.errorMessage) && (
        <div style={{ marginTop: 16 }}>
          {runs.filter(r => r.errorMessage).slice(0, 3).map(run => (
            <div key={run.id} style={{ fontSize: 11, color: '#f87171', marginBottom: 4 }}>
              <span className="mono">{run.id.slice(0, 8)}</span> — {run.errorMessage}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function duration(startIso, endIso) {
  if (!startIso || !endIso) return '—'
  const secs = Math.round((new Date(endIso) - new Date(startIso)) / 1000)
  if (secs < 60) return `${secs}s`
  const mins = Math.floor(secs / 60)
  const rem  = secs % 60
  return rem > 0 ? `${mins}m ${rem}s` : `${mins}m`
}
