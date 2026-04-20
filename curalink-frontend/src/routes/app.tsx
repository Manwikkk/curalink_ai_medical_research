import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { AppTopBar } from "@/components/app/AppTopBar";
import { ConversationsSidebar } from "@/components/app/ConversationsSidebar";
import { ChatWindow } from "@/components/app/ChatWindow";
import { AnimatedBackdrop } from "@/components/AnimatedBackdrop";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "Workspace · Curalink" },
      {
        name: "description",
        content:
          "Curalink research workspace — query, upload reports, and explore publications, clinical trials, and cited sources.",
      },
    ],
  }),
  component: AppPage,
});

function AppPage() {
  const { user, loading, isGuest } = useAuth();
  const navigate = useNavigate();
  const [activeConversationId, setActiveConversationId] = useState<string | undefined>();
  const [sidebarRefresh, setSidebarRefresh] = useState(0);
  const [showLeftSidebar, setShowLeftSidebar] = useState(true);

  useEffect(() => {
    if (!loading && !user && !isGuest) {
      navigate({ to: "/signin" });
    }
  }, [user, loading, isGuest, navigate]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user && !isGuest) return null;

  function handleConversationCreated(id: string) {
    setActiveConversationId(id);
    setSidebarRefresh((n) => n + 1);
  }

  function handleNewSession() {
    setActiveConversationId(undefined);
  }

  return (
    <div className="relative flex h-screen flex-col overflow-hidden">
      <AnimatedBackdrop />

      {/* Guest banner */}
      {isGuest && (
        <div className="relative z-20 flex items-center justify-center gap-3 border-b border-primary/20 bg-primary/5 px-4 py-2 text-xs text-muted-foreground">
          <span>You're using Curalink as a guest — your history won't be saved.</span>
          <Link to="/signin" className="font-medium text-primary underline-offset-2 hover:underline">
            Sign in or create account →
          </Link>
        </div>
      )}

      <AppTopBar
        showLeftSidebar={showLeftSidebar}
        onToggleLeft={!isGuest ? () => setShowLeftSidebar((v) => !v) : undefined}
      />

      <div className="flex min-h-0 flex-1">
        {/* Left sidebar — conversations (authenticated users only) */}
        {!isGuest && showLeftSidebar && (
          <div className="hidden md:block">
            <ConversationsSidebar
              activeId={activeConversationId}
              onSelect={setActiveConversationId}
              onNew={handleNewSession}
              refreshTrigger={sidebarRefresh}
            />
          </div>
        )}

        {/* Chat — expands to fill remaining width */}
        <ChatWindow
          conversationId={activeConversationId}
          onConversationCreated={handleConversationCreated}
          isGuest={isGuest}
        />
      </div>
    </div>
  );
}
