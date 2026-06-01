import React from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { motion } from 'framer-motion';
import TutorialProgress from './TutorialProgress';

export default function TutorialCard({ step, currentStep, totalSteps, onNext, onPrev, onClose }) {
  const Icon = step.icon;
  const isFirst = currentStep === 0;
  const isLast = currentStep === totalSteps - 1;

  return (
    <motion.div
      key={step.id}
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 20 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="bg-white border border-gray-200 rounded-2xl shadow-2xl p-5 w-[360px] max-w-[90vw]"
      style={{ direction: 'rtl' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl" style={{ backgroundColor: '#6D436D15' }}>
            <Icon className={`w-5 h-5 ${step.iconColor}`} />
          </div>
          <div>
            <p className="text-xs text-gray-400">שלב {currentStep + 1} מתוך {totalSteps}</p>
            <h3 className="font-bold text-gray-900 text-sm">{step.title}</h3>
          </div>
        </div>
        <button onClick={onClose} className="h-7 w-7 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="mb-3">
        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{step.content}</p>
        {step.tip && (
          <div className="mt-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200">
            <p className="text-xs text-amber-800">💡 {step.tip}</p>
          </div>
        )}
      </div>

      {/* Progress */}
      <div className="mb-3">
        <TutorialProgress current={currentStep} total={totalSteps} />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <div className="flex-1" />
        {!isFirst && (
          <button onClick={onPrev} className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronRight className="w-4 h-4" />
            הקודם
          </button>
        )}
        <button
          onClick={onNext}
          className="flex items-center gap-1 px-4 py-1.5 text-sm font-medium text-white rounded-full transition-colors"
          style={{ backgroundColor: '#6D436D' }}
        >
          {isLast ? 'סיום 🎉' : 'הבא'}
          {!isLast && <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </motion.div>
  );
}