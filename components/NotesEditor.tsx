'use client';

import { Plus, X, GripVertical } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { NoteSection, RangeStrategyNotes } from '@/types';
import { cn } from '@/lib/utils';

// ─── Sortable Section ────────────────────────────────────────────────────────

interface SortableSectionProps {
  id: string;
  section: NoteSection;
  onUpdateHeading: (heading: string) => void;
  onUpdateBullet: (bulletIndex: number, text: string) => void;
  onAddBullet: () => void;
  onRemoveBullet: (bulletIndex: number) => void;
  onRemoveSection: () => void;
}

function SortableSection({
  id,
  section,
  onUpdateHeading,
  onUpdateBullet,
  onAddBullet,
  onRemoveBullet,
  onRemoveSection,
}: SortableSectionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'rounded-lg border border-felt-border bg-felt-elevated p-3 flex flex-col gap-2',
        isDragging && 'opacity-50 shadow-lg ring-1 ring-gold/40'
      )}
    >
      {/* Section header row */}
      <div className="flex items-center gap-2">
        {/* Drag handle */}
        <button
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          type="button"
          className="text-cream-muted hover:text-cream transition-colors cursor-grab active:cursor-grabbing shrink-0 touch-none"
          aria-label="Drag to reorder"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>

        <input
          type="text"
          value={section.heading}
          onChange={(e) => onUpdateHeading(e.target.value)}
          placeholder="Section heading…"
          className={cn(
            'flex-1 bg-transparent text-sm font-semibold text-cream',
            'placeholder:text-cream-muted focus:outline-none border-b border-transparent',
            'focus:border-gold transition-colors'
          )}
        />
        <button
          type="button"
          onClick={onRemoveSection}
          className="text-cream-muted hover:text-cream transition-colors shrink-0"
          aria-label="Remove section"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Bullets */}
      <div className="flex flex-col gap-1 pl-2">
        {section.bullets.map((bullet, bi) => (
          <div key={bi} className="flex items-center gap-1.5">
            <span className="text-cream-muted text-xs select-none">•</span>
            <input
              type="text"
              value={bullet}
              onChange={(e) => onUpdateBullet(bi, e.target.value)}
              placeholder="Bullet point…"
              className={cn(
                'flex-1 bg-transparent text-sm text-cream',
                'placeholder:text-cream-muted focus:outline-none',
                'border-b border-transparent focus:border-felt-border transition-colors'
              )}
            />
            {section.bullets.length > 1 && (
              <button
                type="button"
                onClick={() => onRemoveBullet(bi)}
                className="text-cream-muted hover:text-cream transition-colors shrink-0"
                aria-label="Remove bullet"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add bullet */}
      <button
        type="button"
        onClick={onAddBullet}
        className="self-start flex items-center gap-1 text-xs text-cream-muted hover:text-cream transition-colors pl-2 mt-0.5"
      >
        <Plus className="w-3 h-3" />
        Add bullet
      </button>
    </div>
  );
}

// ─── NotesEditor ─────────────────────────────────────────────────────────────

interface NotesEditorProps {
  value: RangeStrategyNotes;
  onChange: (notes: RangeStrategyNotes) => void;
}

export function NotesEditor({ value, onChange }: NotesEditorProps) {
  // Stable IDs so dnd-kit can track items across re-renders
  const ids = value.map((_, i) => String(i));

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = value.findIndex((_, i) => String(i) === active.id);
    const newIndex = value.findIndex((_, i) => String(i) === over.id);
    onChange(arrayMove(value, oldIndex, newIndex));
  }

  function updateSection(index: number, updated: NoteSection) {
    const next = [...value];
    next[index] = updated;
    onChange(next);
  }

  function removeSection(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function addSection() {
    onChange([...value, { heading: '', bullets: [''] }]);
  }

  return (
    <div className="flex flex-col gap-3">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          {value.map((section, si) => (
            <SortableSection
              key={si}
              id={String(si)}
              section={section}
              onUpdateHeading={(heading) => updateSection(si, { ...section, heading })}
              onUpdateBullet={(bi, text) => {
                const bullets = [...section.bullets];
                bullets[bi] = text;
                updateSection(si, { ...section, bullets });
              }}
              onAddBullet={() => updateSection(si, { ...section, bullets: [...section.bullets, ''] })}
              onRemoveBullet={(bi) =>
                updateSection(si, { ...section, bullets: section.bullets.filter((_, i) => i !== bi) })
              }
              onRemoveSection={() => removeSection(si)}
            />
          ))}
        </SortableContext>
      </DndContext>

      {/* Add section */}
      <button
        type="button"
        onClick={addSection}
        className={cn(
          'flex items-center justify-center gap-1.5 text-xs text-cream-muted hover:text-cream',
          'border border-dashed border-felt-border rounded-lg py-2 transition-colors hover:border-gold'
        )}
      >
        <Plus className="w-3.5 h-3.5" />
        Add section
      </button>
    </div>
  );
}
