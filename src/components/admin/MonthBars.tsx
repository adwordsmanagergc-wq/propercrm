import { formatMoney } from '@/lib/money';

/**
 * One series, one axis: a month-by-month bar chart in the brand blue. Values
 * sit in a native tooltip and in the hidden table below for screen readers.
 */
export function MonthBars({
  title,
  months,
}: {
  title: string;
  months: { label: string; value: number }[];
}) {
  const max = Math.max(1, ...months.map((m) => m.value));
  const best = months.reduce(
    (top, m) => (m.value > top.value ? m : top),
    months[0] ?? { label: '', value: 0 },
  );

  return (
    <figure className="space-y-3">
      <figcaption className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold">{title}</span>
        {best.value > 0 ? (
          <span className="text-xs text-grey-500">
            Best: {best.label} {formatMoney(best.value)}
          </span>
        ) : null}
      </figcaption>
      <div className="flex h-40 items-end gap-[2px] border-b border-grey-200" aria-hidden="true">
        {months.map((month) => (
          <div
            key={month.label}
            className="group flex h-full flex-1 flex-col justify-end"
            title={`${month.label}: ${formatMoney(month.value)}`}
          >
            <div
              className="w-full rounded-t-[4px] bg-blue-500 transition-colors group-hover:bg-blue-700"
              style={{
                height: `${(month.value / max) * 100}%`,
                minHeight: month.value > 0 ? 2 : 0,
              }}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-[2px] text-[10px] text-grey-500" aria-hidden="true">
        {months.map((month, index) => (
          <span key={month.label} className="flex-1 text-center">
            {index % 2 === 0 ? month.label.slice(0, 3) : ''}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <caption>{title}</caption>
        <tbody>
          {months.map((month) => (
            <tr key={month.label}>
              <th scope="row">{month.label}</th>
              <td>{formatMoney(month.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
