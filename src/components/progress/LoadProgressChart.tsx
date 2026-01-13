import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Info } from 'lucide-react';

export function LoadProgressChart() {
  // Placeholder data for demo - in production, this would fetch from exercise_loads table
  const chartData = useMemo(() => {
    // Demo data showing load progression
    return [
      { date: '01/01', 'Supino Reto': 60, 'Agachamento': 80 },
      { date: '08/01', 'Supino Reto': 62.5, 'Agachamento': 85 },
      { date: '15/01', 'Supino Reto': 65, 'Agachamento': 87.5 },
      { date: '22/01', 'Supino Reto': 65, 'Agachamento': 90 },
    ];
  }, []);

  const exerciseNames = ['Supino Reto', 'Agachamento'];
  const colors = ['#f59e0b', '#10b981'];

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
                stroke={colors[index % colors.length]}
                strokeWidth={2}
                dot={{ fill: colors[index % colors.length], r: 3 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <p>Os dados reais serão exibidos conforme você registra as cargas nos seus treinos.</p>
      </div>
    </div>
  );
}
