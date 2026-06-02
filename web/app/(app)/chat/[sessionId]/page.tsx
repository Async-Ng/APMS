"use client";

import { useRouter } from "next/navigation";
import { use } from "react";

import { ChatWorkspace } from "@/components/app/chat/ChatWorkspace";

interface PageProps {
  params: Promise<{ sessionId: string }>;
}

export default function ChatSessionPage({ params }: PageProps) {
  const { sessionId } = use(params);
  const router = useRouter();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ChatWorkspace
        sessionId={sessionId}
        onSessionCreated={(id) => router.push(`/chat/${id}`)}
        onNewChat={() => router.push("/chat")}
      />
    </div>
  );
}
