'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { SimpleAction, HandAction, BlendedAction } from '@/types';
import { isSimpleAction } from '@/types';
import { useUrlState, useRangeSelections, usePainting } from '@/hooks';
import { getRange } from '@/data/ranges';
import { Card } from './shared';
import { RangeChart } from './RangeChart';
import { ActionPalette } from './ActionPalette';
import { RangeDropdowns } from './RangeDropdowns';
import { BlendPicker } from './BlendPicker';
import { MobileActionBar } from './MobileActionBar';

/**
 * Builder Mode - Create and save poker ranges.
 * Desktop: Two-column layout (controls left, grid right)
 * Mobile: Single column stacked layout
 */
export function BuilderMode() {
  const { position, stackSize, scenario, opponent, caller, setPosition, setStackSize, setScenario, setOpponent, setCaller } = useUrlState('/builder');
  
  // Get initial range data synchronously for instant render
  const initialRange = useMemo(() => getRange(stackSize, position, scenario, opponent, caller), []);
  const { userSelections, setCell, loadSelections, clearSelections, filledCount, totalCells, allFilled } = useRangeSelections(initialRange?.data);

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [existingRangeLoaded, setExistingRangeLoaded] = useState(initialRange !== null);
  const [description, setDescription] = useState(initialRange?.meta.description ?? '');
  
  // Blend picker state
  const [blendPickerOpen, setBlendPickerOpen] = useState(false);
  const [blendPickerHand, setBlendPickerHand] = useState<string | null>(null);
  const [blendMode, setBlendMode] = useState(false);

  // Painting state
  const painting = usePainting();

  // Track previous range params to detect changes
  const prevParamsRef = useRef({ position, stackSize, scenario, opponent, caller });

  // Paint cell callback - now handles blend mode
  const paintCell = useCallback((hand: string) => {
    if (blendMode) {
      // In blend mode, clicking opens the picker
      setBlendPickerHand(hand);
      setBlendPickerOpen(true);
    } else if (painting.selectedAction) {
      setCell(hand, painting.selectedAction);
    }
  }, [blendMode, painting.selectedAction, setCell]);

  // Start painting and paint the initial cell
  const handlePaintStart = useCallback((hand: string) => {
    if (blendMode) {
      // In blend mode, clicking opens the picker
      setBlendPickerHand(hand);
      setBlendPickerOpen(true);
    } else {
      painting.handlePaintStart();
      if (painting.selectedAction) {
        setCell(hand, painting.selectedAction);
      }
    }
  }, [blendMode, painting, setCell]);

  // Handle blend button click
  const handleBlendClick = useCallback(() => {
    setBlendMode(true);
    painting.setSelectedAction(null); // Deselect simple action
  }, [painting]);

  // Handle simple action selection (exits blend mode)
  const handleSelectAction = useCallback((action: SimpleAction) => {
    setBlendMode(false);
    painting.setSelectedAction(action);
  }, [painting]);

  // Handle blend confirm
  const handleBlendConfirm = useCallback((action: BlendedAction) => {
    if (blendPickerHand) {
      setCell(blendPickerHand, action);
    }
    setBlendPickerOpen(false);
    setBlendPickerHand(null);
  }, [blendPickerHand, setCell]);

  // Handle blend picker close
  const handleBlendClose = useCallback(() => {
    setBlendPickerOpen(false);
    setBlendPickerHand(null);
  }, []);

  // Load existing range when dropdowns change
  useEffect(() => {
    const prev = prevParamsRef.current;
    const paramsChanged = prev.position !== position || 
                          prev.stackSize !== stackSize || 
                          prev.scenario !== scenario || 
                          prev.opponent !== opponent ||
                          prev.caller !== caller;
    
    if (paramsChanged) {
      const existingRange = getRange(stackSize, position, scenario, opponent, caller);
      
      if (existingRange) {
        loadSelections(existingRange.data as Record<string, HandAction>);
        setExistingRangeLoaded(true);
        setDescription(existingRange.meta.description ?? '');
      } else {
        clearSelections();
        setExistingRangeLoaded(false);
        setSaveMessage(null);
        setDescription('');
      }
      
      prevParamsRef.current = { position, stackSize, scenario, opponent, caller };
    }
  }, [position, stackSize, scenario, opponent, caller, loadSelections, clearSelections]);

  // Clear save message after delay
  useEffect(() => {
    if (saveMessage) {
      const timer = setTimeout(() => setSaveMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [saveMessage]);

  const handleSave = async () => {
    if (!allFilled) return;
    setIsSaving(true);
    setSaveMessage(null);

    try {
      const data: Record<string, HandAction> = {};
      Object.entries(userSelections).forEach(([hand, action]) => {
        if (action) data[hand] = action;
      });

      const response = await fetch('/api/save-range', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stackSize, position, scenario, opponent, caller, data, description: description || undefined }),
      });

      const result = await response.json();

      if (result.success) {
        setSaveMessage({ type: 'success', text: `Saved to ${result.filepath}` });
        setExistingRangeLoaded(true);
      } else {
        setSaveMessage({ type: 'error', text: result.error || 'Failed to save' });
      }
    } catch {
      setSaveMessage({ type: 'error', text: 'Network error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = () => {
    clearSelections();
    setSaveMessage(null);
  };

  return (
    <>
      <main className={`${painting.isPainting ? 'select-none' : ''}`}>
        {/* Mobile Layout */}
        <div className="lg:hidden flex flex-col pb-24">
          {/* Blend mode indicator */}
          {blendMode && (
            <div className="mx-3 mt-2 px-3 py-1.5 bg-purple-100 rounded-lg text-xs text-purple-700 text-center">
              Tap a cell to set blend percentages
            </div>
          )}
          
          {/* Save message on mobile */}
          {saveMessage && (
            <div
              className={`
                mx-3 mt-2 py-1.5 px-3 rounded-lg text-xs font-medium text-center
                ${saveMessage.type === 'success' 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-red-100 text-red-700'
                }
              `}
            >
              {saveMessage.text}
            </div>
          )}
          
          {/* Mobile Grid */}
          <div className="flex-1 p-1">
            <RangeChart
              userSelections={userSelections}
              isSubmitted={false}
              isPainting={painting.isPainting && !blendMode}
              selectedAction={blendMode ? null : painting.selectedAction}
              onPaint={paintCell}
              onPaintStart={handlePaintStart}
              blendMode={blendMode}
            />
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden lg:block p-4 lg:p-8 max-w-[1050px] mx-auto">
          <div className="flex flex-row gap-8 max-w-6xl mx-auto">
            {/* Left column - Controls */}
            <div className="flex flex-col gap-4 w-90 shrink-0">
              <Card>
                <RangeDropdowns
                  position={position}
                  stackSize={stackSize}
                  scenario={scenario}
                  opponent={opponent}
                  caller={caller}
                  onPositionChange={setPosition}
                  onStackSizeChange={setStackSize}
                  onScenarioChange={setScenario}
                  onOpponentChange={setOpponent}
                  onCallerChange={setCaller}
                />
              </Card>

              <Card>
                <ActionPalette
                  selectedAction={blendMode ? null : painting.selectedAction}
                  onSelectAction={handleSelectAction}
                  mode="builder"
                  showBlendOptions={true}
                  onBlendClick={handleBlendClick}
                />
                {blendMode && (
                  <div className="mt-2 px-3 py-2 bg-slate-100 rounded-lg text-sm text-slate-600">
                    Click a cell to set blend percentages
                  </div>
                )}
              </Card>

              {/* Description */}
              <Card>
                <label className="text-sm font-semibold text-slate-700 mb-2 block">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Strategy explanation for this range..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent resize-none"
                  rows={3}
                />
              </Card>

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  onClick={handleClear}
                  className="flex-1 px-4 py-3 rounded-lg font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-all duration-150"
                >
                  Clear
                </button>
                <button
                  onClick={handleSave}
                  disabled={!allFilled || isSaving}
                  className={`
                    flex-1 px-4 py-3 rounded-lg font-semibold text-white
                    transition-all duration-150
                    ${allFilled && !isSaving
                      ? 'bg-green-600 hover:bg-green-700 cursor-pointer'
                      : 'bg-slate-300 cursor-not-allowed'
                    }
                  `}
                >
                  {isSaving ? 'Saving...' : existingRangeLoaded ? 'Update' : 'Save'}
                </button>
              </div>

              {/* Save message */}
              {saveMessage && (
                <div
                  className={`
                    py-2 px-4 rounded-lg text-sm font-medium text-center
                    ${saveMessage.type === 'success' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                    }
                  `}
                >
                  {saveMessage.text}
                </div>
              )}
            </div>

            {/* Right column - Grid */}
            <div className="flex-1 min-w-0">
              <RangeChart
                userSelections={userSelections}
                isSubmitted={false}
                isPainting={painting.isPainting && !blendMode}
                selectedAction={blendMode ? null : painting.selectedAction}
                onPaint={paintCell}
                onPaintStart={handlePaintStart}
                blendMode={blendMode}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Action Bar */}
      <MobileActionBar
        mode="builder"
        selectedAction={painting.selectedAction}
        onSelectAction={handleSelectAction}
        blendMode={blendMode}
        onBlendClick={handleBlendClick}
        canSave={allFilled}
        isSaving={isSaving}
        onClear={handleClear}
        onSave={handleSave}
        showShove={true}
        position={position}
        stackSize={stackSize}
        scenario={scenario}
        opponent={opponent}
        caller={caller}
        onPositionChange={setPosition}
        onStackSizeChange={setStackSize}
        onScenarioChange={setScenario}
        onOpponentChange={setOpponent}
        onCallerChange={setCaller}
      />

      {/* Blend Picker Modal */}
      <BlendPicker
        isOpen={blendPickerOpen}
        handName={blendPickerHand || undefined}
        initialValue={
          blendPickerHand && userSelections[blendPickerHand] && !isSimpleAction(userSelections[blendPickerHand]!)
            ? userSelections[blendPickerHand] as BlendedAction
            : undefined
        }
        onConfirm={handleBlendConfirm}
        onClose={handleBlendClose}
      />
    </>
  );
}

export default BuilderMode;
