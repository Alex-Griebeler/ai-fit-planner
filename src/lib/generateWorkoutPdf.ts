import jsPDF from 'jspdf';

interface Exercise {
  order: number;
  name: string;
  equipment: string;
  sets: number;
  reps: string;
  rest: string;
  intensity?: string;
  tempo?: string;
  notes?: string;
  method?: string;
}

interface Workout {
  day: string;
  name: string;
  focus: string;
  muscleGroups: string[];
  estimatedDuration: string;
  exercises: Exercise[];
}

interface GeneratePdfOptions {
  planName: string;
  workout: Workout;
  createdAt?: Date;
}

export function generateWorkoutPdf({ planName, workout, createdAt = new Date() }: GeneratePdfOptions): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  
  let yPosition = 20;
  const lineHeight = 7;

  // Helper functions
  const addText = (text: string, x: number, y: number, options?: { 
    fontSize?: number; 
    fontStyle?: 'normal' | 'bold' | 'italic';
    color?: [number, number, number];
    align?: 'left' | 'center' | 'right';
  }) => {
    const { fontSize = 12, fontStyle = 'normal', color = [0, 0, 0], align = 'left' } = options || {};
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', fontStyle);
    doc.setTextColor(...color);
    
    let textX = x;
    if (align === 'center') {
      textX = pageWidth / 2;
    } else if (align === 'right') {
      textX = pageWidth - margin;
    }
    
    doc.text(text, textX, y, { align });
    return y + lineHeight;
  };

  const addLine = (y: number, color: [number, number, number] = [200, 200, 200]) => {
    doc.setDrawColor(...color);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    return y + 5;
  };

  const checkPageBreak = (requiredSpace: number) => {
    if (yPosition + requiredSpace > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      yPosition = 20;
    }
  };

  // Header
  yPosition = addText('EVOLVE', margin, yPosition, { 
    fontSize: 24, 
    fontStyle: 'bold',
    color: [79, 70, 229] // Primary color
  });
  
  yPosition = addText('Plano de Treino', margin, yPosition, { 
    fontSize: 10, 
    color: [100, 100, 100] 
  });
  
  yPosition += 5;
  yPosition = addLine(yPosition, [79, 70, 229]);
  yPosition += 5;

  // Plan info
  yPosition = addText(planName, margin, yPosition, { fontSize: 18, fontStyle: 'bold' });
  yPosition = addText(workout.name, margin, yPosition, { fontSize: 14, fontStyle: 'bold' });
  yPosition = addText(workout.focus, margin, yPosition, { fontSize: 11, color: [100, 100, 100] });
  yPosition += 3;

  // Workout stats
  const statsText = `${workout.exercises.length} exercícios • ${workout.estimatedDuration || '45-60min'}`;
  yPosition = addText(statsText, margin, yPosition, { fontSize: 10, color: [100, 100, 100] });
  
  const dateText = `Gerado em: ${createdAt.toLocaleDateString('pt-BR', { 
    day: '2-digit', 
    month: 'long', 
    year: 'numeric' 
  })}`;
  yPosition = addText(dateText, margin, yPosition, { fontSize: 9, color: [150, 150, 150] });
  
  yPosition += 5;
  yPosition = addLine(yPosition);
  yPosition += 5;

  // Table header
  const colWidths = {
    order: 10,
    name: 70,
    prescription: 45,
    method: 30,
  };

  const tableHeaderY = yPosition;
  doc.setFillColor(245, 245, 250);
  doc.rect(margin, tableHeaderY - 5, contentWidth, 10, 'F');
  
  let xPos = margin;
  addText('#', xPos, tableHeaderY, { fontSize: 9, fontStyle: 'bold', color: [80, 80, 80] });
  xPos += colWidths.order;
  
  addText('EXERCÍCIO', xPos, tableHeaderY, { fontSize: 9, fontStyle: 'bold', color: [80, 80, 80] });
  xPos += colWidths.name;
  
  addText('SÉRIES × REPS', xPos, tableHeaderY, { fontSize: 9, fontStyle: 'bold', color: [80, 80, 80] });
  xPos += colWidths.prescription;
  
  addText('MÉTODO', xPos, tableHeaderY, { fontSize: 9, fontStyle: 'bold', color: [80, 80, 80] });
  
  yPosition = tableHeaderY + 8;

  // Exercise rows
  workout.exercises.forEach((exercise, index) => {
    checkPageBreak(25);
    
    const rowY = yPosition;
    
    // Alternating row background
    if (index % 2 === 0) {
      doc.setFillColor(250, 250, 252);
      doc.rect(margin, rowY - 4, contentWidth, 18, 'F');
    }
    
    xPos = margin;
    
    // Order number
    addText(exercise.order.toString(), xPos, rowY, { fontSize: 10, color: [150, 150, 150] });
    xPos += colWidths.order;
    
    // Exercise name (truncate if too long)
    let exerciseName = exercise.name;
    if (exerciseName.length > 35) {
      exerciseName = exerciseName.substring(0, 32) + '...';
    }
    addText(exerciseName, xPos, rowY, { fontSize: 10, fontStyle: 'bold' });
    
    // Equipment (smaller, below name)
    const equipmentY = rowY + 5;
    addText(exercise.equipment, xPos, equipmentY, { fontSize: 8, color: [120, 120, 120] });
    xPos += colWidths.name;
    
    // Prescription (sets × reps / rest)
    const prescription = `${exercise.sets} × ${exercise.reps}`;
    addText(prescription, xPos, rowY, { fontSize: 10 });
    
    const restIntensity = `${exercise.rest}${exercise.intensity ? ` • ${exercise.intensity}` : ''}`;
    addText(restIntensity, xPos, equipmentY, { fontSize: 8, color: [120, 120, 120] });
    xPos += colWidths.prescription;
    
    // Method
    if (exercise.method) {
      addText(exercise.method, xPos, rowY, { fontSize: 9, color: [79, 70, 229] });
    } else {
      addText('-', xPos, rowY, { fontSize: 9, color: [180, 180, 180] });
    }
    
    yPosition = rowY + 18;
  });

  yPosition += 5;
  yPosition = addLine(yPosition);
  yPosition += 10;

  // Footer notes
  checkPageBreak(30);
  addText('Notas:', margin, yPosition, { fontSize: 10, fontStyle: 'bold', color: [80, 80, 80] });
  yPosition += 7;
  addText('• Aqueça adequadamente antes de iniciar', margin, yPosition, { fontSize: 9, color: [100, 100, 100] });
  yPosition += 5;
  addText('• Respeite os tempos de descanso indicados', margin, yPosition, { fontSize: 9, color: [100, 100, 100] });
  yPosition += 5;
  addText('• Ajuste as cargas conforme sua capacidade', margin, yPosition, { fontSize: 9, color: [100, 100, 100] });
  yPosition += 5;
  addText('• Mantenha a hidratação durante o treino', margin, yPosition, { fontSize: 9, color: [100, 100, 100] });

  // Save
  const fileName = `${workout.name.replace(/[^a-zA-Z0-9]/g, '_')}_${createdAt.toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}
