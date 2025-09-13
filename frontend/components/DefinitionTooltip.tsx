'use client';

import { useState, useEffect, useRef } from 'react';
import { DefinitionResult } from '@/lib/agents/definition';

interface DefinitionTooltipProps {
  isVisible: boolean;
  position: { x: number; y: number };
  definition: DefinitionResult | null;
  loading: boolean;
}

export default function DefinitionTooltip({ 
  isVisible, 
  position, 
  definition, 
  loading 
}: DefinitionTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState(position);

  useEffect(() => {
    if (isVisible && tooltipRef.current) {
      const tooltip = tooltipRef.current;
      const rect = tooltip.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let newX = position.x;
      let newY = position.y + 10; // Offset below cursor

      // Adjust horizontal position if tooltip would overflow
      if (newX + rect.width > viewportWidth - 20) {
        newX = viewportWidth - rect.width - 20;
      }
      if (newX < 20) {
        newX = 20;
      }

      // Adjust vertical position if tooltip would overflow
      if (newY + rect.height > viewportHeight - 20) {
        newY = position.y - rect.height - 10; // Show above cursor instead
      }
      if (newY < 20) {
        newY = 20;
      }

      setAdjustedPosition({ x: newX, y: newY });
    }
  }, [isVisible, position, definition]);

  if (!isVisible) return null;

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'business': return 'bg-blue-600';
      case 'slang': return 'bg-green-600';
      case 'meme': return 'bg-purple-600';
      case 'cultural_reference': return 'bg-pink-600';
      case 'technical': return 'bg-orange-600';
      default: return 'bg-gray-600';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'business': return '💼';
      case 'slang': return '💬';
      case 'meme': return '😂';
      case 'cultural_reference': return '🎬';
      case 'technical': return '⚙️';
      default: return '📝';
    }
  };

  return (
    <div
      ref={tooltipRef}
      className="fixed z-50 max-w-sm bg-gray-800 border border-gray-600 rounded-lg shadow-2xl pointer-events-none"
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
        transform: 'translateZ(0)', // Force hardware acceleration
      }}
    >
      {loading ? (
        <div className="p-4">
          <div className="flex items-center gap-2">
            <div className="animate-spin w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full"></div>
            <span className="text-sm text-gray-300">Defining...</span>
          </div>
        </div>
      ) : definition ? (
        <div className="p-4">
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{getCategoryIcon(definition.category)}</span>
            <span className="font-semibold text-white">{definition.term}</span>
            <span className={`text-xs px-2 py-1 rounded-full text-white ${getCategoryColor(definition.category)}`}>
              {definition.category.replace('_', ' ')}
            </span>
          </div>

          {/* Definition */}
          <div className="text-sm text-gray-200 mb-3 leading-relaxed">
            {definition.definition}
          </div>

          {/* Context */}
          {definition.context && (
            <div className="text-xs text-gray-400 mb-2">
              <span className="font-medium">Context:</span> {definition.context}
            </div>
          )}

          {/* Examples */}
          {definition.examples && definition.examples.length > 0 && (
            <div className="mb-2">
              <div className="text-xs font-medium text-gray-300 mb-1">Examples:</div>
              <div className="text-xs text-gray-400 space-y-1">
                {definition.examples.slice(0, 2).map((example, index) => (
                  <div key={index} className="italic">
                    "{example}"
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Related Links */}
          {definition.relatedLinks && definition.relatedLinks.length > 0 && (
            <div className="mb-2">
              <div className="text-xs font-medium text-gray-300 mb-1">Links:</div>
              <div className="space-y-1">
                {definition.relatedLinks.slice(0, 2).map((link, index) => (
                  <a
                    key={index}
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:text-blue-300 underline block truncate"
                  >
                    {link}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-700">
            <span>Confidence: {Math.round(definition.confidence * 100)}%</span>
            <span>{definition.source === 'message_context' ? '📨 From chat' : '🤖 AI knowledge'}</span>
          </div>
        </div>
      ) : (
        <div className="p-4">
          <div className="text-sm text-gray-400">No definition available</div>
        </div>
      )}
    </div>
  );
}
