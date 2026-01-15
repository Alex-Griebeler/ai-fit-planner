import { useTheme } from 'next-themes';
import { Sun, Moon, Monitor } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const themes = [
  { value: 'light', label: 'Claro', icon: Sun, description: 'Tema claro para ambientes iluminados' },
  { value: 'dark', label: 'Escuro', icon: Moon, description: 'Tema escuro para uso noturno' },
  { value: 'system', label: 'Sistema', icon: Monitor, description: 'Segue a preferência do dispositivo' },
] as const;

export function ThemeSection() {
  const { theme, setTheme } = useTheme();

  return (
    <Card className="glass border-border/50">
      <CardHeader>
        <CardTitle className="text-lg">Tema</CardTitle>
        <CardDescription>
          Escolha o tema de cores do aplicativo
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          {themes.map(({ value, label, icon: Icon, description }) => (
            <Button
              key={value}
              variant="outline"
              onClick={() => setTheme(value)}
              className={cn(
                "h-auto flex-col gap-2 p-4 transition-all",
                theme === value 
                  ? "border-primary bg-primary/10 text-primary" 
                  : "border-border/50 hover:border-primary/50"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-sm font-medium">{label}</span>
            </Button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-4 text-center">
          {themes.find(t => t.value === theme)?.description || 'Selecione um tema'}
        </p>
      </CardContent>
    </Card>
  );
}
