import { createFileRoute } from "@tanstack/react-router";
import { ChatView } from "@/components/ChatView";
import { ConversationSidebar } from "@/components/ConversationSidebar";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Investigate a Claim — SURI" },
      { name: "description", content: "Check news, posts, and rumors with SURI's evidence-guided research assistant, focused on the Philippines and available worldwide." },
      { property: "og:title", content: "Investigate a Claim — SURI" },
      { property: "og:description", content: "Investigate claims with live sources and a hybrid content and source credibility scorecard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HomePage,
});

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
