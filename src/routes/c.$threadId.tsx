import { createFileRoute } from "@tanstack/react-router";
import { ChatView } from "@/components/ChatView";
import { ConversationSidebar } from "@/components/ConversationSidebar";

export const Route = createFileRoute("/c/$threadId")({
  head: () => ({
    meta: [
      { title: "Your Investigation — CrediScan" },
      { name: "description", content: "Continue a saved CrediScan investigation and review the claim, evidence, and credibility findings." },
      { property: "og:title", content: "Your Investigation — CrediScan" },
      { property: "og:description", content: "Continue your evidence-guided news investigation with CrediScan." },
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
