import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Dumbbell, Heart, Moon, CreditCard, Loader2, Shield, Bell, Palette, ArrowLeft } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
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

      {/* Header - h-14 padronizado */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="shrink-0 press-scale"
              aria-label="Voltar"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold text-foreground">Configurações</h1>
          </div>
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Scroll horizontal para tabs em mobile */}
          <ScrollArea className="w-full mb-6">
            <TabsList className="inline-flex w-max min-w-full">
              <TabsTrigger value="profile" className="flex items-center gap-2 px-4">
                <User className="w-4 h-4" />
                <span>Perfil</span>
              </TabsTrigger>
              <TabsTrigger value="training" className="flex items-center gap-2 px-4">
                <Dumbbell className="w-4 h-4" />
                <span>Treino</span>
              </TabsTrigger>
              <TabsTrigger value="health" className="flex items-center gap-2 px-4">
                <Heart className="w-4 h-4" />
                <span>Saúde</span>
              </TabsTrigger>
              <TabsTrigger value="wellbeing" className="flex items-center gap-2 px-4">
                <Moon className="w-4 h-4" />
                <span>Bem-estar</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-2 px-4">
                <Bell className="w-4 h-4" />
                <span>Notificações</span>
              </TabsTrigger>
              <TabsTrigger value="appearance" className="flex items-center gap-2 px-4">
                <Palette className="w-4 h-4" />
                <span>Aparência</span>
              </TabsTrigger>
              <TabsTrigger value="subscription" className="flex items-center gap-2 px-4">
                <CreditCard className="w-4 h-4" />
                <span>Assinatura</span>
              </TabsTrigger>
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

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
      </main>
    </div>
  );
}
