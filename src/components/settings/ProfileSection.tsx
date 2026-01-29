import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Profile, ProfileUpdate } from '@/hooks/useProfile';
import { useAvatarUpload } from '@/hooks/useAvatarUpload';
import { toast } from 'sonner';
import { Save, Loader2, Camera, Trash2 } from 'lucide-react';

interface ProfileSectionProps {
  profile: Profile | null;
  onSave: (data: ProfileUpdate) => Promise<Profile>;
  isSaving: boolean;
}

export function ProfileSection({ profile, onSave, isSaving }: ProfileSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadAvatar, removeAvatar, isUploading } = useAvatarUpload();
  
  const [formData, setFormData] = useState({
    name: '',
    gender: '' as 'female' | 'male' | 'other' | '',
    age: '',
    height: '',
    weight: '',
  });

  const initials = profile?.name
    ?.split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U';

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadAvatar(file);
    }
    // Reset input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        gender: profile.gender || '',
        age: profile.age?.toString() || '',
        height: profile.height?.toString() || '',
        weight: profile.weight?.toString() || '',
      });
    }
  }, [profile]);

  const handleSave = async () => {
    try {
      await onSave({
        name: formData.name || 'Usuário',
        gender: formData.gender || null,
        age: formData.age ? parseInt(formData.age) : null,
        height: formData.height ? parseInt(formData.height) : null,
        weight: formData.weight ? parseFloat(formData.weight) : null,
      });
      toast.success('Perfil atualizado com sucesso!');
    } catch (error) {
      toast.error('Erro ao atualizar perfil');
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-lg">Dados Pessoais</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Avatar Upload */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <Avatar className="w-24 h-24 bg-primary/10 text-primary">
              {profile?.avatar_url && (
                <AvatarImage 
                  src={profile.avatar_url} 
                  alt={profile.name}
                  className="object-cover object-center"
                />
              )}
              <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            
            {isUploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-full">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <Camera className="w-4 h-4 mr-1" />
              {profile?.avatar_url ? 'Trocar Foto' : 'Adicionar Foto'}
            </Button>
            
            {profile?.avatar_url && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={removeAvatar}
                disabled={isUploading}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          
          <p className="text-xs text-muted-foreground">
            JPG, PNG ou GIF. Máx. 2MB.
          </p>
        </div>

        {/* Nome */}
        <div className="space-y-2">
          <Label htmlFor="name">Nome</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Seu nome"
          />
        </div>

        {/* Gênero */}
        <div className="space-y-3">
          <Label>Gênero</Label>
          <RadioGroup
            value={formData.gender}
            onValueChange={(value) => setFormData({ ...formData, gender: value as 'female' | 'male' | 'other' })}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="female" id="female" />
              <Label htmlFor="female" className="font-normal cursor-pointer">Feminino</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="male" id="male" />
              <Label htmlFor="male" className="font-normal cursor-pointer">Masculino</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="other" id="other" />
              <Label htmlFor="other" className="font-normal cursor-pointer">Outro</Label>
            </div>
          </RadioGroup>
        </div>

        {/* Idade */}
        <div className="space-y-2">
          <Label htmlFor="age">Idade</Label>
          <Input
            id="age"
            type="number"
            value={formData.age}
            onChange={(e) => setFormData({ ...formData, age: e.target.value })}
            placeholder="Sua idade"
            min="1"
            max="120"
          />
        </div>

        {/* Altura e Peso */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="height">Altura (cm)</Label>
            <Input
              id="height"
              type="number"
              value={formData.height}
              onChange={(e) => setFormData({ ...formData, height: e.target.value })}
              placeholder="170"
              min="100"
              max="250"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="weight">Peso (kg)</Label>
            <Input
              id="weight"
              type="number"
              step="0.1"
              value={formData.weight}
              onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
              placeholder="70"
              min="30"
              max="300"
            />
          </div>
        </div>

        <Button 
          onClick={handleSave} 
          disabled={isSaving}
          className="w-full"
          variant="gradient"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Salvar Alterações
        </Button>
      </CardContent>
    </Card>
  );
}
