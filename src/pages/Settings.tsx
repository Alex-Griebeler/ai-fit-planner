import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Dumbbell, Heart, Moon, CreditCard, Loader2, Shield, Bell, Palette } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useProfile } from '@/hooks/useProfile';
import { useOnboardingData } from '@/hooks/useOnboardingData';
import { useAdmin } from '@/hooks/useAdmin';
import { ProfileSection, TrainingSection, HealthSection, WellbeingSection, SubscriptionSection, NotificationSection, ThemeSection } from '@/components/settings';

export default function Settings() {
  const navigate = useNavigate();
  const { profile, isLoading: profileLoading, updateProfile, isUpdating } = useProfile();
  const { onboardingData, isLoading: onboardingLoading, updateOnboardingData, isSaving } = useOnboardingData();
  const { isAdmin } = useAdmin();
  const [activeTab, setActiveTab] = useState('profile');

  const isLoading = profileLoading || onboardingLoading;
  const isSavingAny = isUpdating || isSaving;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" role="status" aria-label="Carregando configurações">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Skip link for accessibility */}
      <a href="#settings-content" className="skip-link">
        Pular para conteúdo principal
      </a>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">Configurações</h1>
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/admin')}
              className="flex items-center gap-2"
            >
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">Admin</span>
            </Button>
          )}
        </div>
      </header>

      {/* Content */}
      <main id="settings-content" className="container max-w-4xl mx-auto px-4 py-6 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-7 mb-6">
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
              <TabsTrigger value="notifications" className="flex items-center gap-2">
                <Bell className="w-4 h-4" />
                <span className="hidden sm:inline">Notificações</span>
              </TabsTrigger>
              <TabsTrigger value="appearance" className="flex items-center gap-2">
                <Palette className="w-4 h-4" />
                <span className="hidden sm:inline">Aparência</span>
              </TabsTrigger>
              <TabsTrigger value="subscription" className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                <span className="hidden sm:inline">Assinatura</span>
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

            <TabsContent value="notifications">
              <NotificationSection />
            </TabsContent>

            <TabsContent value="appearance">
              <ThemeSection />
            </TabsContent>

            <TabsContent value="subscription">
              <SubscriptionSection />
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>
    </div>
  );
}
