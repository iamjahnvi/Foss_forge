// Presentation of the compatibility report: a badge per resource and the
// report shown next to a manifest that is about to be imported.

import {
  compatibilityLabel,
  type CompatibilityEntry,
  type CompatibilityReport,
  type CompatibilityStatus,
} from './compatibility'

function badgeClasses(status: CompatibilityStatus, verified: boolean): string {
  if (status === 'present') {
    return verified
      ? 'bg-emerald-100 text-emerald-900'
      : 'bg-amber-100 text-amber-900'
  }
  if (status === 'missing' || status === 'integrity-mismatch') {
    return 'bg-red-100 text-red-900'
  }
  if (status === 'different-version') return 'bg-amber-100 text-amber-900'
  return 'bg-stone-200 text-stone-700'
}

export function CompatibilityBadge({ entry }: { entry: CompatibilityEntry }) {
  return (
    <span
      className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClasses(
        entry.status,
        entry.verified,
      )}`}
    >
      {compatibilityLabel(entry)}
    </span>
  )
}

export function CompatibilityReportView({
  report,
  inventoryCount,
}: {
  report: CompatibilityReport
  inventoryCount: number
}) {
  const other = report.total - report.presentCount

  return (
    <div className="mt-6 rounded-lg border border-stone-200 bg-white p-4">
      <h4 className="text-sm font-semibold">Compatibility with the local inventory</h4>

      {inventoryCount === 0 ? (
        <p className="mt-2 text-sm leading-6 text-slate-600">
          No local archives are scanned yet, so nothing can be matched. Choose ZIM files
          from the collection editor to check which of them this collection needs.
        </p>
      ) : (
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {report.presentCount} of {report.total}{' '}
          {report.total === 1 ? 'resource is' : 'resources are'} present on this machine
          {other > 0 ? `, ${other} need attention` : ''}.
        </p>
      )}

      {report.entries.length > 0 && (
        <ul className="mt-3 divide-y divide-stone-200">
          {report.entries.map((entry) => (
            <li key={entry.resourceId} className="py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">{entry.title}</span>
                <CompatibilityBadge entry={entry} />
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-600">{entry.detail}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
