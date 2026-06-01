import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import TutorialCard from './TutorialCard';

export default function TutorialOverlay({ isOpen, step, currentStep, totalSteps, onNext, onPrev, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Navigate to the step's page
  useEffect(() => {
    if (!isOpen || !step?.navigateTo) return;
    if (location.pathname !== step.navigateTo) {
      navigate(step.navigateTo);
    }
  }, [isOpen, step, location.pathname, navigate]);

  if (!isOpen) return null;

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
              onNext={onNext}
              onPrev={onPrev}
              onClose={onClose}
            />
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}