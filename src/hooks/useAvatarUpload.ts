import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export function useAvatarUpload() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);

  const uploadAvatar = async (file: File): Promise<string | null> => {
    if (!user?.id) {
      toast.error('Você precisa estar logado para fazer upload');
      return null;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem válida');
      return null;
    }

    // Validate file size (max 2MB)
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('A imagem deve ter no máximo 2MB');
      return null;
    }

    setIsUploading(true);

    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile with avatar URL (add cache buster)
      const avatarUrl = `${publicUrl}?t=${Date.now()}`;
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      // Invalidate profile cache
      queryClient.invalidateQueries({ queryKey: ['profile', user.id] });

      toast.success('Foto atualizada com sucesso!');
      return avatarUrl;
    } catch (error) {
      console.error('Avatar upload error:', error);
      toast.error('Erro ao fazer upload da foto');
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const removeAvatar = async (): Promise<boolean> => {
    if (!user?.id) return false;

    setIsUploading(true);

    try {
      // List and delete files in user's folder
      const { data: files } = await supabase.storage
        .from('avatars')
        .list(user.id);

      if (files && files.length > 0) {
        const filesToDelete = files.map(f => `${user.id}/${f.name}`);
        await supabase.storage.from('avatars').remove(filesToDelete);
      }

      // Update profile to remove avatar URL
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('user_id', user.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
      toast.success('Foto removida');
      return true;
    } catch (error) {
      console.error('Avatar remove error:', error);
      toast.error('Erro ao remover foto');
      return false;
    } finally {
      setIsUploading(false);
    }
  };

  return {
    uploadAvatar,
    removeAvatar,
    isUploading,
  };
}
