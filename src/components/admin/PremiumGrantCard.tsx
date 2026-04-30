import { useState } from 'react';
import { Crown, Loader2, UserCheck, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ResultLine {
  email: string;
  status: 'success' | 'error';
  message: string;
}

export function PremiumGrantCard() {
  const [emailsInput, setEmailsInput] = useState('');
  const [durationDays, setDurationDays] = useState(365);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<ResultLine[]>([]);

  const parseEmails = (raw: string): string[] => {
    return Array.from(
      new Set(
        raw
          .split(/[\s,;]+/)
          .map((e) => e.trim().toLowerCase())
          .filter((e) => e.length > 0),
      ),
    );
  };

  const run = async (action: 'grant' | 'revoke') => {
    const emails = parseEmails(emailsInput);
    if (emails.length === 0) {
      toast.error('Informe ao menos um email');
      return;
    }

    setIsProcessing(true);
    setResults([]);
    const newResults: ResultLine[] = [];

    for (const email of emails) {
      try {
        const { data, error } = await supabase.functions.invoke('admin-grant-premium', {
          body: { email, action, durationDays },
        });
        if (error) {
          newResults.push({ email, status: 'error', message: error.message });
        } else if (data?.error) {
          newResults.push({
            email,
            status: 'error',
            message: data.error === 'user_not_found' ? 'Usuário não cadastrado' : String(data.error),
          });
        } else {
          newResults.push({
            email,
            status: 'success',
            message: action === 'grant' ? 'Premium concedido' : 'Premium revogado',
          });
        }
      } catch (err) {
        newResults.push({
          email,
          status: 'error',
          message: err instanceof Error ? err.message : 'Erro desconhecido',
        });
      }
      setResults([...newResults]);
    }

    setIsProcessing(false);
    const ok = newResults.filter((r) => r.status === 'success').length;
    const fail = newResults.length - ok;
    if (ok > 0) toast.success(`${ok} processado(s) com sucesso`);
    if (fail > 0) toast.error(`${fail} falha(s)`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="w-5 h-5 text-amber-500" />
          Gerenciar Premium por Email
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Emails (separados por vírgula, espaço ou linha)
          </label>
          <textarea
            value={emailsInput}
            onChange={(e) => setEmailsInput(e.target.value)}
            placeholder="user1@example.com, user2@example.com"
            rows={4}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            disabled={isProcessing}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Duração (dias)</label>
          <Input
            type="number"
            min={1}
            max={3650}
            value={durationDays}
            onChange={(e) => setDurationDays(Number(e.target.value) || 365)}
            disabled={isProcessing}
          />
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => run('grant')}
            disabled={isProcessing}
            className="flex-1"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <UserCheck className="w-4 h-4 mr-2" />
            )}
            Conceder Premium
          </Button>
          <Button
            onClick={() => run('revoke')}
            disabled={isProcessing}
            variant="outline"
            className="flex-1"
          >
            <UserX className="w-4 h-4 mr-2" />
            Revogar
          </Button>
        </div>

        {results.length > 0 && (
          <div className="border border-border rounded-md p-3 space-y-1 max-h-64 overflow-y-auto">
            {results.map((r, i) => (
              <div
                key={i}
                className={`text-xs flex justify-between gap-2 ${
                  r.status === 'success' ? 'text-emerald-600' : 'text-destructive'
                }`}
              >
                <span className="font-mono truncate">{r.email}</span>
                <span>{r.message}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
