'use client';

import { useState, useEffect, useCallback } from 'react';
import type { SimpleAction } from '@/types';
import { useUrlState, useRangeSelections, usePainting } from '@/hooks';
import { Card, PageHeader } from './shared';
import { RangeChart } from './RangeChart';
import { ActionPalette } from './ActionPalette';
import { RangeDropdowns } from './RangeDropdowns';

/**
 * Builder Mode - Create and save poker ranges.
 * Desktop: Two-column layout (controls left, grid right)
 * Mobile: Single column stacked layout
 */
export function BuilderMode() {
  const { position, stackSize, scenario, setPosition, setStackSize, setScenario } = useUrlState('/builder');
  const { userSelections, setCell, loadSelections, clearSelections, filledCount, totalCells, allFilled } = useRangeSelections();

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [existingRangeLoaded, setExistingRangeLoaded] = useState(false);

  // Painting state
  const painting = usePainting();

  // Paint cell callback
  const paintCell = useCallback((hand: string) => {
    if (painting.selectedAction) {
      setCell(hand, painting.selectedAction);
    }
  }, [painting.selectedAction, setCell]);

  // Start painting and paint the initial cell
  const handlePaintStart = useCallback((hand: string) => {
    painting.handlePaintStart();
    if (painting.selectedAction) {
      setCell(hand, painting.selectedAction);
    }
  }, [painting, setCell]);

  // Load existing range when dropdowns change
  useEffect(() => {
    const loadExistingRange = async () => {
      try {
        const params = new URLSearchParams({ stackSize, position, scenario });
        const response = await fetch(`/api/load-range?${params}`);
        const result = await response.json();

        if (result.exists && result.data) {
          loadSelections(result.data as Record<string, SimpleAction>);
          setExistingRangeLoaded(true);
          setSaveMessage({ type: 'success', text: `Loaded: ${result.filename}` });
        } else {
          clearSelections();
          setExistingRangeLoaded(false);
          setSaveMessage(null);
        }
      } catch (error) {
        console.error('Failed to load range:', error);
      }
    };

    loadExistingRange();
  }, [position, stackSize, scenario, loadSelections, clearSelections]);

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
    clearSelections();
    setSaveMessage(null);
  };

  return (
    <main className={`min-h-screen p-4 lg:p-8 ${painting.isPainting ? 'select-none' : ''} max-w-[1050px] mx-auto`}>
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 max-w-6xl mx-auto">
        {/* Left column - Controls */}
        <div className="flex flex-col gap-4 lg:w-80 lg:flex-shrink-0">
          <PageHeader
            title="Builder Mode"
            description="Create and save your poker ranges"
          />

          <Card>
            <RangeDropdowns
              position={position}
              stackSize={stackSize}
              scenario={scenario}
              onPositionChange={setPosition}
              onStackSizeChange={setStackSize}
              onScenarioChange={setScenario}
            />
          </Card>

          <Card>
            <ActionPalette
              selectedAction={painting.selectedAction}
              onSelectAction={painting.setSelectedAction}
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
            isPainting={painting.isPainting}
            selectedAction={painting.selectedAction}
            onPaint={paintCell}
            onPaintStart={handlePaintStart}
          />
        </div>
      </div>
    </main>
  );
}

export default BuilderMode;
