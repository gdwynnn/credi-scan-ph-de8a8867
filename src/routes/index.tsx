import { createFileRoute } from "@tanstack/react-router";
import { ChatView } from "@/components/ChatView";
import { ConversationSidebar } from "@/components/ConversationSidebar";

export const Route = createFileRoute("/")({ component: HomePage });

function HomePage() {
  return (
    <div className="flex">
      <ConversationSidebar />
      <div className="flex-1 min-w-0">
        <ChatView threadId={null} />
      </div>
    </div>
  );
}
