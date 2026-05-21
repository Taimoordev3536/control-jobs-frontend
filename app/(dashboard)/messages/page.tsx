"use client"

import { useEffect, useRef, useState } from "react"
import { MessageSquarePlus, Plus } from "lucide-react"
import { useChat } from "@/components/providers/chat-provider"
import { ConversationList } from "@/components/chat/conversation-list"
import { ChatPanel } from "@/components/chat/chat-panel"
import { NewChatPanel } from "@/components/chat/new-chat-panel"
import { useTranslation } from "@/hooks/use-translation"

type View = "list" | "new-direct" | "new-group"

export default function MessagesPage() {
  const { t } = useTranslation()
  const { conversations, myScope } = useChat()
  const [view, setView] = useState<View>("list")
  const [activeId, setActiveId] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const canStartChat =
    myScope?.participantType !== "WORKER" && myScope?.participantType !== "CLIENT"

  useEffect(() => {
    if (!menuOpen) return
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener("mousedown", onDocClick)
    return () => document.removeEventListener("mousedown", onDocClick)
  }, [menuOpen])

  const active = conversations.find((c) => c.publicId === activeId) || null

  return (
    <div className="-mt-[10px] flex h-[calc(100vh-50px)] w-full overflow-hidden bg-background">
      <section className="hidden min-w-0 flex-1 md:flex md:flex-col">
        {active ? (
          <ChatPanel conversationPublicId={active.publicId} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 bg-muted/30 text-center text-sm text-muted-foreground">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#662D91]/10">
              <MessageSquarePlus className="h-7 w-7 text-[#662D91]" />
            </div>
            <span>{t("selectConversation")}</span>
          </div>
        )}
      </section>

      <aside className="order-first flex w-full min-w-0 flex-col border-r border-border bg-card shadow-lg md:order-last md:w-[216px] md:flex-shrink-0 md:rounded-bl-lg md:rounded-tl-lg md:border-l md:border-r-0">
        {view === "list" ? (
          <>
            <div className="flex h-[54px] flex-shrink-0 items-center justify-between border-b border-border px-3">
              <span className="text-sm font-semibold text-foreground">{t("messages")}</span>
              {canStartChat && (
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setMenuOpen((v) => !v)}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
                    aria-label={t("newChat")}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                  {menuOpen && (
                    <div className="absolute right-0 z-20 mt-1 overflow-hidden rounded-md border border-border bg-card shadow-lg">
                      <button
                        onClick={() => {
                          setMenuOpen(false)
                          setView("new-direct")
                        }}
                        className="block w-full whitespace-nowrap px-3 py-2 text-left text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      >
                        {t("newChat")}
                      </button>
                      {myScope?.canCreateGroup && (
                        <button
                          onClick={() => {
                            setMenuOpen(false)
                            setView("new-group")
                          }}
                          className="block w-full whitespace-nowrap px-3 py-2 text-left text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        >
                          {t("newGroup")}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="min-h-0 flex-1">
              <ConversationList
                conversations={conversations}
                activePublicId={activeId || undefined}
                onSelect={(id) => setActiveId(id)}
              />
            </div>
          </>
        ) : (
          <NewChatPanel
            mode={view === "new-direct" ? "direct" : "group"}
            onBack={() => setView("list")}
            onConversationCreated={(id) => {
              setActiveId(id)
              setView("list")
            }}
          />
        )}
      </aside>

      {active && (
        <section className="fixed inset-0 z-30 flex flex-col bg-background md:hidden" style={{ top: 60 }}>
          <ChatPanel conversationPublicId={active.publicId} />
          <button
            onClick={() => setActiveId(null)}
            className="absolute right-3 top-2 z-10 rounded-md bg-card px-2 py-1 text-xs text-muted-foreground shadow"
          >
            ←
          </button>
        </section>
      )}
    </div>
  )
}
