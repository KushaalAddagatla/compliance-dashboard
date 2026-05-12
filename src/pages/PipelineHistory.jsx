import { useEffect, useState } from 'react'
import { History, CheckCircle, AlertCircle } from 'lucide-react'
import api from '../api'

function Skeleton({ height = 20, width = '100%' }) {
  return <div className="skeleton" style={{ height, width }} />
}

function EmptyState() {
  return (
    <div className="empty-state">
      <div className="empty-icon"><History size={32} /></div>
      <div className="empty-message">No scan runs yet</div>
      <div className="empty-sub">Trigger a pipeline run to populate history</div>
    </div>
  )
}

export default function PipelineHistory() {
  const [runs, setRuns] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/scan-runs?limit=50')
      .then(r => setRuns(r.data))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Scan History</h1>
        {!loading && (
          <div className="result-count">{runs.length} run{runs.length !== 1 ? 's' : ''}</div>
        )}
      </div>

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
                <th>Time</th>
                <th>Violations found</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {runs.map(run => (
                <tr key={run.id}>
                  <td><span className="mono">{run.id.slice(0, 8)}…</span></td>
                  <td className="timestamp">{formatDate(run.createdAt)}</td>
                  <td>
                    <span style={{ color: run.violationCount > 0 ? '#fb923c' : '#22c55e', fontWeight: 600 }}>
                      {run.violationCount}
                    </span>
                  </td>
                  <td>
                    {run.violationCount > 0
                      ? <span className="status-chip status-warn"><AlertCircle size={11} /> Violations</span>
                      : <span className="status-chip status-ok"><CheckCircle size={11} /> Clean</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}
