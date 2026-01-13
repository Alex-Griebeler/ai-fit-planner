import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Loader2 } from 'lucide-react';
import { useLoadProgressData } from '@/hooks/useLoadProgressData';

const COLOR_PALETTE = [
  'hsl(var(--primary))',
  'hsl(142, 76%, 36%)', // green
  'hsl(38, 92%, 50%)',  // amber
  'hsl(217, 91%, 60%)', // blue
  'hsl(280, 87%, 65%)', // purple
  'hsl(350, 89%, 60%)', // rose
];

export function LoadProgressChart() {
  const { data: chartData, exerciseNames, isLoading } = useLoadProgressData();

  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        <p>Sem dados de carga registrados ainda.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
            />
            <YAxis 
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              label={{ value: 'kg', angle: -90, position: 'insideLeft', fontSize: 10 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            {exerciseNames.map((name, index) => (
              <Line
                key={name}
                type="monotone"
                dataKey={name}
                stroke={COLOR_PALETTE[index % COLOR_PALETTE.length]}
                strokeWidth={2}
                dot={{ fill: COLOR_PALETTE[index % COLOR_PALETTE.length], r: 3 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
