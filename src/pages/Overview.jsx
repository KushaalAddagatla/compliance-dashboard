import { useEffect, useState } from 'react'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, ResponsiveContainer, Tooltip,
} from 'recharts'
import { ShieldCheck, ShieldAlert, Clock } from 'lucide-react'
import api from '../api'

// Shown when /api/compliance-score returns no frameworks yet
const PLACEHOLDER_FRAMEWORKS = [
  { framework: 'NIST-800-53', score: 0, totalControls: 0, violatedControls: 0 },
  { framework: 'CIS-AWS',     score: 0, totalControls: 0, violatedControls: 0 },
  { framework: 'SOC2',        score: 0, totalControls: 0, violatedControls: 0 },
]

function ScoreCard({ framework, score, total, violated }) {
  const pct = Math.round(score)
  const color = pct >= 80 ? '#22c55e' : pct >= 60 ? '#f97316' : '#ef4444'
  return (
    <div className="score-card">
      <div className="score-label">{framework}</div>
      <div className="score-value" style={{ color }}>{pct}<span>%</span></div>
      <div className="score-sub">
        {violated} / {total} controls violated
      </div>
    </div>
  )
}

function Skeleton({ height = 20, width = '100%' }) {
  return <div className="skeleton" style={{ height, width }} />
}

export default function Overview() {
  const [data, setData] = useState(null)
  const [lastScanned, setLastScanned] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/api/compliance-score'),
      api.get('/api/scan-runs?limit=1'),
    ]).then(([scoreRes, scanRes]) => {
      setData(scoreRes.data)
      if (scanRes.data.length > 0) setLastScanned(scanRes.data[0].createdAt)
    }).finally(() => setLoading(false))
  }, [])

  const frameworks = data?.frameworks?.length > 0
    ? data.frameworks
    : PLACEHOLDER_FRAMEWORKS

  const radarData = frameworks.map(f => ({
    framework: f.framework.replace('NIST-800-53', 'NIST').replace('CIS-AWS', 'CIS'),
    score: f.score,
  }))

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Compliance Overview</h1>
        {lastScanned && (
          <div className="last-scanned">
            <Clock size={13} />
            Last scanned: {timeAgo(lastScanned)}
          </div>
        )}
      </div>

      {/* Score cards */}
      <div className="score-cards">
        {loading
          ? [0, 1, 2].map(i => (
              <div key={i} className="score-card">
                <Skeleton height={14} width={80} />
                <Skeleton height={52} width={100} />
                <Skeleton height={12} width={120} />
              </div>
            ))
          : frameworks.map(f => (
              <ScoreCard
                key={f.framework}
                framework={f.framework}
                score={f.score}
                total={f.totalControls}
                violated={f.violatedControls}
              />
            ))
        }
      </div>

      {/* Radar chart */}
      <div className="card" style={{ marginTop: 24 }}>
        <div className="card-title">
          <ShieldCheck size={16} /> Compliance Posture
        </div>
        {loading ? (
          <Skeleton height={280} />
        ) : frameworks[0].totalControls === 0 ? (
          <EmptyState
            icon={<ShieldAlert size={32} />}
            message="No framework data yet"
            sub="Ingest compliance PDFs to populate scores"
          />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
              <PolarGrid stroke="#2d3148" />
              <PolarAngleAxis dataKey="framework" tick={{ fill: '#94a3b8', fontSize: 13 }} />
              <PolarRadiusAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} />
              <Radar
                dataKey="score"
                stroke="#818cf8"
                fill="#818cf8"
                fillOpacity={0.25}
                dot={{ fill: '#818cf8', r: 4 }}
              />
              <Tooltip
                contentStyle={{ background: '#1a1d27', border: '1px solid #2d3148', borderRadius: 6 }}
                formatter={v => [`${v}%`, 'Score']}
              />
            </RadarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Overall score */}
      {!loading && data && (
        <div className="overall-score">
          Overall: <strong>{data.overallScore}%</strong>
        </div>
      )}
    </div>
  )
}

function EmptyState({ icon, message, sub }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <div className="empty-message">{message}</div>
      {sub && <div className="empty-sub">{sub}</div>}
    </div>
  )
}

function timeAgo(isoString) {
  const diff = Math.floor((Date.now() - new Date(isoString)) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}
