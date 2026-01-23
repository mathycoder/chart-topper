'use client';

import { useState, useCallback, useEffect } from 'react';
import type { SimpleAction, Position, StackSize, Scenario } from '@/types';
import { ALL_HANDS } from '@/data/hands';
import { RangeChart } from '@/components/RangeChart';
import { ActionPalette } from '@/components/ActionPalette';
import { RangeDropdowns } from '@/components/RangeDropdowns';

/**
 * Builder Mode - Create and save poker ranges.
 * Desktop: Two-column layout (controls left, grid right)
 * Mobile: Single column stacked layout
 */
export default function BuilderPage() {
  const [position, setPosition] = useState<Position>('UTG');
  const [stackSize, setStackSize] = useState<StackSize>('80bb');
  const [scenario, setScenario] = useState<Scenario>('rfi');

  const [userSelections, setUserSelections] = useState<Record<string, SimpleAction | null>>(() => {
    const initial: Record<string, SimpleAction | null> = {};
    ALL_HANDS.forEach(hand => {
      initial[hand] = null;
    });
    return initial;
  });

  const [selectedAction, setSelectedAction] = useState<SimpleAction | null>(null);
  const [isPainting, setIsPainting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [existingRangeLoaded, setExistingRangeLoaded] = useState(false);

  // Load existing range when dropdowns change
  useEffect(() => {
    const loadExistingRange = async () => {
      try {
        const params = new URLSearchParams({ stackSize, position, scenario });
        const response = await fetch(`/api/load-range?${params}`);
        const result = await response.json();

        if (result.exists && result.data) {
          setUserSelections(prev => {
            const updated = { ...prev };
            Object.entries(result.data).forEach(([hand, action]) => {
              updated[hand] = action as SimpleAction;
            });
            return updated;
          });
          setExistingRangeLoaded(true);
          setSaveMessage({ type: 'success', text: `Loaded: ${result.filename}` });
        } else {
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

  useEffect(() => {
    if (saveMessage) {
      const timer = setTimeout(() => setSaveMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [saveMessage]);

  const paintCell = useCallback((hand: string) => {
    if (selectedAction) {
      setUserSelections(prev => ({
        ...prev,
        [hand]: selectedAction,
      }));
    }
  }, [selectedAction]);

  const handlePaintStart = useCallback((hand: string) => {
    setIsPainting(true);
    paintCell(hand);
  }, [paintCell]);

  useEffect(() => {
    const handleMouseUp = () => setIsPainting(false);
    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, []);

  const filledCount = Object.values(userSelections).filter(v => v !== null).length;
  const totalCells = ALL_HANDS.length;
  const allFilled = filledCount === totalCells;

  const handleSave = async () => {
    if (!allFilled) return;
    setIsSaving(true);
    setSaveMessage(null);

    try {
      const data: Record<string, SimpleAction> = {};
      Object.entries(userSelections).forEach(([hand, action]) => {
        if (action) data[hand] = action;
      });

      const response = await fetch('/api/save-range', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stackSize, position, scenario, data }),
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
    <main className={`min-h-screen p-4 lg:p-8 ${isPainting ? 'select-none' : ''} max-w-[1050px] mx-auto`}>
      {/* Two-column layout on desktop */}
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 max-w-6xl mx-auto">
        {/* Left column - Controls */}
        <div className="flex flex-col gap-4 lg:w-80 lg:flex-shrink-0">
          {/* Title */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <h1 className="text-xl font-bold text-slate-900">Builder Mode</h1>
            <p className="text-slate-600 text-sm mt-1">Create and save your poker ranges</p>
          </div>

          {/* Dropdowns */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <RangeDropdowns
              position={position}
              stackSize={stackSize}
              scenario={scenario}
              onPositionChange={setPosition}
              onStackSizeChange={setStackSize}
              onScenarioChange={setScenario}
            />
          </div>

          {/* Current range name */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <div className="text-sm text-slate-500 mb-1">Current Range</div>
            <div className="font-medium text-slate-900">{getDisplayName()}</div>
            {existingRangeLoaded && (
              <span className="inline-block mt-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                ✓ Loaded from file
              </span>
            )}
          </div>

          {/* Action palette */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <ActionPalette
              selectedAction={selectedAction}
              onSelectAction={setSelectedAction}
            />
          </div>

          {/* Progress */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <div className="text-sm text-slate-600">
              <div className="flex justify-between mb-2">
                <span>Progress</span>
                <span className="font-medium">{filledCount} / {totalCells}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div 
                  className="bg-slate-900 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(filledCount / totalCells) * 100}%` }}
                />
              </div>
            </div>
          </div>

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
            isPainting={isPainting}
            selectedAction={selectedAction}
            onPaint={paintCell}
            onPaintStart={handlePaintStart}
          />
        </div>
      </div>
    </main>
  );
}
