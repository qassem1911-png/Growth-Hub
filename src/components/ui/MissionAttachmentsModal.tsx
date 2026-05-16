'use client'

import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'

// ── Types ──────────────────────────────────────────────────────────────────
interface Attachment {
  id: string
  mission_id: string
  user_id: string
  name: string
  url: string
  file_type: string
  created_at: string
}

interface Props {
  missionId: string
  missionTitle: string
  themeColor: string
  isOpen: boolean
  attachments: Attachment[]
  setAttachments: React.Dispatch<React.SetStateAction<Attachment[]>>
  loading: boolean
  onClose: () => void
  onCountChange?: (count: number) => void
}

// ── File-type detection from URL ───────────────────────────────────────────
function detectFileType(url: string): string {
  const lower = url.toLowerCase().split('?')[0]
  if (/\.(pdf)$/.test(lower)) return 'pdf'
  if (/\.(xlsx?|csv|ods)$/.test(lower)) return 'excel'
  if (/\.(jpe?g|png|gif|webp|svg|bmp|ico|avif)$/.test(lower)) return 'image'
  if (/\.(docx?|odt|rtf|txt|md)$/.test(lower)) return 'doc'
  if (/\.(mp4|mov|avi|webm|mkv)$/.test(lower)) return 'video'
  if (/\.(mp3|wav|ogg|flac)$/.test(lower)) return 'audio'
  if (/\.(zip|rar|7z|tar|gz)$/.test(lower)) return 'archive'
  return 'link'
}

// ── Icon renderer per type ─────────────────────────────────────────────────
const FileIcon = React.memo(({ type, color }: { type: string; color: string }) => {
  const icons: Record<string, { icon: string; glow: string }> = {
    pdf:     { icon: 'picture_as_pdf', glow: '#FF4444' },
    excel:   { icon: 'table_chart',    glow: '#00FF88' },
    image:   { icon: 'image',          glow: '#FF00FF' },
    doc:     { icon: 'description',    glow: '#4488FF' },
    video:   { icon: 'videocam',       glow: '#FF8800' },
    audio:   { icon: 'music_note',     glow: '#AA44FF' },
    archive: { icon: 'folder_zip',     glow: '#FFCC00' },
    link:    { icon: 'link',           glow: color },
  }
  const { icon, glow } = icons[type] ?? icons.link
  return (
    <span
      className="material-symbols-outlined text-2xl shrink-0"
      style={{ color: glow, textShadow: `0 0 10px ${glow}88` }}
    >
      {icon}
    </span>
  )
})
FileIcon.displayName = 'FileIcon'

// ── Preview renderer ────────────────────────────────────────────────────────
const PreviewPanel = React.memo(({ attachment, onClose, themeColor }: { attachment: Attachment; onClose: () => void; themeColor: string }) => {
  const isImage = attachment.file_type === 'image'
  const isVideo = attachment.file_type === 'video'

  return (
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center bg-black/95 backdrop-blur-lg p-4"
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-3xl bg-[#080808] border rounded-sm overflow-hidden shadow-2xl"
        style={{ borderColor: `${themeColor}33`, boxShadow: `0 0 40px ${themeColor}22` }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: `${themeColor}22` }}>
          <p className="font-space font-black uppercase tracking-widest text-xs truncate" style={{ color: themeColor }}>
            PREVIEW // {attachment.name}
          </p>
          <button onClick={onClose} className="material-symbols-outlined text-white/30 hover:text-white transition-colors text-lg">close</button>
        </div>
        <div className="p-6 flex items-center justify-center min-h-[320px]">
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={attachment.url} alt={attachment.name} className="max-w-full max-h-[60vh] object-contain rounded-sm" />
          ) : isVideo ? (
            <video src={attachment.url} controls className="max-w-full max-h-[60vh] rounded-sm" />
          ) : (
            <div className="flex flex-col items-center gap-6 text-center">
              <FileIcon type={attachment.file_type} color={themeColor} />
              <p className="font-space text-white/40 text-xs uppercase tracking-widest">
                Preview not available for this file type
              </p>
              <a
                href={attachment.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-3 font-space font-black uppercase tracking-widest text-xs text-black transition-all hover:scale-105"
                style={{ backgroundColor: themeColor, boxShadow: `0 0 20px ${themeColor}44` }}
              >
                Open in Browser
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
})
PreviewPanel.displayName = 'PreviewPanel'

// ── Main Modal ─────────────────────────────────────────────────────────────
const MissionAttachmentsModal = ({
  missionId,
  missionTitle,
  themeColor,
  isOpen,
  attachments,
  setAttachments,
  loading,
  onClose,
  onCountChange,
}: Props) => {
  const supabase = createClient()
  const [newName, setNewName] = useState('')
  const [newUrl, setNewUrl] = useState('')
  const [adding, setAdding] = useState(false)
  const [previewItem, setPreviewItem] = useState<Attachment | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // ── Add ──────────────────────────────────────────────────────────────────
  const handleAdd = async () => {
    const trimName = newName.trim()
    const trimUrl = newUrl.trim()
    if (!trimName || !trimUrl) return
    setAdding(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setAdding(false); return }
    const file_type = detectFileType(trimUrl)
    const { data, error } = await supabase
      .from('mission_attachments')
      .insert({ mission_id: missionId, user_id: user.id, name: trimName, url: trimUrl, file_type })
      .select()
      .single()
    if (!error && data) {
      const updated = [data, ...attachments]
      setAttachments(updated)
      onCountChange?.(updated.length)
      setNewName('')
      setNewUrl('')
    }
    setAdding(false)
  }

  // ── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    setDeletingId(id)
    await supabase.from('mission_attachments').delete().eq('id', id)
    const updated = attachments.filter(a => a.id !== id)
    setAttachments(updated)
    onCountChange?.(updated.length)
    setDeletingId(null)
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90 backdrop-blur-md p-4" onClick={onClose}>
        <div
          onClick={e => e.stopPropagation()}
          className="w-full max-w-xl flex flex-col bg-[#080808] border rounded-sm shadow-2xl overflow-hidden"
          style={{
            borderColor: `${themeColor}33`,
            boxShadow: `0 0 60px ${themeColor}18`,
            maxHeight: '88vh',
          }}
        >
          {/* ── Modal Header ─────────────────────────────────────── */}
          <div className="flex items-center justify-between px-6 py-5 border-b shrink-0" style={{ borderColor: `${themeColor}22` }}>
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-xl" style={{ color: themeColor, textShadow: `0 0 12px ${themeColor}` }}>attach_file</span>
              <div>
                <p className="font-space font-black uppercase tracking-widest text-[10px] text-white/30">ATTACHMENTS</p>
                <p className="font-space font-black uppercase italic text-sm truncate max-w-[260px]" style={{ color: themeColor }}>{missionTitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-space font-black text-xs px-2 py-1 rounded-sm" style={{ color: themeColor, backgroundColor: `${themeColor}18`, border: `1px solid ${themeColor}33` }}>
                {attachments.length}
              </span>
              <button onClick={onClose} className="material-symbols-outlined text-white/30 hover:text-white transition-colors text-xl">close</button>
            </div>
          </div>

          {/* ── Add Attachment Form ───────────────────────────────── */}
          <div className="px-6 py-5 border-b shrink-0" style={{ borderColor: `${themeColor}15` }}>
            <div className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="ATTACHMENT_NAME..."
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                className="w-full bg-white/5 border border-white/8 px-4 py-3 font-space text-xs font-black text-white uppercase tracking-widest outline-none placeholder:text-white/20 transition-all rounded-sm"
              />
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="HTTPS://..."
                  value={newUrl}
                  onChange={e => setNewUrl(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAdd()}
                  className="flex-1 bg-white/5 border border-white/8 px-4 py-3 font-space text-xs font-black text-white uppercase tracking-widest outline-none placeholder:text-white/20 transition-all rounded-sm"
                />
                <button
                  onClick={handleAdd}
                  disabled={adding || !newName.trim() || !newUrl.trim()}
                  className="px-5 py-3 font-space font-black uppercase tracking-widest text-[10px] text-black transition-all rounded-sm shrink-0"
                  style={{ backgroundColor: themeColor, boxShadow: `0 0 16px ${themeColor}44` }}
                >
                  {adding ? <span className="material-symbols-outlined text-base animate-spin">progress_activity</span> : 'ADD'}
                </button>
              </div>
            </div>
          </div>

          {/* ── Attachment List ───────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 scrollbar-thin">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <span className="material-symbols-outlined text-3xl animate-spin" style={{ color: themeColor }}>progress_activity</span>
                <p className="font-space font-black uppercase tracking-[0.2em] text-[9px] text-white/20">FETCHING_DATA...</p>
              </div>
            ) : attachments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <span className="material-symbols-outlined text-4xl opacity-20" style={{ color: themeColor }}>attach_file</span>
                <p className="font-space font-black uppercase tracking-[0.4em] text-[9px] text-white/20">NO_ATTACHMENTS_LINKED</p>
              </div>
            ) : (
              attachments.map(att => (
                <div
                  key={att.id}
                  className="flex items-center gap-4 p-4 border rounded-sm transition-all"
                  style={{ borderColor: `${themeColor}1A`, backgroundColor: `${themeColor}08` }}
                >
                  <FileIcon type={att.file_type} color={themeColor} />
                  <div className="flex-1 min-w-0">
                    <p className="font-space font-black text-xs text-white uppercase truncate tracking-wide">{att.name}</p>
                    <p className="font-space text-[8px] uppercase tracking-widest text-white/25 mt-0.5">
                      {att.file_type.toUpperCase()} // {new Date(att.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={att.url} target="_blank" rel="noopener noreferrer"
                      className="px-3 py-1.5 font-space font-black uppercase tracking-widest text-[8px] border transition-all rounded-sm"
                      style={{ color: themeColor, borderColor: `${themeColor}44` }}
                    >OPEN</a>
                    <button
                      onClick={() => setPreviewItem(att)}
                      className="px-3 py-1.5 font-space font-black uppercase tracking-widest text-[8px] border transition-all rounded-sm"
                      style={{ color: '#FF00FF', borderColor: '#FF00FF44' }}
                    >PREVIEW</button>
                    <button
                      onClick={() => handleDelete(att.id)}
                      disabled={deletingId === att.id}
                      className="w-7 h-7 flex items-center justify-center border border-white/10 text-white/25 hover:border-red-500/60 hover:text-red-500 transition-all rounded-sm"
                    >
                      {deletingId === att.id ? <span className="material-symbols-outlined text-xs animate-spin">progress_activity</span> : <span className="material-symbols-outlined text-xs">close</span>}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="px-6 py-4 border-t shrink-0 flex items-center justify-between" style={{ borderColor: `${themeColor}15` }}>
            <p className="font-space text-[8px] uppercase tracking-[0.4em] text-white/15">MISSION_ATTACHMENTS // SECURE_UPLINK</p>
            <button onClick={onClose} className="font-space font-black uppercase tracking-widest text-[9px] text-white/25 hover:text-white transition-colors">CLOSE</button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {previewItem && (
          <PreviewPanel
            attachment={previewItem}
            onClose={() => setPreviewItem(null)}
            themeColor={themeColor}
          />
        )}
      </AnimatePresence>
    </>
  )
}

export default React.memo(MissionAttachmentsModal)
