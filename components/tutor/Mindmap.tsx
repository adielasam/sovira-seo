'use client'

import { BrainCircuit } from 'lucide-react'

// Simple markdown list parser for Mindmaps
function parseMarkdownTree(markdown: string) {
  const lines = markdown.split('\n').filter(l => l.trim().length > 0)
  const root = { title: 'Root', children: [] as any[] }
  const stack = [{ node: root, level: -1 }]

  for (const line of lines) {
    const match = line.match(/^(\s*)[*+-]\s+(.*)$/)
    if (!match) continue
    
    const indent = match[1].length
    const title = match[2].trim()
    const level = indent / 2 // assuming 2 spaces per level, adjust as needed

    const newNode = { title, children: [] }

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

  // Define colors based on depth
  const bgColors = [
    'bg-blue-600 text-white shadow-blue-500/30',
    'bg-purple-100 dark:bg-purple-900/30 text-purple-900 dark:text-purple-100 border border-purple-200 dark:border-purple-800',
    'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
    'bg-transparent text-slate-600 dark:text-slate-400 text-sm'
  ]

  const styleClass = bgColors[Math.min(depth, bgColors.length - 1)]

  return (
    <div className="flex flex-col items-center">
      <div className={`px-4 py-2.5 rounded-xl shadow-sm font-medium ${styleClass} max-w-sm text-center relative z-10`}>
        {node.title.replace(/\*\*/g, '')}
      </div>
      
      {node.children && node.children.length > 0 && (
        <div className="flex flex-col items-center relative mt-4">
          {/* Vertical line down from parent */}
          <div className="absolute -top-4 w-px h-4 bg-slate-300 dark:bg-slate-600" />
          
          {/* Horizontal line connecting children if > 1 */}
          {node.children.length > 1 && (
            <div className="absolute top-0 h-px bg-slate-300 dark:bg-slate-600" 
                 style={{ 
                   width: `calc(100% - 100% / ${node.children.length})` 
                 }} 
            />
          )}

          <div className="flex gap-4 sm:gap-8 pt-4">
            {node.children.map((child: any, i: number) => (
              <div key={i} className="relative flex flex-col items-center">
                {/* Vertical line down to child */}
                <div className="absolute -top-4 w-px h-4 bg-slate-300 dark:bg-slate-600" />
                <TreeNode node={child} depth={depth + 1} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function Mindmap({ markdown }: { markdown: string }) {
  if (!markdown) return null
  
  const tree = parseMarkdownTree(markdown)

  return (
    <div className="w-full h-full min-h-[500px] overflow-auto bg-white dark:bg-slate-900 rounded-2xl shadow-inner border border-slate-200 dark:border-slate-800 p-8 flex items-start justify-center">
      <div className="inline-flex min-w-fit pt-8 pb-16 px-8">
        {tree.title !== 'Root' || tree.children.length > 0 ? (
          <TreeNode node={tree} />
        ) : (
          <div className="flex flex-col items-center text-slate-400 gap-3">
            <BrainCircuit className="w-12 h-12 opacity-50" />
            <p>Unable to parse mindmap structure.</p>
          </div>
        )}
      </div>
    </div>
  )
}
