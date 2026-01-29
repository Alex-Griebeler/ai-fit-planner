import { useNavigate } from 'react-router-dom';
import { Profile } from '@/hooks/useProfile';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { User, Settings, Crown } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';

interface ProfileCardProps {
  profile: Profile | null;
  isLoading: boolean;
}

export function ProfileCard({ profile, isLoading }: ProfileCardProps) {
  const navigate = useNavigate();
  const { isPremium } = useSubscription();

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="w-12 h-12 rounded-full" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="w-9 h-9 rounded-md" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!profile) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-4 text-center">
          <User className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
          <h3 className="font-semibold text-foreground mb-1 text-sm">
            Perfil incompleto
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            Complete seu perfil para uma experiência personalizada
          </p>
          <Button variant="outline" size="sm" onClick={() => navigate('/settings')}>
            <Settings className="w-4 h-4 mr-2" />
            Completar Perfil
          </Button>
        </CardContent>
      </Card>
    );
  }

  const initials = profile.name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <Avatar className="w-12 h-12 bg-primary/10 text-primary">
            <AvatarFallback className="text-lg font-bold bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-foreground truncate">
                {profile.name}
              </h2>
              {isPremium && (
                <Badge className="bg-primary text-primary-foreground border-0 shrink-0 text-xs px-1.5 py-0.5">
                  <Crown className="w-3 h-3 mr-0.5" />
                  Pro
                </Badge>
              )}
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/settings')}
            className="shrink-0"
            aria-label="Configurações"
          >
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
