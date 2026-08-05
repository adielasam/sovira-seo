'use client'

import React from 'react'
import { BrainCircuit } from 'lucide-react'
import { ShareButton } from './ShareButton'

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

const CssTreeNode = ({ node, depth = 0 }: { node: any; depth?: number }) => {
  if (!node) return null

  // Match the screenshot: 
  // Root (depth 0): Dark slate bg, white text.
  // Level 1 (depth 1): White bg, blue border, rounded-lg.
  // Level 2+ (depth 2+): White bg, slate border, rounded-lg.
  const bgColors = [
    'bg-[#2c3e50] border-[#2c3e50] text-white font-bold shadow-md rounded-xl px-6 py-4 min-w-[200px]', // Root
    'bg-white border-[#3b82f6] text-[#334155] font-medium shadow-sm rounded-lg px-5 py-3 min-w-[180px]', // L1
    'bg-white border-[#94a3b8] text-[#475569] text-sm rounded-lg px-4 py-2 min-w-[160px]', // L2
    'bg-white border-[#cbd5e1] text-[#64748b] text-sm rounded-lg px-4 py-2 min-w-[160px]' // L3+
  ]
  const styleClass = bgColors[Math.min(depth, bgColors.length - 1)]
  
  // The line color
  const lineColor = '#cbd5e1';

  return (
    <div className="flex items-center">
      {/* Node Box */}
      <div className={`border-2 text-center max-w-[300px] shrink-0 z-10 relative ${styleClass}`}>
        {node.title.replace(/\*\*/g, '')}
      </div>

      {/* Children */}
      {node.children && node.children.length > 0 && (
        <div className="flex flex-col relative pl-16 py-2">
          {/* Horizontal line coming out of parent - extends further to give room for the curl */}
          <div className="absolute left-0 top-1/2 w-8 h-[2px] bg-[#cbd5e1] -translate-y-1/2" />
          
          {/* Vertical spine connecting the children */}
          <div className="absolute left-8 top-0 bottom-0 w-[2px] bg-[#cbd5e1]" 
               style={{ 
                 display: node.children.length > 1 ? 'block' : 'none' 
               }} 
          />

          {node.children.map((child: any, i: number) => {
            const isFirst = i === 0;
            const isLast = i === node.children.length - 1;
            const isOnly = node.children.length === 1;

            return (
              <div key={child.id} className="relative flex items-center my-4">
                {/* Connector curls/lines to child */}
                <div className="absolute -left-8 w-8 h-full pointer-events-none">
                   {isOnly ? (
                     // Straight line for single child
                     <div className="absolute top-1/2 left-0 w-full h-[2px] bg-[#cbd5e1] -translate-y-1/2" />
                   ) : (
                     // Deep bezier-like curls using large border-radius
                     <>
                       {/* The horizontal segment touching the child */}
                       <div className="absolute top-1/2 right-0 w-4 h-[2px] bg-[#cbd5e1] -translate-y-1/2" />
                       
                       {/* The curved corner linking the vertical spine to the horizontal segment */}
                       <div className={`absolute left-0 w-4 border-l-2 border-[#cbd5e1] ${isFirst ? 'bottom-1/2 h-[50%] border-b-2 rounded-bl-3xl' : isLast ? 'top-1/2 h-[50%] border-t-2 rounded-tl-3xl' : 'top-0 h-full'}`} />
                       
                       {/* For middle items, we just need a T-junction */}
                       {!isFirst && !isLast && (
                         <div className="absolute top-1/2 left-0 w-4 h-[2px] bg-[#cbd5e1] -translate-y-1/2" />
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
    <div className="w-full h-full min-h-screen overflow-auto bg-[#f8fafc] p-8 md:p-12 relative group">
      {/* Expansive canvas allowing 'A3' like size */}
      <div className="inline-flex min-w-max pb-32">
        {tree.title !== 'Root' || tree.children.length > 0 ? (
          <CssTreeNode node={tree} />
        ) : (
          <div className="flex flex-col items-center text-slate-400 gap-3 mx-auto w-full justify-center mt-32">
            <BrainCircuit className="w-12 h-12 opacity-50" />
            <p>Unable to parse mindmap structure.</p>
          </div>
        )}
      </div>

      <ShareButton title="Mindmap" />
    </div>
  )
}
