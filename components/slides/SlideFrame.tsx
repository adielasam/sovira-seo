'use client'

import React from 'react'

interface SlideFrameProps {
  children: React.ReactNode
  isActive?: boolean
  isThumbnail?: boolean
  onClick?: () => void
}

export function SlideFrame({ children, isActive, isThumbnail, onClick }: SlideFrameProps) {
  return (
    <div
      onClick={onClick}
      className={`relative w-full overflow-hidden bg-white rounded shadow-sm flex items-center justify-center transition-all ${
        isThumbnail
          ? 'cursor-pointer hover:ring-2 hover:ring-orange-300 ' +
            (isActive ? 'ring-2 ring-orange-500 shadow-md' : 'ring-1 ring-gray-200')
          : 'ring-1 ring-gray-200 shadow-lg'
      }`}
      style={{ aspectRatio: '16/9' }}
    >
      <div
        className={`w-full h-full relative ${
          isThumbnail ? 'scale-[0.25] origin-top-left w-[400%] h-[400%]' : 'p-8'
        }`}
      >
        <div className="w-full h-full flex flex-col justify-center relative">
          {children}
        </div>
      </div>
    </div>
  )
}
