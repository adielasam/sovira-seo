'use client'

import dynamic from 'next/dynamic'
import { useMemo } from 'react'
import 'react-quill-new/dist/quill.snow.css'

const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false })

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
}

export default function RichTextEditor({ value, onChange }: RichTextEditorProps) {
  const modules = useMemo(() => ({
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'align': [] }],
      ['link', 'image', 'video'],
      ['clean']
    ],
  }), [])

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg overflow-hidden">
      <ReactQuill 
        theme="snow"
        value={value} 
        onChange={onChange}
        modules={modules}
        className="h-96"
      />
      <style jsx global>{`
        .quill {
          display: flex;
          flex-direction: column;
        }
        .ql-toolbar {
          border-top: none !important;
          border-left: none !important;
          border-right: none !important;
          border-bottom: 1px solid var(--tw-border-slate-300) !important;
          background-color: var(--tw-bg-slate-50);
        }
        .dark .ql-toolbar {
          border-bottom-color: var(--tw-border-slate-700) !important;
          background-color: var(--tw-bg-slate-800);
        }
        .ql-container {
          border: none !important;
          font-family: inherit !important;
          font-size: 1rem !important;
          flex: 1;
          height: 100%;
          min-height: 24rem;
        }
        .ql-editor {
          min-height: 24rem;
          color: var(--tw-text-slate-900);
        }
        .dark .ql-editor {
          color: var(--tw-text-white);
        }
        /* Toolbar Icon Colors for Dark Mode */
        .dark .ql-snow .ql-stroke {
          stroke: #94a3b8;
        }
        .dark .ql-snow .ql-fill, .dark .ql-snow .ql-stroke.ql-fill {
          fill: #94a3b8;
        }
        .dark .ql-snow .ql-picker {
          color: #94a3b8;
        }
      `}</style>
    </div>
  )
}
