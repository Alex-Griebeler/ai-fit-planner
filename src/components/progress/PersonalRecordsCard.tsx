import { useState, useEffect } from 'react';
import { Trophy, TrendingUp, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PersonalRecord {
  exerciseName: string;
  maxLoad: number;
  date: string;
}

export function PersonalRecordsCard() {
  const { user } = useAuth();
  const [records, setRecords] = useState<PersonalRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRecords([]);
      setIsLoading(false);
      return;
    }

    const fetchRecords = async () => {
      setIsLoading(true);
      try {
        const { data: loads, error } = await supabase
          .from('exercise_loads')
          .select('exercise_name, load_value, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (!loads || loads.length === 0) {
          setRecords([]);
          setIsLoading(false);
          return;
        }

        // Group by exercise and find max load for each
        const recordsMap: Record<string, { maxLoad: number; date: string }> = {};

        loads.forEach(load => {
          const numericValue = parseFloat(load.load_value.replace(/[^\d.]/g, ''));
          
          if (!isNaN(numericValue)) {
            if (!recordsMap[load.exercise_name] || numericValue > recordsMap[load.exercise_name].maxLoad) {
              recordsMap[load.exercise_name] = {
                maxLoad: numericValue,
                date: load.created_at,
              };
            }
          }
        });

        // Convert to array and sort by max load (descending)
        const sortedRecords = Object.entries(recordsMap)
          .map(([exerciseName, data]) => ({
            exerciseName,
            maxLoad: data.maxLoad,
            date: data.date,
          }))
          .sort((a, b) => b.maxLoad - a.maxLoad)
          .slice(0, 5); // Top 5 records

        setRecords(sortedRecords);
      } catch (err) {
        console.error('Error fetching personal records:', err);
        setRecords([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecords();
  }, [user]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            Recordes Pessoais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (records.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            Recordes Pessoais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">
            <p>Registre cargas nos treinos para ver seus recordes</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          Recordes Pessoais
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {records.map((record, index) => (
            <div
              key={record.exerciseName}
              className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  index === 0 
                    ? 'bg-yellow-500/20 text-yellow-600' 
                    : index === 1 
                    ? 'bg-gray-400/20 text-gray-500'
                    : index === 2
                    ? 'bg-amber-600/20 text-amber-700'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {index + 1}
                </div>
                <div>
                  <p className="font-medium text-sm">{record.exerciseName}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(record.date), "dd 'de' MMM", { locale: ptBR })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-primary font-semibold">
                <TrendingUp className="w-4 h-4" />
                {record.maxLoad}kg
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
