import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Bot, Sparkles, Loader2, ArrowLeft, MoreHorizontal, FileText, LayoutGrid, Network, UploadCloud, FolderTree } from "lucide-react";

type AIAgent = { 
  id: string; 
  name: string; 
  description: string; 
  rules: string; 
  is_default: boolean; 
  assigned_teams?: string[];
  model?: string;
  welcome_message?: string;
  conversation_starters?: string[];
  capabilities?: string[];
  mcp_servers?: string[];
};

export function AgentChat({ role }: { role: string }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [agent, setAgent] = useState<AIAgent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchAgent = async () => {
      try {
        const res = await fetch("/api/ai-agents");
        if (res.ok) {
          const data = await res.json();
          const agents: AIAgent[] = data.agents || [];
          const found = agents.find(a => a.id === id);
          if (found) {
            setAgent(found);
            if (found.welcome_message) {
              setChatMessages([{ role: 'assistant', content: found.welcome_message }]);
            }
          } else {
            navigate("/agents");
          }
        }
      } catch (e) {
        console.error("Failed to fetch agent", e);
      } finally {
        setIsLoading(false);
      }
    };
    if (id) fetchAgent();
  }, [id, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isChatLoading]);

  const handleSendChatMessage = async (presetText?: string) => {
    const textToSend = presetText || chatInput;
    if (!textToSend.trim() || !agent || isChatLoading) return;

    const newMessages = [...chatMessages, { role: 'user' as const, content: textToSend }];
    setChatMessages(newMessages);
    setChatInput("");
    setIsChatLoading(true);

    try {
      const res = await fetch("/api/agents/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: agent.id,
          model: agent.model || "gemini-2.5-flash",
          messages: newMessages,
          systemPrompt: agent.rules || ""
        })
      });

      if (res.ok) {
        const data = await res.json();
        const aiMsg = data.choices?.[0]?.message?.content || "Sorry, I could not generate a response.";
        setChatMessages([...newMessages, { role: 'assistant', content: aiMsg }]);
      } else {
        setChatMessages([...newMessages, { role: 'assistant', content: "Error communicating with AI API." }]);
      }
    } catch (e) {
      setChatMessages([...newMessages, { role: 'assistant', content: "Network error communicating with AI API." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!agent) {
    return null;
  }

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/agents')}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold text-slate-900">{agent.name || "Agent"}</h2>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
            <MoreHorizontal className="w-5 h-5" />
          </button>
          <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors">
            Copy
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANEL: Chat Interface */}
        <div className="w-[400px] border-r border-slate-200 bg-white flex flex-col shrink-0">
          <div className="flex-1 overflow-y-auto p-6 flex flex-col">
            {/* Chat History */}
            {chatMessages.map((msg, idx) => (
              <div key={idx} className={`flex gap-3 mb-6 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                {msg.role !== 'user' && (
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-1 border border-slate-200">
                    <Bot className="w-4 h-4 text-slate-500" />
                  </div>
                )}
                <div className={`rounded-2xl p-4 text-sm max-w-[85%] leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-slate-100 text-slate-800 rounded-tr-sm' 
                    : 'bg-slate-100 text-slate-800 rounded-tl-sm'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}

            {isChatLoading && (
              <div className="flex gap-3 mb-6">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-1 border border-slate-200">
                  <Bot className="w-4 h-4 text-slate-500" />
                </div>
                <div className="bg-slate-100 rounded-2xl rounded-tl-sm px-4 py-3 text-slate-500 text-sm max-w-[85%] flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Agent is typing...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-6 shrink-0 bg-white">
            <div className="bg-white rounded-xl border border-slate-200 p-1 flex items-center shadow-sm focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all">
              <input 
                type="text" 
                placeholder={`Message ${agent.name}...`} 
                className="bg-transparent text-slate-700 text-sm px-4 py-3 w-full outline-none"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSendChatMessage(); }}
                disabled={isChatLoading}
              />
              <button 
                onClick={() => handleSendChatMessage()}
                className={`p-2 rounded-lg text-slate-400 shrink-0 mr-1 transition-colors hover:bg-slate-100 hover:text-slate-600`}
                disabled={!chatInput.trim() || isChatLoading}
              >
                <Sparkles className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: Documentation (Static Mockup per Screenshot) */}
        <div className="flex-1 overflow-y-auto bg-slate-50">
          <div className="max-w-3xl mx-auto p-12 bg-white min-h-full border-x border-slate-100 shadow-sm">
            
            {/* Hero Image Placeholder */}
            <div className="w-full h-64 bg-slate-900 rounded-xl mb-8 overflow-hidden relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 to-slate-900 opacity-90"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-cyan-400 rounded-2xl rotate-45 flex items-center justify-center shadow-2xl">
                  <div className="w-12 h-12 bg-white rounded-xl -rotate-45 shadow-inner"></div>
                </div>
              </div>
            </div>

            {/* Breadcrumbs */}
            <div className="flex items-center gap-2 text-xs font-medium text-indigo-500 mb-6">
              <span>🏠</span>
              <span>/</span>
              <span className="hover:underline cursor-pointer">Introduction</span>
              <span>/</span>
              <span>...</span>
              <span>/</span>
              <span className="hover:underline cursor-pointer">Features & Functions</span>
            </div>

            {/* Intro Content */}
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Introduction</h1>
            <p className="text-slate-500 text-sm mb-8">Generic {agent.name} for MCP tools</p>

            <h2 className="text-xl font-bold text-slate-900 mb-6">Best Practices</h2>
            
            <h3 className="text-lg font-bold text-slate-800 mb-3">How to Use</h3>
            <p className="text-slate-600 text-sm leading-relaxed mb-8">
              Welcome to the {agent.name}! This assistant is designed to help you efficiently manage your
              content marketing assets within the Zeta Marketing Platform. Whether you're looking to search and organize
              HTML or Beefree snippets, import media assets, or create and update marketing templates and resource groups,
              simply ask your question or state your request, and I'll guide you through the process to achieve your marketing
              goals seamlessly.
            </p>

            {/* Chat UI Screenshot Placeholder inside Docs */}
            <div className="bg-slate-900 rounded-xl p-6 shadow-xl mb-10 w-full max-w-2xl mx-auto relative overflow-hidden">
               <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-full bg-slate-700"></div>
                     <div className="bg-slate-800 h-10 w-64 rounded-xl"></div>
                  </div>
                  <div className="flex items-center justify-end gap-3">
                     <div className="bg-indigo-600 h-10 w-72 rounded-xl"></div>
                     <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center"><Bot className="w-4 h-4 text-white"/></div>
                  </div>
                  <div className="mt-4 bg-slate-800 rounded-lg p-3 flex items-center justify-between border border-slate-700">
                     <div className="text-slate-500 text-xs">I need to find and list all the media assets tagged with "summer sale"...</div>
                     <div className="flex gap-2 text-slate-400">
                       <Sparkles className="w-4 h-4" />
                     </div>
                  </div>
               </div>
            </div>

            <h3 className="text-lg font-bold text-slate-800 mb-4">Features & Functions</h3>
            <p className="text-slate-600 text-sm leading-relaxed mb-6">
              Welcome to the "Features & Functions" section, where we delve into the powerful capabilities of our Generic
              {agent.name} designed specifically for MCP tools. This innovative assistant streamlines your
              content marketing efforts, enhancing your workflow and boosting productivity by offering a suite of tailored
              features that simplify planning, execution, and analysis.
            </p>

            <h4 className="font-bold text-slate-800 text-sm mb-3">Key Features:</h4>
            <ul className="list-disc pl-5 space-y-2 text-sm text-slate-600 mb-8 marker:text-slate-400">
              <li><strong className="text-slate-700 font-semibold">Snippet Management</strong> - Create, update, and archive reusable HTML/Beefree snippets efficiently</li>
              <li><strong className="text-slate-700 font-semibold">Media Asset Importing</strong> - Easily import media assets from remote URLs for quick access</li>
              <li><strong className="text-slate-700 font-semibold">Resource Group Organization</strong> - Create and manage filters for saved content resources</li>
              <li><strong className="text-slate-700 font-semibold">Marketing Template Control</strong> - Manage, update, and archive various marketing templates seamlessly</li>
              <li><strong className="text-slate-700 font-semibold">Feed and Feed Item Handling</strong> - Create and manage feeds and their associated items effectively</li>
            </ul>

            <h4 className="font-bold text-slate-800 text-sm mb-3">Core Functions:</h4>
            <ul className="list-disc pl-5 space-y-2 text-sm text-slate-600 mb-12 marker:text-slate-400">
              <li>Search and list snippets by keyword, exact name, tags, status, editor, creator/updater, or created/updated date</li>
              <li>Create an HTML or Beefree snippet from user-supplied content</li>
              <li>Update an existing snippet's name, configuration, description, status, or editor</li>
              <li>Archive or reactivate a snippet by updating its status</li>
              <li>List existing media assets and folders or search them using various filters</li>
              <li>Import a media asset from a remote HTTP(S) URL for quick access</li>
              <li>Create and manage Resource Groups to filter saved content resources</li>
              <li>Preview, count, and filter matching resources before creating or updating a Resource Group</li>
            </ul>

          </div>
        </div>
      </div>
    </div>
  );
}
