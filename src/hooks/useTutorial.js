import { useState, useCallback } from 'react';
import TUTORIAL_STEPS from '@/lib/tutorialSteps';

const STORAGE_KEY = 'pantarhei_tutorial_v2';

export function useTutorial() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [practicing, setPracticing] = useState(false);

  const start = useCallback(() => {
    setCurrentStep(0);
    setIsOpen(true);
    setPracticing(false);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setPracticing(false);
  }, []);

  const next = useCallback(() => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
      setPracticing(false);
    } else {
      localStorage.setItem(STORAGE_KEY, 'true');
      setIsOpen(false);
      setPracticing(false);
    }
  }, [currentStep]);

  const prev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      setPracticing(false);
    }
  }, [currentStep]);

  const goToStep = useCallback((index) => {
    if (index >= 0 && index < TUTORIAL_STEPS.length) {
      setCurrentStep(index);
      setPracticing(false);
    }
  }, []);

  const startPractice = useCallback(() => {
    setPracticing(true);
  }, []);

  const resumeFromPractice = useCallback(() => {
    setPracticing(false);
  }, []);

  return {
    isOpen,
    currentStep,
    step: TUTORIAL_STEPS[currentStep],
    totalSteps: TUTORIAL_STEPS.length,
    steps: TUTORIAL_STEPS,
    start,
    close,
    next,
    prev,
    goToStep,
    practicing,
    startPractice,
    resumeFromPractice,
  };
}