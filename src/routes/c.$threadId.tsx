import { createFileRoute } from "@tanstack/react-router";
import { ChatView } from "@/components/ChatView";
import { ConversationSidebar } from "@/components/ConversationSidebar";

export const Route = createFileRoute("/c/$threadId")({
  head: () => ({
    meta: [
      { title: "Your Investigation — SURI" },
      { name: "description", content: "Continue a saved SURI investigation and review the claim, evidence, and credibility findings." },
      { property: "og:title", content: "Your Investigation — SURI" },
      { property: "og:description", content: "Continue your evidence-guided news investigation with SURI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ThreadPage,
});

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
