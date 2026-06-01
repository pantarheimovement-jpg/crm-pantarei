import { useState, useCallback } from 'react';
import TUTORIAL_STEPS from '@/lib/tutorialSteps';

const STORAGE_KEY = 'pantarhei_tutorial_v1';

export function useTutorial() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const isCompleted = () => localStorage.getItem(STORAGE_KEY) === 'true';

  const start = useCallback(() => {
    setCurrentStep(0);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const next = useCallback(() => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      localStorage.setItem(STORAGE_KEY, 'true');
      setIsOpen(false);
    }
  }, [currentStep]);

  const prev = useCallback(() => {
    if (currentStep > 0) setCurrentStep(prev => prev - 1);
  }, [currentStep]);

  const complete = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsOpen(false);
  }, []);

  return {
    isOpen,
    currentStep,
    step: TUTORIAL_STEPS[currentStep],
    totalSteps: TUTORIAL_STEPS.length,
    isCompleted,
    start,
    close,
    next,
    prev,
    complete,
  };
}