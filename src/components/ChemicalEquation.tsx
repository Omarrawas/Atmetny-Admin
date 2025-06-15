// src/components/ChemicalEquation.tsx
import React from 'react';
import { BlockMath } from 'react-katex';
// katex.min.css is imported globally in layout.tsx

interface ChemicalEquationProps {
  equation: string;
  description?: string;
}

const ChemicalEquation: React.FC<ChemicalEquationProps> = ({ equation, description }) => {
  return (
    <div className="my-4 p-3 bg-muted/30 rounded-lg border border-border/50">
      {description && <p className="text-sm text-muted-foreground mb-2">{description}</p>}
      <BlockMath math={equation} />
    </div>
  );
};

export default ChemicalEquation;
