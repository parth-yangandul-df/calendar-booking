import { Card, CardContent } from '@/components/ui/card';

interface StatCardProps {
  label: string;
  value: number;
}

export function StatCard({ label, value }: StatCardProps) {
  return (
    <Card className="flex-1">
      <CardContent className="flex flex-col gap-1 pt-6">
        <span className="text-3xl font-semibold">{value}</span>
        <span className="text-sm text-muted-foreground">{label}</span>
      </CardContent>
    </Card>
  );
}
