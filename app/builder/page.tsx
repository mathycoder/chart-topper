'use client';

import { useState, useCallback, useEffect } from 'react';
import type { SimpleAction, Position, StackSize, Scenario } from '@/types';
import { ALL_HANDS } from '@/data/hands';
import { RangeChart } from '@/components/RangeChart';
import { ActionPalette } from '@/components/ActionPalette';
import { RangeDropdowns } from '@/components/RangeDropdowns';

/**
 * Builder Mode - Create and save poker ranges.
 */
export default function BuilderPage() {
  // Range configuration
  const [position, setPosition] = useState<Position>('UTG');
  const [stackSize, setStackSize] = useState<StackSize>('80bb');
  const [scenario, setScenario] = useState<Scenario>('rfi');

  // User's selections for each hand
  const [userSelections, setUserSelections] = useState<Record<string, SimpleAction | null>>(() => {
    const initial: Record<string, SimpleAction | null> = {};
    ALL_HANDS.forEach(hand => {
      initial[hand] = null;
    });
    return initial;
  });

  // UI state
  const [selectedAction, setSelectedAction] = useState<SimpleAction | null>(null);
  const [isPainting, setIsPainting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [existingRangeLoaded, setExistingRangeLoaded] = useState(false);

  // Load existing range when dropdowns change
  useEffect(() => {
    const loadExistingRange = async () => {
      try {
        const params = new URLSearchParams({
          stackSize,
          position,
          scenario,
        });
        
        const response = await fetch(`/api/load-range?${params}`);
        const result = await response.json();

        if (result.exists && result.data) {
          // Load the existing data
          setUserSelections(prev => {
            const updated = { ...prev };
            Object.entries(result.data).forEach(([hand, action]) => {
              updated[hand] = action as SimpleAction;
            });
            return updated;
          });
          setExistingRangeLoaded(true);
          setSaveMessage({ type: 'success', text: `Loaded existing range: ${result.filename}` });
        } else {
          // Clear to blank slate
          setUserSelections(() => {
            const blank: Record<string, SimpleAction | null> = {};
            ALL_HANDS.forEach(hand => {
              blank[hand] = null;
            });
            return blank;
          });
          setExistingRangeLoaded(false);
          setSaveMessage(null);
        }
      } catch (error) {
        console.error('Failed to load range:', error);
      }
    };

    loadExistingRange();
  }, [position, stackSize, scenario]);

  // Clear message after 3 seconds
  useEffect(() => {
    if (saveMessage) {
      const timer = setTimeout(() => setSaveMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [saveMessage]);

  // Paint a single cell
  const paintCell = useCallback((hand: string) => {
    if (selectedAction) {
      setUserSelections(prev => ({
        ...prev,
        [hand]: selectedAction,
      }));
    }
  }, [selectedAction]);

  // Start painting
  const handlePaintStart = useCallback((hand: string) => {
    setIsPainting(true);
    paintCell(hand);
  }, [paintCell]);

  // Stop painting on mouse up
  useEffect(() => {
    const handleMouseUp = () => setIsPainting(false);
    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, []);

  // Calculate fill progress
  const filledCount = Object.values(userSelections).filter(v => v !== null).length;
  const totalCells = ALL_HANDS.length;
  const allFilled = filledCount === totalCells;

  // Save the range
  const handleSave = async () => {
    if (!allFilled) return;

    setIsSaving(true);
    setSaveMessage(null);

    try {
      // Convert selections to data (filter out nulls)
      const data: Record<string, SimpleAction> = {};
      Object.entries(userSelections).forEach(([hand, action]) => {
        if (action) {
          data[hand] = action;
        }
      });

      const response = await fetch('/api/save-range', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stackSize,
          position,
          scenario,
          data,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSaveMessage({ type: 'success', text: `Saved to ${result.filepath}` });
        setExistingRangeLoaded(true);
      } else {
        setSaveMessage({ type: 'error', text: result.error || 'Failed to save' });
      }
    } catch (error) {
      setSaveMessage({ type: 'error', text: 'Network error' });
    } finally {
      setIsSaving(false);
    }
  };

  // Clear the chart
  const handleClear = () => {
    setUserSelections(() => {
      const blank: Record<string, SimpleAction | null> = {};
      ALL_HANDS.forEach(hand => {
        blank[hand] = null;
      });
      return blank;
    });
    setSaveMessage(null);
  };

  const getDisplayName = () => {
    const scenarioNames: Record<Scenario, string> = {
      'rfi': 'Raise First In',
      'vs-raise': 'vs Raise',
      'vs-3bet': 'vs 3-Bet',
      'vs-4bet': 'vs 4-Bet',
      'after-limp': 'After Limp',
    };
    return `${stackSize}+ ${position} - ${scenarioNames[scenario]}`;
  };

  return (
    <main className="min-h-screen bg-slate-50 py-8">
      <div className={`flex flex-col gap-6 p-6 max-w-2xl mx-auto ${isPainting ? 'select-none' : ''}`}>
        {/* Header */}
        <header className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">Range Builder</h1>
          <p className="text-slate-600 mt-1">Create and save your poker ranges</p>
        </header>

        {/* Dropdowns */}
        <RangeDropdowns
          position={position}
          stackSize={stackSize}
          scenario={scenario}
          onPositionChange={setPosition}
          onStackSizeChange={setStackSize}
          onScenarioChange={setScenario}
        />

        {/* Current range display */}
        <div className="text-center">
          <span className="text-lg font-medium text-slate-700">
            {getDisplayName()}
          </span>
          {existingRangeLoaded && (
            <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
              Loaded
            </span>
          )}
        </div>

        {/* Action palette */}
        <div className="flex justify-center">
          <ActionPalette
            selectedAction={selectedAction}
            onSelectAction={setSelectedAction}
          />
        </div>

        {/* Progress */}
        <div className="text-center text-sm text-slate-500">
          {filledCount} / {totalCells} cells filled
          {!selectedAction && filledCount === 0 && (
            <span className="block text-slate-400 mt-1">
              Select an action above, then paint the chart
            </span>
          )}
        </div>

        {/* Range chart */}
        <RangeChart
          userSelections={userSelections}
          isSubmitted={false}
          isPainting={isPainting}
          selectedAction={selectedAction}
          onPaint={paintCell}
          onPaintStart={handlePaintStart}
        />

        {/* Action buttons */}
        <div className="flex justify-center gap-4">
          <button
            onClick={handleClear}
            className="px-6 py-3 rounded-lg font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all duration-150"
          >
            Clear
          </button>
          <button
            onClick={handleSave}
            disabled={!allFilled || isSaving}
            className={`
              px-6 py-3 rounded-lg font-semibold text-white
              transition-all duration-150
              ${allFilled && !isSaving
                ? 'bg-green-600 hover:bg-green-700 cursor-pointer'
                : 'bg-slate-300 cursor-not-allowed'
              }
            `}
          >
            {isSaving ? 'Saving...' : existingRangeLoaded ? 'Update Range' : 'Save Range'}
          </button>
        </div>

        {/* Save message */}
        {saveMessage && (
          <div
            className={`
              text-center py-2 px-4 rounded-lg text-sm font-medium
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
    </main>
  );
}
