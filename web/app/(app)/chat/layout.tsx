/**
 * Chat routes use dynamic viewport height so the composer stays visible
 * when the mobile keyboard opens.
 */
export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden">
      {children}
    </div>
  );
}
