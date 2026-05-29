interface LegendItem {
  color: string;
  label: string;
  description: string;
}

const LEGEND_ITEMS: LegendItem[] = [
  {
    color: 'bg-blue-100 border border-blue-300',
    label: 'Available',
    description: 'Open time slots',
  },
  {
    color: 'bg-amber-100 border border-amber-300',
    label: 'Pending',
    description: 'Awaiting confirmation',
  },
  {
    color: 'bg-emerald-100 border border-emerald-400',
    label: 'Confirmed',
    description: 'Booked with meeting link',
  },
  {
    color: 'bg-zinc-100 border border-zinc-300',
    label: 'Cancelled',
    description: 'No longer active',
  },
  {
    color: 'bg-gray-100 border border-gray-300',
    label: 'Completed',
    description: 'Meeting has ended',
  },
];

export function CalendarLegend() {
  return (
    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 px-1">
      {LEGEND_ITEMS.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5" title={item.description}>
          <span
            className={`inline-block h-3 w-3 rounded-sm shrink-0 ${item.color}`}
            aria-hidden="true"
          />
          <span className="text-xs text-muted-foreground">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

export default CalendarLegend;
