import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, X, Play, List, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import TutorialProgress from './TutorialProgress';

export default function TutorialCard({ step, currentStep, totalSteps, steps, onNext, onPrev, onClose, onGoToStep, onPractice }) {
  const [showMenu, setShowMenu] = useState(false);
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
      className={`bg-gradient-to-br ${step.bgColor || 'from-white to-gray-50'} border border-gray-200 rounded-2xl shadow-2xl p-5 w-[400px] max-w-[92vw]`}
      style={{ direction: 'rtl' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-white/80 shadow-sm">
            <Icon className={`w-5 h-5 ${step.iconColor}`} />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium">שלב {currentStep + 1} מתוך {totalSteps}</p>
            <h3 className="font-bold text-gray-900 text-sm leading-tight">{step.title}</h3>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="h-7 w-7 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-lg hover:bg-white/60"
            title="כל השלבים"
          >
            <List className="w-4 h-4" />
          </button>
          <button onClick={onClose} className="h-7 w-7 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-lg hover:bg-white/60">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Step menu dropdown */}
      {showMenu && (
        <div className="mb-3 bg-white rounded-xl border border-gray-200 shadow-lg max-h-[240px] overflow-y-auto">
          {steps.map((s, i) => (
            <button
              key={s.id}
              onClick={() => { onGoToStep(i); setShowMenu(false); }}
              className={`w-full text-right px-3 py-2 text-xs hover:bg-gray-50 flex items-center gap-2 transition-colors ${
                i === currentStep ? 'bg-purple-50 text-[#6D436D] font-bold' : 'text-gray-700'
              }`}
            >
              <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center flex-shrink-0 ${
                i === currentStep ? 'bg-[#6D436D] text-white' : i < currentStep ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
              }`}>
                {i < currentStep ? '✓' : i + 1}
              </span>
              <span className="truncate">{s.title}</span>
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="mb-3 bg-white/60 rounded-xl p-3">
        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{step.content}</p>
      </div>

      {/* Auto note */}
      {step.autoNote && (
        <div className="mb-2 flex items-start gap-2 px-3 py-2 rounded-lg bg-green-50 border border-green-200">
          <Zap className="w-3.5 h-3.5 text-green-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-green-800">{step.autoNote}</p>
        </div>
      )}

      {/* Tip */}
      {step.tip && (
        <div className="mb-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200">
          <p className="text-xs text-amber-800">💡 {step.tip}</p>
        </div>
      )}

      {/* Practice note */}
      {step.practiceNote && (
        <div className="mb-3 p-2.5 rounded-lg bg-blue-50 border border-blue-200">
          <p className="text-xs text-blue-800">🎯 <strong>תרגול:</strong> {step.practiceNote}</p>
        </div>
      )}

      {/* Progress */}
      <div className="mb-3">
        <TutorialProgress current={currentStep} total={totalSteps} />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Practice button */}
        {step.practiceNote && step.navigateTo && (
          <button
            onClick={onPractice}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-full transition-colors"
          >
            <Play className="w-3 h-3" />
            תרגלי
          </button>
        )}
        <div className="flex-1" />
        {!isFirst && (
          <button onClick={onPrev} className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-white/60 rounded-lg transition-colors">
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