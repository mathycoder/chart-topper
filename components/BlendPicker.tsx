'use client';

import { useState, useEffect, useCallback } from 'react';
import type { BlendedAction } from '@/types';

interface BlendPickerProps {
  /** Whether the picker is visible */
  isOpen: boolean;
  /** Current blended action value (if editing existing) */
  initialValue?: BlendedAction;
  /** Hand name being edited (for display) */
  handName?: string;
  /** Callback when user confirms the blend */
  onConfirm: (action: BlendedAction) => void;
  /** Callback when user cancels/closes */
  onClose: () => void;
}

// Preset blend configurations
const PRESETS: { label: string; value: BlendedAction }[] = [
  { label: '70/30 R/C', value: { raise: 70, call: 30 } },
  { label: '70/30 R/F', value: { raise: 70, fold: 30 } },
  { label: '50/50 R/C', value: { raise: 50, call: 50 } },
  { label: '50/50 R/F', value: { raise: 50, fold: 50 } },
  { label: '50/50 C/F', value: { call: 50, fold: 50 } },
  { label: '33/33/33', value: { raise: 34, call: 33, fold: 33 } },
];

/**
 * BlendPicker - Modal for setting blended action percentages.
 * 
 * Features:
 * - Three sliders for raise/call/fold
 * - Sliders are linked to always sum to 100%
 * - Quick preset buttons for common blends
 * - Visual preview of the blend
 */
export function BlendPicker({
  isOpen,
  initialValue,
  handName,
  onConfirm,
  onClose,
}: BlendPickerProps) {
  const [raise, setRaise] = useState(initialValue?.raise ?? 0);
  const [call, setCall] = useState(initialValue?.call ?? 0);
  const [fold, setFold] = useState(initialValue?.fold ?? 100);

  // Reset values when opened with new initial value
  useEffect(() => {
    if (isOpen) {
      setRaise(initialValue?.raise ?? 0);
      setCall(initialValue?.call ?? 0);
      setFold(initialValue?.fold ?? 100);
    }
  }, [isOpen, initialValue]);

  // Adjust other values when one changes to keep sum at 100
  const handleRaiseChange = useCallback((newRaise: number) => {
    const remaining = 100 - newRaise;
    const currentOther = call + fold;
    
    if (currentOther === 0) {
      // If both others are 0, split remaining between them
      setRaise(newRaise);
      setCall(Math.floor(remaining / 2));
      setFold(Math.ceil(remaining / 2));
    } else {
      // Proportionally adjust the others
      const ratio = remaining / currentOther;
      setRaise(newRaise);
      setCall(Math.round(call * ratio));
      setFold(remaining - Math.round(call * ratio));
    }
  }, [call, fold]);

  const handleCallChange = useCallback((newCall: number) => {
    const remaining = 100 - newCall;
    const currentOther = raise + fold;
    
    if (currentOther === 0) {
      setCall(newCall);
      setRaise(Math.floor(remaining / 2));
      setFold(Math.ceil(remaining / 2));
    } else {
      const ratio = remaining / currentOther;
      setCall(newCall);
      setRaise(Math.round(raise * ratio));
      setFold(remaining - Math.round(raise * ratio));
    }
  }, [raise, fold]);

  const handleFoldChange = useCallback((newFold: number) => {
    const remaining = 100 - newFold;
    const currentOther = raise + call;
    
    if (currentOther === 0) {
      setFold(newFold);
      setRaise(Math.floor(remaining / 2));
      setCall(Math.ceil(remaining / 2));
    } else {
      const ratio = remaining / currentOther;
      setFold(newFold);
      setRaise(Math.round(raise * ratio));
      setCall(remaining - Math.round(raise * ratio));
    }
  }, [raise, call]);

  const applyPreset = (preset: BlendedAction) => {
    setRaise(preset.raise ?? 0);
    setCall(preset.call ?? 0);
    setFold(preset.fold ?? 0);
  };

  const handleConfirm = () => {
    // Build action with only non-zero values
    const action: BlendedAction = {};
    if (raise > 0) action.raise = raise;
    if (call > 0) action.call = call;
    if (fold > 0) action.fold = fold;
    onConfirm(action);
  };

  // Build gradient preview
  const getPreviewGradient = () => {
    const segments: string[] = [];
    let current = 0;
    
    if (raise > 0) {
      segments.push(`var(--color-action-raise) ${current}%`);
      current += raise;
      segments.push(`var(--color-action-raise) ${current}%`);
    }
    if (call > 0) {
      segments.push(`var(--color-action-call) ${current}%`);
      current += call;
      segments.push(`var(--color-action-call) ${current}%`);
    }
    if (fold > 0) {
      segments.push(`var(--color-action-fold) ${current}%`);
      current += fold;
      segments.push(`var(--color-action-fold) ${current}%`);
    }
    
    return `linear-gradient(to right, ${segments.join(', ')})`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-felt-surface rounded-xl shadow-2xl p-6 w-full max-w-md mx-4 border border-felt-border">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-cream">
            Set Blend {handName && <span className="text-cream-muted">({handName})</span>}
          </h3>
          <button
            onClick={onClose}
            className="text-cream-muted hover:text-cream text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Preview */}
        <div
          className="h-12 rounded-lg mb-6 border border-felt-border"
          style={{ background: getPreviewGradient() }}
        />

        {/* Sliders */}
        <div className="space-y-4 mb-6">
          {/* Raise slider */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium text-action-raise">Raise</span>
              <span className="text-cream-muted">{raise}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={raise}
              onChange={(e) => handleRaiseChange(Number(e.target.value))}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-felt-elevated accent-action-raise"
            />
          </div>

          {/* Call slider */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium text-action-call">Call</span>
              <span className="text-cream-muted">{call}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={call}
              onChange={(e) => handleCallChange(Number(e.target.value))}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-felt-elevated accent-action-call"
            />
          </div>

          {/* Fold slider */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium text-action-fold">Fold</span>
              <span className="text-cream-muted">{fold}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={fold}
              onChange={(e) => handleFoldChange(Number(e.target.value))}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-felt-elevated accent-action-fold"
            />
          </div>
        </div>

        {/* Presets */}
        <div className="mb-6">
          <div className="text-sm font-medium text-cream-muted mb-2">Quick Presets</div>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset, i) => (
              <button
                key={i}
                onClick={() => applyPreset(preset.value)}
                className="px-3 py-1.5 text-sm rounded-lg bg-felt-elevated hover:bg-felt-muted text-cream transition-colors"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg font-medium text-cream bg-felt-elevated hover:bg-felt-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 px-4 py-2.5 rounded-lg font-medium text-felt-bg bg-gold hover:bg-gold-hover transition-colors"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

export default BlendPicker;
