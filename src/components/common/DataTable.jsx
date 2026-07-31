export default function DataTable({ columns, rows, keyField = 'id', emptyLabel = 'No records to show', onRowClick, activeRowKey }) {
  if (!rows || rows.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-md border border-dashed border-border py-12 text-sm text-ink-faint dark:border-night-border dark:text-night-ink-faint">
        {emptyLabel}
      </div>
    )
  }

  return (
    <div className="scroll-thin overflow-x-auto rounded-md border border-border dark:border-night-border">
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-muted dark:border-night-border dark:bg-night-muted">
            {columns.map((col) => (
              <th key={col.key} className="whitespace-nowrap px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-ink-muted dark:text-night-ink-muted">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row[keyField]}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`border-b border-border last:border-0 dark:border-night-border ${
                onRowClick ? 'cursor-pointer' : ''
              } ${
                activeRowKey && activeRowKey === row[keyField]
                  ? 'bg-primary-light/60 dark:bg-primary/10'
                  : 'hover:bg-surface-muted/60 dark:hover:bg-night-muted/60'
              }`}
            >
              {columns.map((col) => (
                <td key={col.key} className="whitespace-nowrap px-4 py-3 text-ink dark:text-night-ink">
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
