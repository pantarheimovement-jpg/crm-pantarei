import React from 'react';
import { HelpCircle } from 'lucide-react';

export default function TutorialFAB({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 left-6 z-[9999] w-12 h-12 rounded-full shadow-lg flex items-center justify-center text-white hover:scale-110 transition-transform"
      style={{ backgroundColor: '#6D436D' }}
      title="מדריך אינטראקטיבי"
    >
      <HelpCircle className="w-6 h-6" />
    </button>
  );
}