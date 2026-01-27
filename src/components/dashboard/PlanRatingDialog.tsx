import { useState } from 'react';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface PlanRatingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planName: string;
  onSubmit: (rating: number, notes?: string) => Promise<void>;
  isSubmitting: boolean;
}

export function PlanRatingDialog({
  open,
  onOpenChange,
  planName,
  onSubmit,
  isSubmitting,
}: PlanRatingDialogProps) {
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [notes, setNotes] = useState('');

  const handleSubmit = async () => {
    if (rating === 0) return;
    await onSubmit(rating, notes.trim() || undefined);
    // Reset state after successful submit
    setRating(0);
    setNotes('');
  };

  const ratingLabels = [
    '',
    'Ruim - Não gostei',
    'Regular - Pode melhorar',
    'Bom - Atendeu expectativas',
    'Muito bom - Recomendo',
    'Excelente - Perfeito!'
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Avaliar Plano</DialogTitle>
          <DialogDescription>
            Como foi sua experiência com o plano "{planName}"? Sua avaliação ajuda a IA a criar planos melhores.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Star Rating */}
          <div className="flex flex-col items-center gap-2">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className="p-1 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary rounded"
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  onClick={() => setRating(star)}
                  aria-label={`${star} estrelas - ${ratingLabels[star]}`}
                >
                  <Star
                    className={cn(
                      'w-8 h-8 transition-colors',
                      (hoveredRating || rating) >= star
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-muted-foreground/40'
                    )}
                  />
                </button>
              ))}
            </div>
            <span className="text-sm text-muted-foreground min-h-5">
              {ratingLabels[hoveredRating || rating] || 'Selecione uma nota'}
            </span>
          </div>

          {/* Optional Notes */}
          <div className="space-y-2">
            <label htmlFor="rating-notes" className="text-sm font-medium text-foreground">
              Comentário (opcional)
            </label>
            <Textarea
              id="rating-notes"
              placeholder="O que você gostou ou o que poderia melhorar..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
              className="resize-none"
              rows={3}
            />
            <p className="text-xs text-muted-foreground text-right">
              {notes.length}/500
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Pular
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={rating === 0 || isSubmitting}
          >
            {isSubmitting ? 'Salvando...' : 'Avaliar e Continuar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
