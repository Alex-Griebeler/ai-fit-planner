import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, User, Dumbbell, Heart, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useProfile } from '@/hooks/useProfile';
import { useOnboardingData } from '@/hooks/useOnboardingData';
import { ProfileSection } from '@/components/settings/ProfileSection';
import { TrainingSection } from '@/components/settings/TrainingSection';
import { HealthSection } from '@/components/settings/HealthSection';
import { WellbeingSection } from '@/components/settings/WellbeingSection';
import { Loader2 } from 'lucide-react';

export default function Settings() {
  const navigate = useNavigate();
  const { profile, isLoading: profileLoading, updateProfile, isUpdating } = useProfile();
  const { onboardingData, isLoading: onboardingLoading, updateOnboardingData, isSaving } = useOnboardingData();
  const [activeTab, setActiveTab] = useState('profile');

  const isLoading = profileLoading || onboardingLoading;
  const isSavingAny = isUpdating || isSaving;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">Configurações</h1>
        </div>
      </header>

      {/* Content */}
      <main className="container max-w-4xl mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">Perfil</span>
              </TabsTrigger>
              <TabsTrigger value="training" className="flex items-center gap-2">
                <Dumbbell className="w-4 h-4" />
                <span className="hidden sm:inline">Treino</span>
              </TabsTrigger>
              <TabsTrigger value="health" className="flex items-center gap-2">
                <Heart className="w-4 h-4" />
                <span className="hidden sm:inline">Saúde</span>
              </TabsTrigger>
              <TabsTrigger value="wellbeing" className="flex items-center gap-2">
                <Moon className="w-4 h-4" />
                <span className="hidden sm:inline">Bem-estar</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile">
              <ProfileSection 
                profile={profile} 
                onSave={updateProfile}
                isSaving={isUpdating}
              />
            </TabsContent>

            <TabsContent value="training">
              <TrainingSection 
                data={onboardingData} 
                onSave={updateOnboardingData}
                isSaving={isSaving}
              />
            </TabsContent>

            <TabsContent value="health">
              <HealthSection 
                data={onboardingData} 
                onSave={updateOnboardingData}
                isSaving={isSaving}
              />
            </TabsContent>

            <TabsContent value="wellbeing">
              <WellbeingSection 
                data={onboardingData} 
                onSave={updateOnboardingData}
                isSaving={isSaving}
              />
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>
    </div>
  );
}
