import { useEffect, useState } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import PageHeader from '../components/common/PageHeader.jsx'
import ChartCard from '../components/common/ChartCard.jsx'
import Loader from '../components/common/Loader.jsx'
import { getCategoryDistribution, getClassificationSummary } from '../services/api.js'

export default function Classification() {
  const [categories, setCategories] = useState(null)
  const [summary, setSummary] = useState(null)

  useEffect(() => {
    getCategoryDistribution().then(setCategories)
    getClassificationSummary().then(setSummary)
  }, [])

  const totalObjects = categories ? categories.reduce((sum, entry) => sum + entry.count, 0) : 0
  const dominant = categories ? [...categories].sort((a, b) => b.share - a.share)[0] : null
  const priorityCategories = categories
    ? [...categories].sort((a, b) => b.share - a.share).slice(0, 2).map((entry) => entry.category)
    : []

  return (
    <div>
      <PageHeader title="Classification" subtitle="How waste recovered from Dal Lake breaks down by category" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <ChartCard title="Dal Lake Waste Category Breakdown" subtitle="All zones, current survey cycle" className="lg:col-span-2">
          {!categories ? (
            <Loader />
          ) : (
            <>
              <div className="relative">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={categories}
                      dataKey="count"
                      nameKey="category"
                      innerRadius={72}
                      outerRadius={110}
                      paddingAngle={2}
                      animationDuration={900}
                    >
                      {categories.map((entry) => (
                        <Cell key={entry.category} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6, borderColor: '#DDE2D6' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="num text-2xl font-semibold text-ink dark:text-night-ink">{totalObjects.toLocaleString('en-IN')}</span>
                  <span className="text-xs text-ink-faint dark:text-night-ink-faint">objects classified</span>
                </div>
              </div>
              {dominant && (
                <p className="mt-3 text-center text-xs text-ink-muted dark:text-night-ink-muted">
                  <span className="font-medium text-ink dark:text-night-ink">{dominant.category}</span> is the most
                  dominant waste category at {dominant.share}% of everything recovered
                </p>
              )}
            </>
          )}
        </ChartCard>

        <div className="lg:col-span-3">
          <h3 className="mb-3 text-sm font-semibold text-ink dark:text-night-ink">Category Statistics</h3>
          {!summary ? (
            <Loader />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {summary.map((item) => {
                const matchColor = categories?.find((entry) => entry.category === item.category)?.color || '#1E8449'
                const isPriority = priorityCategories.includes(item.category)
                return (
                  <div key={item.category} className="rounded-md border border-border dark:border-night-border bg-surface dark:bg-night-surface p-4 shadow-card">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: matchColor }} />
                        <span className="text-sm font-medium text-ink dark:text-night-ink">{item.category}</span>
                      </div>
                      {isPriority && (
                        <span className="rounded-full bg-danger-light px-2 py-0.5 text-[10px] font-medium text-danger dark:bg-danger/15">
                          Cleanup priority
                        </span>
                      )}
                    </div>
                    <p className="num mt-2 text-xl font-semibold text-ink dark:text-night-ink">{item.count.toLocaleString('en-IN')}</p>
                    <p className="text-xs text-ink-faint dark:text-night-ink-faint">objects identified</p>

                    <div className="mt-3">
                      <div className="mb-1 flex items-center justify-between text-xs text-ink-muted dark:text-night-ink-muted">
                        <span>Avg confidence</span>
                        <span className="num">{Math.round(item.avgConfidence * 100)}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-surface-muted dark:bg-night-muted">
                        <div
                          className="h-1.5 rounded-full bg-primary"
                          style={{ width: `${item.avgConfidence * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
