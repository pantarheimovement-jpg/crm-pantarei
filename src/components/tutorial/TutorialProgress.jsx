import React from 'react';

export default function TutorialProgress({ current, total }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className="h-1.5 rounded-full flex-1 transition-all duration-300"
          style={{
            backgroundColor: i <= current ? '#6D436D' : '#E5E7EB',
          }}
        />
      ))}
    </div>
  );
}