import { useNavigate } from 'react-router-dom';
import { Profile } from '@/hooks/useProfile';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, Ruler, Scale, Settings, Crown } from 'lucide-react';
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
          <div className="animate-pulse flex items-center gap-4">
            <div className="w-16 h-16 bg-muted rounded-full" />
            <div className="space-y-2 flex-1">
              <div className="h-5 bg-muted rounded w-1/3" />
              <div className="h-4 bg-muted rounded w-1/2" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!profile) {
    return null;
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
                <Badge className="bg-gradient-to-r from-amber-500 to-amber-600 text-white border-0 shrink-0">
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

        {(profile.height || profile.weight) && (
          <div className="flex gap-6 mt-4 pt-4 border-t border-border">
            {profile.height && (
              <div className="flex items-center gap-2">
                <Ruler className="w-4 h-4 text-muted-foreground" />
                <span className="text-foreground font-medium">{profile.height} cm</span>
              </div>
            )}
            {profile.weight && (
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-muted-foreground" />
                <span className="text-foreground font-medium">{profile.weight} kg</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
