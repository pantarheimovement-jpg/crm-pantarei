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
                i === currentStep ? 'bg-[#6D436D] text-white' : i < currentStep ? 'bg-[#D29486]/20 text-[#D29486]' : 'bg-[#FDF8F0] text-[#5E4B35]/50'
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
        <div className="mb-2 flex items-start gap-2 px-3 py-2 rounded-lg bg-[#FAD980]/20 border border-[#FAD980]/40">
          <Zap className="w-3.5 h-3.5 text-[#5E4B35] mt-0.5 flex-shrink-0" />
          <p className="text-xs text-[#5E4B35]">{step.autoNote}</p>
        </div>
      )}

      {/* Tip */}
      {step.tip && (
        <div className="mb-2 p-2.5 rounded-lg bg-[#D29486]/10 border border-[#D29486]/30">
          <p className="text-xs text-[#5E4B35]">💡 {step.tip}</p>
        </div>
      )}

      {/* Practice note */}
      {step.practiceNote && (
        <div className="mb-3 p-2.5 rounded-lg bg-[#6D436D]/10 border border-[#6D436D]/20">
          <p className="text-xs text-[#5E4B35]">🎯 <strong>תרגול:</strong> {step.practiceNote}</p>
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
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[#6D436D] bg-[#6D436D]/10 hover:bg-[#6D436D]/20 rounded-full transition-colors"
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