"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";

import { ChatWorkspace } from "@/components/app/chat/ChatWorkspace";
import type { ChatContextType } from "@/lib/queries/chat";
import { useCreateSession } from "@/lib/queries/chat";

function ChatLandingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const autoCreateRef = useRef(false);

  const createSession = useCreateSession();

  const contextType = searchParams.get("contextType") as ChatContextType | null;
  const contextId = searchParams.get("contextId");

  useEffect(() => {
    if (autoCreateRef.current) return;
    if (contextType !== "document" && contextType !== "folder") return;
    if (!contextId) return;

    autoCreateRef.current = true;
    void createSession
      .mutateAsync({
        contextType,
        contextId,
      })
      .then((session) => {
        router.replace(`/chat/${session.id}`);
      })
      .catch(() => {
        autoCreateRef.current = false;
      });
  }, [contextType, contextId, createSession, router]);

  if (createSession.isPending && contextId) {
    return (
      <div className="flex flex-1 items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brutal-ink border-t-brutal-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ChatWorkspace
        isNewChat
        autoOpenPicker
        onSessionCreated={(id) => router.push(`/chat/${id}`)}
      />
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center p-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brutal-ink border-t-brutal-primary" />
        </div>
      }
    >
      <ChatLandingContent />
    </Suspense>
  );
}
