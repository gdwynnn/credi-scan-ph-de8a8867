import { createFileRoute } from "@tanstack/react-router";
import { ChatView } from "@/components/ChatView";
import { ConversationSidebar } from "@/components/ConversationSidebar";

export const Route = createFileRoute("/c/$threadId")({ component: ThreadPage });

function ThreadPage() {
  const { threadId } = Route.useParams();
  return (
    <div className="flex">
      <ConversationSidebar />
      <div className="flex-1 min-w-0">
        <ChatView key={threadId} threadId={threadId} />
      </div>
    </div>
  );
}
