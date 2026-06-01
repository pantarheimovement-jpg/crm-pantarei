import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import TutorialCard from './TutorialCard';
import { Play } from 'lucide-react';

export default function TutorialOverlay({
  isOpen, step, currentStep, totalSteps, steps,
  onNext, onPrev, onClose, onGoToStep,
  practicing, onPractice, onResume
}) {
  const navigate = useNavigate();
  const location = useLocation();

  // Navigate to the step's page
  useEffect(() => {
    if (!isOpen || practicing || !step?.navigateTo) return;
    if (location.pathname !== step.navigateTo) {
      navigate(step.navigateTo);
    }
  }, [isOpen, practicing, step, location.pathname, navigate]);

  // Navigate when entering practice mode
  useEffect(() => {
    if (practicing && step?.navigateTo && location.pathname !== step.navigateTo) {
      navigate(step.navigateTo);
    }
  }, [practicing, step, location.pathname, navigate]);

  if (!isOpen) return null;

  // Practice mode — floating resume button
  if (practicing) {
    return (
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        onClick={onResume}
        dir="rtl"
        className="fixed bottom-6 left-6 z-[10001] flex items-center gap-2 px-4 py-3 rounded-full shadow-lg text-white transition-colors hover:opacity-90"
        style={{ backgroundColor: '#6D436D' }}
      >
        <Play className="w-4 h-4" />
        <span className="text-sm font-medium">חזרה למדריך</span>
      </motion.button>
    );
  }

  return (
    <>
      {/* Dark overlay */}
      <div className="fixed inset-0 z-[10000] bg-black/60" onClick={onClose} />

      {/* Card centered */}
      <div className="fixed inset-0 z-[10001] flex items-center justify-center pointer-events-none p-4">
        <div className="pointer-events-auto">
          <AnimatePresence mode="wait">
            <TutorialCard
              step={step}
              currentStep={currentStep}
              totalSteps={totalSteps}
              steps={steps}
              onNext={onNext}
              onPrev={onPrev}
              onClose={onClose}
              onGoToStep={onGoToStep}
              onPractice={onPractice}
            />
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}