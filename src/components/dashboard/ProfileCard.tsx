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
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Skeleton className="w-16 h-16 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-4 w-1/2" />
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
        <CardContent className="p-6 text-center">
          <User className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold text-foreground mb-1">
            Perfil incompleto
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
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

  const genderLabel = {
    female: 'Feminino',
    male: 'Masculino',
    other: 'Outro',
  };

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <Avatar className="w-16 h-16 bg-primary/10 text-primary">
            <AvatarFallback className="text-xl font-bold bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-foreground truncate">
                {profile.name}
              </h2>
              {isPremium && (
                <Badge className="bg-primary text-primary-foreground border-0 shrink-0">
                  <Crown className="w-3 h-3 mr-1" />
                  Premium
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
              {profile.gender && (
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5" />
                  {genderLabel[profile.gender]}
                </span>
              )}
              {profile.age && (
                <span>{profile.age} anos</span>
              )}
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/settings')}
            className="shrink-0"
          >
            <Settings className="w-5 h-5" />
          </Button>
        </div>

      </CardContent>
    </Card>
  );
}
