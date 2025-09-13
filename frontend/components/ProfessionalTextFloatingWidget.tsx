'use client';

import { useState } from 'react';
import ProfessionalTextButton from './ProfessionalTextButton';

interface ProfessionalTextFloatingWidgetProps {
  messageInput: string;
  onTextUpdate: (text: string) => void;
  disabled?: boolean;
}

export default function ProfessionalTextFloatingWidget({ 
  messageInput, 
  onTextUpdate, 
  disabled = false 
}: ProfessionalTextFloatingWidgetProps) {
  return (
    <div className="fixed bottom-4 right-28 z-50">
      <div className="relative">
        <ProfessionalTextButton
          currentText={messageInput}
          onTextUpdate={onTextUpdate}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
