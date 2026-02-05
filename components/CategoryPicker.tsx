'use client';

import { useState, useMemo } from 'react';
import {
  WheelPicker,
  WheelPickerWrapper,
  type WheelPickerOption,
} from '@/components/wheel-picker';
import { CATEGORY_CONFIG, type HandCategory } from '@/data/hands';

// All category keys in display order
const CATEGORY_KEYS: HandCategory[] = [
  'pocketPairs',
  'axSuited',
  'axOffsuit',
  'kxSuited',
  'suitedConnectors',
  'suitedOneGappers',
];

interface CategoryPickerProps {
  /** Floor values for all categories */
  categoryFloors: Record<HandCategory, string | null>;
  /** Exceptions for all categories */
  categoryExceptions: Record<HandCategory, string[]>;
  /** Callback when user changes a floor value */
  onFloorChange: (category: HandCategory, floor: string) => void;
  /** Disable interaction (e.g., after submission) */
  disabled?: boolean;
}

/**
 * Two-dial iOS-style wheel picker for selecting hand category floors.
 * First dial selects category, second dial selects hand floor within that category.
 */
export function CategoryPicker({
  categoryFloors,
  categoryExceptions,
  onFloorChange,
  disabled = false,
}: CategoryPickerProps) {
  // Track which category is currently selected in the first dial
  const [selectedCategory, setSelectedCategory] = useState<HandCategory>('pocketPairs');

  // Generate options for the category picker (first dial)
  const categoryOptions: WheelPickerOption<string>[] = useMemo(() => {
    return CATEGORY_KEYS.map(key => ({
      value: key,
      label: CATEGORY_CONFIG[key].shortName,
    }));
  }, []);

  // Get config for the selected category
  const selectedConfig = CATEGORY_CONFIG[selectedCategory];

  // Generate options for the hand picker (second dial) based on selected category
  // Reversed so strongest is at top, weakest at bottom, with blank option at the very bottom
  const handOptions: WheelPickerOption<string>[] = useMemo(() => {
    const options = [...selectedConfig.hands]
      .reverse() // Strongest first, weakest last
      .map(hand => ({
        value: hand,
        label: selectedConfig.formatLabel(hand),
      }));
    
    // Add blank option at the bottom
    options.push({
      value: '',
      label: '—',
    });
    
    return options;
  }, [selectedConfig]);

  // Current floor value for the selected category
  const currentFloor = categoryFloors[selectedCategory] ?? '';

  // Current exceptions for the selected category
  const currentExceptions = categoryExceptions[selectedCategory] || [];

  // Format exceptions as ranges where possible
  const formattedExceptions = useMemo(() => {
    if (currentExceptions.length === 0) return null;
    
    // Get indices of exceptions in the hands array
    const indices = currentExceptions
      .map(h => selectedConfig.hands.indexOf(h))
      .filter(i => i !== -1)
      .sort((a, b) => a - b);
    
    if (indices.length === 0) return null;
    
    // Group consecutive indices into ranges
    const ranges: string[] = [];
    let rangeStart = indices[0];
    let rangeEnd = indices[0];
    
    for (let i = 1; i <= indices.length; i++) {
      if (i < indices.length && indices[i] === rangeEnd + 1) {
        rangeEnd = indices[i];
      } else {
        // End current range
        const startHand = selectedConfig.hands[rangeStart];
        const endHand = selectedConfig.hands[rangeEnd];
        if (rangeStart === rangeEnd) {
          ranges.push(startHand);
        } else {
          ranges.push(`${startHand}-${endHand}`);
        }
        if (i < indices.length) {
          rangeStart = indices[i];
          rangeEnd = indices[i];
        }
      }
    }
    
    return ranges.join(', ');
  }, [currentExceptions, selectedConfig.hands]);

  // Handle hand floor change
  const handleFloorChange = (floor: string) => {
    onFloorChange(selectedCategory, floor);
  };

  return (
    <div className={`${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      {/* Labels above the pickers */}
      {/* <div className="flex gap-2 mb-2">
        <div className="flex-1 text-center">
          <span className="text-xs font-medium text-slate-500">Category</span>
        </div>
        <div className="flex-1 text-center">
          <span className="text-xs font-medium text-slate-500">Floor</span>
        </div>
      </div> */}
      
      {/* Both pickers in a single wrapper like the examples */}
      <div className="flex gap-2">
        <WheelPickerWrapper className="flex-3">
          <WheelPicker
            options={categoryOptions}
            value={selectedCategory}
            onValueChange={(value) => setSelectedCategory(value as HandCategory)}
          />
        </WheelPickerWrapper>
        <WheelPickerWrapper className="flex-2">
          <WheelPicker
            key={selectedCategory} // Force re-render when category changes
            options={handOptions}
            value={currentFloor}
            onValueChange={handleFloorChange}
          />
        </WheelPickerWrapper>
      </div>
      
      {/* Display current selection and exceptions */}
      {/* {(currentFloor || formattedExceptions) && (
        <div className="mt-2 text-center">
          <span className="text-xs text-slate-400">
            {currentFloor ? selectedConfig.formatLabel(currentFloor) : ''}
            {currentFloor && formattedExceptions ? ', ' : ''}
            {formattedExceptions || ''}
          </span>
        </div>
      )} */}
    </div>
  );
}

export default CategoryPicker;
