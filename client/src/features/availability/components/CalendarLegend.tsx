interface CalendarLegendProps {
  /** When true, only show the blue "read-only" swatch (viewing another user's calendar) */
  readOnly?: boolean;
}

interface LegendItem {
  color: string;
  label: string;
  description: string;
}

const OWN_ITEMS: LegendItem[] = [
  {
    color: 'bg-green-100 border border-green-300',
    label: 'Routine slot',
    description: 'Recurring availability from your weekly routine',
  },
  {
    color: 'bg-orange-100 border border-orange-300',
    label: 'Custom override',
    description: 'Manually set for this specific date, overrides routine',
  },
];

const READONLY_ITEMS: LegendItem[] = [
  {
    color: 'bg-blue-100 border border-blue-300',
    label: 'Available',
    description: 'Open slots you can book',
  },
];

export function CalendarLegend({ readOnly = false }: CalendarLegendProps) {
  const items = readOnly ? READONLY_ITEMS : OWN_ITEMS;

  return (
    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 px-1">
      {items.map((item) => (
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
