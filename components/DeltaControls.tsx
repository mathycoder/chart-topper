'use client';

import { useRef, useEffect, useCallback } from 'react';
import type { SpotDescriptor, DeltaAxis } from '@/types';
import type { UseDeltaReturn } from '@/hooks/useDelta';
import { SpotSelector } from './SpotSelector';

interface DeltaControlsProps {
  delta: UseDeltaReturn;
  currentSpot: SpotDescriptor;
  syncSpotToUrl: (s: SpotDescriptor) => void;
  disabled?: boolean;
  headerStyle?: boolean;
  /** 'desktop' renders labels vertically; 'mobile' uses a CSS grid layout */
  layout: 'desktop' | 'mobile';
}

export function DeltaControls({
  delta,
  currentSpot,
  syncSpotToUrl,
  disabled = false,
  headerStyle = false,
  layout,
}: DeltaControlsProps) {
  const {
    deltaAxisPickMode,
    deltaAxis,
    deltaTargetValue,
    deltaTargetOptions,
    setDeltaAxisPickMode,
    handleSelectDeltaAxis,
    setDeltaTargetValue,
    toggleDelta,
  } = delta;

  const isDisabled = disabled;

  // Mobile delta button: use touchend + preventDefault to avoid 300ms delay
  const mobileDeltaButtonRef = useRef<HTMLButtonElement>(null);
  const mobileDeltaTouchHandledRef = useRef(false);
  const deltaAxisPickModeRef = useRef(deltaAxisPickMode);
  deltaAxisPickModeRef.current = deltaAxisPickMode;

  useEffect(() => {
    if (layout !== 'mobile') return;
    const el = mobileDeltaButtonRef.current;
    if (!el) return;
    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      mobileDeltaTouchHandledRef.current = true;
      if (!isDisabled) toggleDelta();
    };
    el.addEventListener('touchend', handleTouchEnd, { passive: false });
    return () => el.removeEventListener('touchend', handleTouchEnd);
  }, [isDisabled, layout, toggleDelta]);

  const handleMobileClick = useCallback(() => {
    if (mobileDeltaTouchHandledRef.current) {
      mobileDeltaTouchHandledRef.current = false;
      return;
    }
    if (!isDisabled) toggleDelta();
  }, [isDisabled, toggleDelta]);

  const startingRangeRow = (hs: boolean) => (
    <SpotSelector
      spot={currentSpot}
      onChange={syncSpotToUrl}
      disabled={isDisabled}
      filterByAvailability={true}
      headerStyle={hs}
      deltaMode={deltaAxisPickMode}
      deltaAxis={deltaAxis}
      onSelectDeltaAxis={handleSelectDeltaAxis}
    />
  );

  const arrowRow = (hs: boolean) => (
    deltaAxis && deltaTargetOptions.length > 0 ? (
      <SpotSelector
        spot={currentSpot}
        onChange={syncSpotToUrl}
        disabled={isDisabled}
        filterByAvailability={true}
        headerStyle={hs}
        deltaMode={true}
        deltaAxis={deltaAxis}
        deltaTargetMode={true}
        deltaTargetRowMode="arrow"
        deltaTargetValue={deltaTargetValue}
        deltaTargetOptions={deltaTargetOptions}
        onDeltaTargetChange={setDeltaTargetValue}
      />
    ) : null
  );

  const targetRangeRow = (hs: boolean) => (
    deltaAxis && deltaTargetOptions.length > 0 ? (
      <SpotSelector
        spot={currentSpot}
        onChange={syncSpotToUrl}
        disabled={isDisabled}
        filterByAvailability={true}
        headerStyle={hs}
        deltaMode={true}
        deltaAxis={deltaAxis}
        deltaTargetMode={true}
        deltaTargetRowMode="value"
        deltaTargetVisible={true}
        deltaTargetValue={deltaTargetValue}
        deltaTargetOptions={deltaTargetOptions}
        onDeltaTargetChange={setDeltaTargetValue}
      />
    ) : null
  );

  const deltaButton = (hs: boolean) => (
    <button
      type="button"
      title="Pick one axis to vary (stack, position, opponent). Click Δ then click a field."
      onClick={() => !isDisabled && toggleDelta()}
      disabled={isDisabled}
      className={`
        shrink-0 flex items-center justify-center font-bold
        ${hs ? 'w-8 h-8 text-lg rounded-md' : 'w-7 h-7 text-base rounded'}
        ${deltaAxisPickMode ? 'bg-gold text-felt-bg' : 'bg-felt-elevated text-cream-muted hover:bg-felt-muted hover:text-cream'}
        ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      Δ
    </button>
  );

  if (layout === 'mobile') {
    return (
      <div className="bg-felt-surface border-b border-felt-border px-3 py-2.5">
        <div className="grid gap-x-2 gap-y-1" style={{ gridTemplateColumns: '3.5rem 1fr' }}>
          {/* Row 1: Start label | starting range + Δ */}
          <div className="flex items-center">
            <span className="text-xs font-semibold text-cream-muted uppercase tracking-wide">Start</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0 text-sm leading-relaxed">
              {startingRangeRow(false)}
            </div>
            <button
              ref={mobileDeltaButtonRef}
              type="button"
              title="Pick one axis to vary (stack, position, opponent)."
              onClick={handleMobileClick}
              disabled={isDisabled}
              className={`
                shrink-0 w-7 h-7 text-base rounded flex items-center justify-center font-bold
                touch-manipulation select-none
                ${deltaAxisPickMode ? 'bg-gold text-felt-bg' : 'bg-felt-elevated text-cream-muted'}
                ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:opacity-80'}
              `}
            >
              Δ
            </button>
          </div>

          {/* Row 2: empty | arrow row */}
          {deltaAxis && (
            <>
              <div />
              <div className="text-sm leading-relaxed">
                {arrowRow(false)}
              </div>
            </>
          )}

          {/* Row 3: Target label | target range */}
          {deltaAxis && (
            <>
              <div className="flex items-center">
                <span className="text-xs font-semibold text-cream-muted uppercase tracking-wide">Target</span>
              </div>
              <div className="text-sm leading-relaxed">
                {targetRangeRow(false)}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Desktop layout
  return (
    <div className="flex flex-col gap-1">
      <div>
        <p className="text-xs font-semibold text-cream-muted uppercase tracking-wide mb-1">Starting Range</p>
        <div className="flex items-start gap-2">
          <div className="text-lg leading-relaxed flex-1 min-w-0">
            {startingRangeRow(true)}
          </div>
          {deltaButton(true)}
        </div>
      </div>

      {!deltaAxis && !deltaAxisPickMode && (
        <p className="text-sm text-cream-muted">
          Click Δ then a field to choose your target axis
        </p>
      )}
      {deltaAxisPickMode && (
        <p className="text-sm text-cream font-medium">
          Click a field to set it as the varying axis
        </p>
      )}

      {deltaAxis && (
        <div className="text-lg leading-relaxed">
          {arrowRow(true)}
        </div>
      )}

      {deltaAxis && (
        <div>
          <p className="text-xs font-semibold text-cream-muted uppercase tracking-wide mb-1">Target Range</p>
          <div className="text-lg leading-relaxed">
            {targetRangeRow(true)}
          </div>
        </div>
      )}
    </div>
  );
}
