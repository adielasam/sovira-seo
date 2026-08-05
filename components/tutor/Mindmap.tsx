'use client'

import React, { useRef, useEffect, useState } from 'react'
import { BrainCircuit } from 'lucide-react'

// Simple markdown list parser for Mindmaps
function parseMarkdownTree(markdown: string) {
  const lines = markdown.split('\n').filter(l => l.trim().length > 0)
  const root = { title: 'Root', children: [] as any[], id: 'root' }
  const stack = [{ node: root, level: -1 }]
  let idCounter = 0

  for (const line of lines) {
    const match = line.match(/^(\s*)[*+-]\s+(.*)$/)
    if (!match) continue
    
    const indent = match[1].length
    const title = match[2].trim()
    const level = indent / 2 

    idCounter++
    const newNode = { title, children: [], id: `node-${idCounter}` }

    while (stack.length > 0 && stack[stack.length - 1].level >= level) {
      stack.pop()
    }

    stack[stack.length - 1].node.children.push(newNode)
    stack.push({ node: newNode, level })
  }
  
  return root.children.length === 1 ? root.children[0] : root
}

const TreeNode = ({ node, depth = 0 }: { node: any; depth?: number }) => {
  if (!node) return null

  // Colors based on depth, matching the image (blue border for root, dark text, white bg)
  const bgColors = [
    'bg-white text-[#2c3e50] border-2 border-[#3498db] shadow-sm',
    'bg-white text-[#2c3e50] border-2 border-[#7f8c8d] shadow-sm',
    'bg-white text-[#34495e] border-2 border-[#bdc3c7]',
    'bg-white text-[#7f8c8d] border border-[#ecf0f1] text-sm'
  ]

  const styleClass = bgColors[Math.min(depth, bgColors.length - 1)]

  // If node has no children, just render the box
  if (!node.children || node.children.length === 0) {
    return (
      <div className={`px-5 py-3 rounded-lg font-medium text-sm text-center min-w-[150px] max-w-[250px] ${styleClass}`}>
        {node.title.replace(/\*\*/g, '')}
      </div>
    )
  }

  // Horizontal Layout with SVG curves
  return (
    <div className="flex items-center gap-12 relative">
      {/* The Parent Node */}
      <div className={`px-5 py-3 rounded-lg font-bold text-sm text-center min-w-[150px] max-w-[250px] shrink-0 relative z-10 ${styleClass}`}>
        {node.title.replace(/\*\*/g, '')}
      </div>

      {/* The SVG Connecting Lines */}
      <div className="absolute left-[150px] top-0 bottom-0 w-12 z-0">
        <ConnectionLines numChildren={node.children.length} />
      </div>

      {/* The Children Stack */}
      <div className="flex flex-col gap-6 relative z-10">
        {node.children.map((child: any) => (
          <TreeNode key={child.id} node={child} depth={depth + 1} />
        ))}
      </div>
    </div>
  )
}

// Helper to draw curved bezier lines from the center-left to multiple children
const ConnectionLines = ({ numChildren }: { numChildren: number }) => {
  // We need to draw a curve from (0, 50%) to (100%, child_Y)
  // Since we don't easily know exact heights in pure CSS/SVG without refs,
  // we can use a clever trick: we render the SVG inside the child loop, 
  // or we just use CSS pseudo-elements for curves.
  // Actually, standard CSS border-radius can simulate bezier curves nicely!
  return null; // Handled via CSS pseudo-elements in the child nodes instead for perfect alignment.
}

// We will rewrite the layout to use a CSS-based tree approach which perfectly aligns 
// without needing complex absolute SVG paths.
const CssTreeNode = ({ node, depth = 0 }: { node: any; depth?: number }) => {
  if (!node) return null

  const bgColors = [
    'border-[#3b82f6] text-[#1e293b] font-bold shadow-sm', // Root: Blue border
    'border-[#64748b] text-[#334155] font-semibold shadow-sm', // L1: Slate border
    'border-[#94a3b8] text-[#475569]', // L2
    'border-[#cbd5e1] text-[#64748b] text-sm'
  ]
  const styleClass = bgColors[Math.min(depth, bgColors.length - 1)]

  return (
    <div className="flex items-center">
      {/* Node Box */}
      <div className={`bg-white px-5 py-3.5 rounded-xl border-2 text-sm text-center min-w-[160px] max-w-[280px] shrink-0 z-10 relative ${styleClass}`}>
        {node.title.replace(/\*\*/g, '')}
      </div>

      {/* Children */}
      {node.children && node.children.length > 0 && (
        <div className="flex flex-col relative pl-12 py-2">
          {/* Horizontal line coming out of parent */}
          <div className="absolute left-0 top-1/2 w-6 h-[2px] bg-[#cbd5e1] -translate-y-1/2" />
          
          {/* Vertical spine connecting the children */}
          <div className="absolute left-6 top-0 bottom-0 w-[2px] bg-[#cbd5e1]" 
               style={{ 
                 // Adjust spine so it doesn't go all the way to the top/bottom edges of the container, 
                 // but stops at the center of the first and last child.
                 // We'll use CSS trickery: the spine spans 100%, but we mask it or we just let curved borders handle it.
                 display: node.children.length > 1 ? 'block' : 'none' 
               }} 
          />

          {node.children.map((child: any, i: number) => {
            const isFirst = i === 0;
            const isLast = i === node.children.length - 1;
            const isOnly = node.children.length === 1;

            return (
              <div key={child.id} className="relative flex items-center my-3">
                {/* Connector curves/lines to child */}
                <div className="absolute -left-6 w-6 h-full pointer-events-none">
                   {isOnly ? (
                     // Straight line for single child
                     <div className="absolute top-1/2 left-0 w-full h-[2px] bg-[#cbd5e1] -translate-y-1/2" />
                   ) : (
                     // Curved lines
                     <>
                       {/* The horizontal segment touching the child */}
                       <div className="absolute top-1/2 right-0 w-3 h-[2px] bg-[#cbd5e1] -translate-y-1/2" />
                       
                       {/* The curved corner linking the vertical spine to the horizontal segment */}
                       <div className={`absolute left-0 w-3 border-l-2 border-[#cbd5e1] ${isFirst ? 'bottom-1/2 h-[50%] border-b-2 rounded-bl-xl' : isLast ? 'top-1/2 h-[50%] border-t-2 rounded-tl-xl' : 'top-0 h-full'}`} />
                       
                       {/* For middle items, we just need a T-junction (vertical line passes through, horizontal line shoots out) */}
                       {!isFirst && !isLast && (
                         <div className="absolute top-1/2 left-0 w-3 h-[2px] bg-[#cbd5e1] -translate-y-1/2" />
                       )}
                     </>
                   )}
                </div>
                <CssTreeNode node={child} depth={depth + 1} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}


export function Mindmap({ markdown }: { markdown: string }) {
  if (!markdown) return null
  
  const tree = parseMarkdownTree(markdown)

  return (
    <div className="w-full h-full min-h-[600px] overflow-auto bg-[#f8fafc] rounded-2xl shadow-inner border border-slate-200 p-8 flex items-center justify-start">
      <div className="inline-flex min-w-fit py-8 px-4">
        {tree.title !== 'Root' || tree.children.length > 0 ? (
          <CssTreeNode node={tree} />
        ) : (
          <div className="flex flex-col items-center text-slate-400 gap-3 mx-auto w-full justify-center">
            <BrainCircuit className="w-12 h-12 opacity-50" />
            <p>Unable to parse mindmap structure.</p>
          </div>
        )}
      </div>
    </div>
  )
}
