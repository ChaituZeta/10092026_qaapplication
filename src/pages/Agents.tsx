import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Sparkles, Plus, Trash2, Edit2, Loader2, Save, MessageSquare, Bot, Settings, Database, Code, Zap, CheckSquare } from "lucide-react";
import { AgentCard } from "../components/AgentCard";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { logAction } from "@/lib/logger";

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

const AVAILABLE_CAPABILITIES = [
  "Link Validation",
  "Grammar Checking", 
  "Visual Comparison",
  "UTM Tracking Check",
  "Campaign Setup",
  "Reporting & Analytics",
  "Web Search",
  "AMPscript Validation"
];

const AVAILABLE_MCP_SERVERS = [
  "Analytics MCP Server",
  "Salesforce MCP Server",
  "Media MCP Server",
  "Zeta Cloud MCP"
];

const AVAILABLE_MODELS = [
  "gemini-2.5-flash",
  "gpt-4o",
  "claude-3-5-sonnet"
];

export function Agents({ role }: { role: string }) {
  const isAdmin = role === "admin";
  const [teams, setTeams] = useState<any[]>([]);

  const [aiAgents, setAiAgents] = useState<AIAgent[]>([]);
  const [editingAgent, setEditingAgent] = useState<AIAgent | null>(null);
  const [aiSaveMsg, setAiSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const { id } = useParams();
  const navigate = useNavigate();

  const handleEditAgent = useCallback((agent: AIAgent | null) => {
    setEditingAgent(agent);
    if (agent) {
      navigate(`/agents/${agent.id}/edit`);
    } else {
      navigate(`/agents`);
    }
  }, [navigate]);

  // Sync from URL on load
  useEffect(() => {
    if (id && aiAgents.length > 0 && (!editingAgent || editingAgent.id !== id)) {
      const found = aiAgents.find(a => a.id === id);
      if (found) {
        setEditingAgent(found);
      } else if (id.startsWith('agent-') && !editingAgent) {
        // If it's a new agent that hasn't been saved yet, we navigate back
        // to avoid a broken state on page reload
        navigate(`/agents`);
      }
    } else if (!id && editingAgent) {
      setEditingAgent(null);
    }
  }, [aiAgents, id, editingAgent, navigate]);

  // For testing conversation starter input
  const [newStarter, setNewStarter] = useState("");

  // Chat Test State
  const [chatMessages, setChatMessages] = useState<{role: string, content: string}[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Available Models
  const [availableModels, setAvailableModels] = useState<{id: string, name: string}[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get("tab") as 'my-agents' | 'library') || (role === 'admin' ? 'my-agents' : 'library');
  const [activeTab, setActiveTabState] = useState<'my-agents' | 'library'>(initialTab);

  const setActiveTab = (tab: 'my-agents' | 'library') => {
    setActiveTabState(tab);
    setSearchParams(prev => {
      prev.set("tab", tab);
      return prev;
    }, { replace: true });
  };
  useEffect(() => {
    if (editingAgent) {
      setChatMessages([]);
      setChatInput("");
    }
  }, [editingAgent?.id]);

  const handleSendChatMessage = async (msgOverride?: string) => {
    const text = msgOverride || chatInput;
    if (!text.trim() || isChatLoading || !editingAgent) return;

    const newMsgs = [...chatMessages, { role: "user", content: text }];
    setChatMessages(newMsgs);
    if (!msgOverride) setChatInput("");
    setIsChatLoading(true);

    try {
      const res = await fetch("/api/agents/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMsgs,
          systemPrompt: editingAgent.rules || "",
          model: editingAgent.model
        })
      });

      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      
      const aiReply = data.choices?.[0]?.message?.content || "No response received.";
      setChatMessages([...newMsgs, { role: "assistant", content: aiReply }]);
    } catch (e) {
      setChatMessages([...newMsgs, { role: "assistant", content: "⚠️ Error connecting to API." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        if (isSupabaseConfigured()) {
          const { data: tData } = await supabase.from('teams').select('*').order('created_at', { ascending: true });
          if (tData) setTeams(tData);

          const { data: aData } = await supabase.from('ai_agents').select('*').order('created_at', { ascending: true });
          if (aData) {
            setAiAgents(aData);
          } else {
            // fallback if table empty or error
            const res = await fetch("/api/ai-agents");
            const data = await res.json();
            if (data.agents) setAiAgents(data.agents);
          }
        } else {
          const res = await fetch("/api/ai-agents");
          const data = await res.json();
          if (data.agents) setAiAgents(data.agents);
        }

        // Fetch models
        try {
          const modelsRes = await fetch("/api/models");
          if (modelsRes.ok) {
            const modelsData = await modelsRes.json();
            if (modelsData.data && Array.isArray(modelsData.data)) {
              setAvailableModels(modelsData.data.map((m: any) => ({
                id: m.id,
                name: m.name || m.id
              })));
            }
          }
        } catch (e) {
          console.warn("Failed to fetch available models", e);
        }
      } catch (e) {
        console.error("Failed to fetch data for Agents page", e);
      }
    };
    fetchInitialData();
  }, []);

  const saveAiAgentToDb = async (agent: AIAgent) => {
    try {
      if (!isSupabaseConfigured()) {
        throw new Error("Supabase is not configured.");
      }
      
      const { error } = await supabase.from('ai_agents').upsert({
        ...agent,
        updated_at: new Date().toISOString()
      });
      
      if (error) throw error;
      
      setAiSaveMsg({ type: 'success', text: 'AI Agent saved successfully!' });
      await logAction(isAdmin ? "admin@example.com" : "qa@example.com", "Update AI Agent", `Updated agent: ${agent.name}`);
      setTimeout(() => setAiSaveMsg(null), 3000);
      
      // Reload agents
      const { data } = await supabase.from('ai_agents').select('*').order('created_at', { ascending: true });
      if (data) setAiAgents(data);
      
    } catch (e) {
      setAiSaveMsg({ type: 'error', text: 'Failed to save AI Agent to database.' });
      setTimeout(() => setAiSaveMsg(null), 3000);
    }
  };

  const deleteAiAgentFromDb = async (agentId: string) => {
    try {
      const { error } = await supabase.from('ai_agents').delete().eq('id', agentId);
      if (error) throw error;
      setAiAgents(aiAgents.filter(a => a.id !== agentId));
      setAiSaveMsg({ type: 'success', text: 'Agent deleted.' });
      setTimeout(() => setAiSaveMsg(null), 3000);
    } catch (e) {
      setAiSaveMsg({ type: 'error', text: 'Failed to delete agent.' });
      setTimeout(() => setAiSaveMsg(null), 3000);
    }
  };

  const handleAddStarter = () => {
    if (newStarter.trim() && editingAgent) {
      setEditingAgent({
        ...editingAgent,
        conversation_starters: [...(editingAgent.conversation_starters || []), newStarter.trim()]
      });
      setNewStarter("");
    }
  };

  const handleRemoveStarter = (index: number) => {
    if (editingAgent) {
      const updated = [...(editingAgent.conversation_starters || [])];
      updated.splice(index, 1);
      setEditingAgent({ ...editingAgent, conversation_starters: updated });
    }
  };

  const toggleCapability = (cap: string) => {
    if (!editingAgent) return;
    const current = editingAgent.capabilities || [];
    if (current.includes(cap)) {
      setEditingAgent({ ...editingAgent, capabilities: current.filter(c => c !== cap) });
    } else {
      setEditingAgent({ ...editingAgent, capabilities: [...current, cap] });
    }
  };

  const toggleMCP = (mcp: string) => {
    if (!editingAgent) return;
    const current = editingAgent.mcp_servers || [];
    if (current.includes(mcp)) {
      setEditingAgent({ ...editingAgent, mcp_servers: current.filter(c => c !== mcp) });
    } else {
      setEditingAgent({ ...editingAgent, mcp_servers: [...current, mcp] });
    }
  };

  if (!isAdmin) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 bg-slate-50/50">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-slate-500 mb-6">You need administrator privileges to manage AI Agents.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden">
      <header className="bg-white border-b border-slate-200 px-8 py-5 shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            AI Studio
          </h1>
        </div>
        {!editingAgent && isAdmin && activeTab === 'my-agents' && (
          <button
            onClick={() => {
              const newAgent: AIAgent = { 
                id: `agent-${Date.now()}`, 
                name: "", 
                description: "",
                rules: "",
                is_default: aiAgents.length === 0,
                assigned_teams: [],
                model: availableModels[0]?.id || AVAILABLE_MODELS[0],
                welcome_message: "Hello! How can I assist you today?",
                conversation_starters: [],
                capabilities: [],
                mcp_servers: []
              };
              handleEditAgent(newAgent);
            }}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Create New Agent
          </button>
        )}
      </header>
      
      <div className="flex-1 overflow-hidden flex">
        {editingAgent ? (
          <div className="flex-1 flex overflow-hidden">
            {/* LEFT SIDE - CHAT PREVIEW */}
            <div className="w-[400px] border-r border-slate-200 bg-[#0f172a] flex flex-col shrink-0">
              <div className="p-4 border-b border-slate-800 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center shrink-0">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm">
                    {editingAgent.name || "Unnamed Agent"}
                  </h3>
                  <p className="text-slate-400 text-xs">
                    {editingAgent.model || "Default Model"}
                  </p>
                </div>
              </div>
              
              {/* Chat History */}
              <div className="flex-1 p-6 overflow-y-auto flex flex-col">
                {/* Agent Welcome Message */}
                <div className="flex gap-3 mb-6">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center shrink-0 mt-1">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-slate-800 rounded-2xl rounded-tl-sm p-4 text-slate-200 text-sm max-w-[85%]">
                    {editingAgent.welcome_message || "No welcome message set."}
                  </div>
                </div>

                {/* Chat Messages */}
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={`flex gap-3 mb-6 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                    {msg.role !== 'user' && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center shrink-0 mt-1">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <div className={`rounded-2xl p-4 text-sm max-w-[85%] whitespace-pre-wrap ${
                      msg.role === 'user' 
                        ? 'bg-fuchsia-600 text-white rounded-tr-sm' 
                        : 'bg-slate-800 text-slate-200 rounded-tl-sm'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ))}

                {isChatLoading && (
                  <div className="flex gap-3 mb-6">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center shrink-0 mt-1">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-slate-800 rounded-2xl rounded-tl-sm px-4 py-3 text-slate-200 text-sm max-w-[85%] flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-fuchsia-400" />
                      <span className="text-slate-400">Agent is typing...</span>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area (Sticky Bottom) */}
              <div className="bg-[#0f172a] border-t border-slate-800 p-4 shrink-0">
                {/* Conversation Starters (moved above input) */}
                {editingAgent.conversation_starters && editingAgent.conversation_starters.length > 0 && chatMessages.length === 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {editingAgent.conversation_starters.map((starter, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => handleSendChatMessage(starter)}
                        className="bg-transparent border border-fuchsia-500/30 text-fuchsia-400 hover:bg-fuchsia-500/10 px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-colors"
                      >
                        {starter}
                      </div>
                    ))}
                  </div>
                )}

                {/* Real Input */}
                <div className="bg-slate-900 rounded-xl border border-slate-700 p-1 flex items-center focus-within:border-fuchsia-500 transition-colors">
                  <input 
                    type="text" 
                    placeholder="Test this agent..." 
                    className="bg-transparent text-slate-300 text-sm px-3 py-2 w-full outline-none"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSendChatMessage(); }}
                    disabled={isChatLoading}
                  />
                  <button 
                    onClick={() => handleSendChatMessage()}
                    className={`p-2 rounded-lg text-white shrink-0 mr-1 transition-colors ${
                      chatInput.trim() && !isChatLoading ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-slate-700 cursor-not-allowed'
                    }`}
                    disabled={!chatInput.trim() || isChatLoading}
                  >
                    <Sparkles className="w-4 h-4" />
                  </button>
                </div>
                
                <p className="text-center text-slate-500 text-[10px] mt-3">Test Mode - Connects to Omniroute API</p>
              </div>
            </div>

            {/* RIGHT SIDE - CONFIGURATION */}
            <div className="flex-1 overflow-y-auto p-8 bg-white">
              <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Configuration</h2>
                    <p className="text-sm text-slate-500">Configure your agent's identity, behavior, and capabilities.</p>
                  </div>
                  <div className="flex items-center gap-3">
                     <button
                        onClick={() => handleEditAgent(null)}
                        className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          let newAgents = [...aiAgents];
                          if (editingAgent.is_default) {
                             newAgents = newAgents.map(a => ({ ...a, is_default: false }));
                             // If another was default, we should ideally upsert it to false in DB too.
                             // For now, let's just save the current one. The user may need to resave the other one.
                          }
                          const existingIndex = newAgents.findIndex(a => a.id === editingAgent.id);
                          if (existingIndex >= 0) newAgents[existingIndex] = editingAgent;
                          else newAgents.push(editingAgent);
                          
                          setAiAgents(newAgents); // Optimistic UI update
                          saveAiAgentToDb(editingAgent);
                          handleEditAgent(null);
                        }}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm"
                      >
                        <Save className="w-4 h-4" /> Save Agent
                      </button>
                  </div>
                </div>

                <div className="space-y-8">
                  {/* Section 1: Basic Info */}
                  <section className="bg-slate-50 rounded-xl p-6 border border-slate-200 space-y-5">
                    <div className="flex items-center gap-2 mb-2 text-slate-800 font-semibold border-b border-slate-200 pb-2">
                      <Settings className="w-5 h-5 text-indigo-500" />
                      <h3>Identity & Model</h3>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700">Agent Name <span className="text-rose-500">*</span></label>
                        <input
                          type="text"
                          value={editingAgent.name}
                          onChange={(e) => setEditingAgent({ ...editingAgent, name: e.target.value })}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white"
                          placeholder="e.g. Media Campaigns Operations"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700">Model</label>
                        <select
                          value={editingAgent.model || (availableModels.length > 0 ? availableModels[0].id : AVAILABLE_MODELS[0])}
                          onChange={(e) => setEditingAgent({ ...editingAgent, model: e.target.value })}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white"
                        >
                          {availableModels.length > 0 
                            ? availableModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)
                            : AVAILABLE_MODELS.map(m => <option key={m} value={m}>{m}</option>)
                          }
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">Description</label>
                      <input
                        type="text"
                        value={editingAgent.description}
                        onChange={(e) => setEditingAgent({ ...editingAgent, description: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white"
                        placeholder="Brief summary of this agent's purpose..."
                      />
                    </div>
                  </section>

                  {/* Section 2: Instructions */}
                  <section className="bg-slate-50 rounded-xl p-6 border border-slate-200 space-y-5">
                    <div className="flex items-center gap-2 mb-2 text-slate-800 font-semibold border-b border-slate-200 pb-2">
                      <Code className="w-5 h-5 text-indigo-500" />
                      <h3>Instructions & Prompt</h3>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">System Instructions (Rules) <span className="text-rose-500">*</span></label>
                      <p className="text-xs text-slate-500">Define exactly how this agent should behave, format its answers, and utilize tools.</p>
                      <textarea
                        className="w-full min-h-[200px] rounded-lg border border-slate-300 p-4 text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white leading-relaxed"
                        placeholder="TOOL ROUTE1 (exact match = entity level):... \nCampaign: 'Why did it highlight this copy'..."
                        value={editingAgent.rules}
                        onChange={(e) => setEditingAgent({ ...editingAgent, rules: e.target.value })}
                      />
                    </div>
                  </section>

                  {/* Section 3: UX */}
                  <section className="bg-slate-50 rounded-xl p-6 border border-slate-200 space-y-5">
                    <div className="flex items-center gap-2 mb-2 text-slate-800 font-semibold border-b border-slate-200 pb-2">
                      <MessageSquare className="w-5 h-5 text-indigo-500" />
                      <h3>User Experience</h3>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">Welcome Message</label>
                      <input
                        type="text"
                        value={editingAgent.welcome_message || ""}
                        onChange={(e) => setEditingAgent({ ...editingAgent, welcome_message: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white"
                        placeholder="Hello! I'm here to help you get setup..."
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-slate-700">Conversation Starters</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newStarter}
                          onChange={(e) => setNewStarter(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddStarter(); } }}
                          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white"
                          placeholder="e.g. Can you update the audience targeting for my campaign?"
                        />
                        <button 
                          onClick={handleAddStarter}
                          className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-sm font-semibold transition-colors"
                        >
                          Add
                        </button>
                      </div>
                      
                      {editingAgent.conversation_starters && editingAgent.conversation_starters.length > 0 && (
                        <div className="flex flex-col gap-2 bg-white border border-slate-200 rounded-lg p-3">
                          {editingAgent.conversation_starters.map((starter, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-slate-50 border border-slate-100 px-3 py-2 rounded-md">
                              <span className="text-sm text-slate-700 truncate">{starter}</span>
                              <button onClick={() => handleRemoveStarter(idx)} className="text-slate-400 hover:text-rose-500 p-1">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </section>

                  {/* Section 4: Capabilities */}
                  <section className="bg-slate-50 rounded-xl p-6 border border-slate-200 space-y-5">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <div className="flex items-center gap-2 text-slate-800 font-semibold">
                        <Zap className="w-5 h-5 text-indigo-500" />
                        <h3>Capabilities & Tools</h3>
                      </div>
                      <button className="text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-full transition-colors flex items-center gap-1">
                        <Plus className="w-3 h-3" /> Custom Action
                      </button>
                    </div>
                    
                    <div>
                      <p className="text-sm text-slate-600 mb-4">Select the internal platform capabilities available to this Agent.</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {AVAILABLE_CAPABILITIES.map(cap => (
                          <label key={cap} className={cn(
                            "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                            editingAgent.capabilities?.includes(cap) ? "border-indigo-500 bg-indigo-50/50" : "border-slate-200 bg-white hover:border-slate-300"
                          )}>
                            <input
                              type="checkbox"
                              checked={editingAgent.capabilities?.includes(cap) || false}
                              onChange={() => toggleCapability(cap)}
                              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                            />
                            <span className="text-sm font-medium text-slate-700">{cap}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-slate-200">
                      <div className="flex items-center gap-2 mb-4">
                        <Database className="w-4 h-4 text-slate-500" />
                        <h4 className="font-semibold text-slate-800">Zeta Certified MCP Servers</h4>
                      </div>
                      <p className="text-sm text-slate-600 mb-4">Select MCP servers to enable external capabilities and data integrations.</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {AVAILABLE_MCP_SERVERS.map(mcp => (
                          <label key={mcp} className={cn(
                            "flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all",
                            editingAgent.mcp_servers?.includes(mcp) ? "border-fuchsia-500 bg-fuchsia-50/50" : "border-slate-200 bg-white hover:border-slate-300"
                          )}>
                            <input
                              type="checkbox"
                              checked={editingAgent.mcp_servers?.includes(mcp) || false}
                              onChange={() => toggleMCP(mcp)}
                              className="w-4 h-4 rounded text-fuchsia-600 focus:ring-fuchsia-500 border-slate-300"
                            />
                            <span className="text-sm font-medium text-slate-700">{mcp}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </section>

                  {/* Section 5: Access Control */}
                  <section className="bg-slate-50 rounded-xl p-6 border border-slate-200 space-y-5">
                    <div className="flex items-center gap-2 mb-2 text-slate-800 font-semibold border-b border-slate-200 pb-2">
                      <CheckSquare className="w-5 h-5 text-indigo-500" />
                      <h3>Access Control</h3>
                    </div>
                    
                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-slate-700">Assigned Teams (Read Permissions)</label>
                      <p className="text-xs text-slate-500 mb-2">Select which teams can interact with this agent. Leave blank for Global access.</p>
                      <div className="flex flex-wrap gap-2">
                        {teams.map(t => {
                          const isSelected = editingAgent.assigned_teams?.includes(t.name);
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => {
                                const current = editingAgent.assigned_teams || [];
                                if (isSelected) {
                                  setEditingAgent({ ...editingAgent, assigned_teams: current.filter(name => name !== t.name) });
                                } else {
                                  setEditingAgent({ ...editingAgent, assigned_teams: [...current, t.name] });
                                }
                              }}
                              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                                isSelected 
                                  ? 'bg-slate-800 text-white border-slate-800' 
                                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                              }`}
                            >
                              {t.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 pt-4 border-t border-slate-200 mt-4">
                       <input
                         type="checkbox"
                         id="is-default-agent"
                         checked={editingAgent.is_default}
                         onChange={(e) => setEditingAgent({ ...editingAgent, is_default: e.target.checked })}
                         className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                       />
                       <label htmlFor="is-default-agent" className="text-sm font-medium text-slate-700 cursor-pointer">
                         Set as Default Platform Agent
                       </label>
                    </div>
                  </section>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto flex flex-col bg-slate-50">
            {/* Banner */}
            <div className="bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white px-8 py-12 shrink-0">
              <div className="max-w-6xl mx-auto">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 border border-white/30 text-xs font-semibold mb-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-fuchsia-300" />
                  Zeta Verified
                </div>
                <h2 className="text-4xl font-bold mb-3">Automate. Optimize. Achieve.</h2>
                <p className="text-white/80 max-w-2xl text-sm leading-relaxed">
                  Create or upload models and agents to automate your workflow. Simplify tasks, make data-driven decisions, and reach goals faster with intelligent automation.
                </p>
              </div>
            </div>

            <div className="px-8 py-4 border-b border-slate-200 bg-white sticky top-0 z-10">
              <div className="max-w-6xl mx-auto flex items-center gap-2">
                {isAdmin && (
                  <button 
                    onClick={() => setActiveTab('my-agents')}
                    className={`px-4 py-1.5 rounded-full text-sm font-semibold border ${activeTab === 'my-agents' ? 'bg-slate-100 text-indigo-600 border-slate-200 shadow-sm' : 'text-slate-600 hover:bg-slate-50 border-transparent'}`}
                  >
                    My Agents <span className={`ml-1 px-1.5 py-0.5 rounded-md text-[10px] ${activeTab === 'my-agents' ? 'bg-white text-slate-500' : 'bg-slate-100 text-slate-500'}`}>{aiAgents.length}</span>
                  </button>
                )}
                <button 
                  onClick={() => setActiveTab('library')}
                  className={`px-4 py-1.5 rounded-full text-sm font-semibold border ${activeTab === 'library' ? 'bg-slate-100 text-indigo-600 border-slate-200 shadow-sm' : 'text-slate-600 hover:bg-slate-50 border-transparent'}`}
                >
                  Library <span className={`ml-1 px-1.5 py-0.5 rounded-md text-[10px] ${activeTab === 'library' ? 'bg-white text-slate-500' : 'bg-slate-100 text-slate-500'}`}>{aiAgents.length}</span>
                </button>
              </div>
            </div>

            <div className="max-w-6xl mx-auto p-8 w-full">
              {aiSaveMsg && (
                <div className={cn(
                  "mb-6 p-4 rounded-xl text-sm font-medium flex items-center gap-3",
                  aiSaveMsg.type === 'success' ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-rose-50 text-rose-800 border border-rose-200"
                )}>
                  {aiSaveMsg.type === 'success' ? <Save className="w-5 h-5" /> : <Trash2 className="w-5 h-5" />}
                  {aiSaveMsg.text}
                </div>
              )}

              {activeTab === 'library' && (
                <>
                  <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                    Whether you're looking for automation, data analysis, or intelligent assistance, our curated selection offers tailored solutions to meet your specific needs. Browse through our offerings to find the perfect AI agent to elevate your work and drive smarter outcomes.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {aiAgents.map(agent => (
                      <AgentCard 
                        key={agent.id}
                        agent={agent}
                        variant="library"
                        onTryItNow={(id) => navigate(`/agents/${id}/chat`)}
                      />
                    ))}
                    {aiAgents.length === 0 && (
                      <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-white">
                        <Sparkles className="w-10 h-10 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-slate-700 mb-1">No Agents Found</h3>
                        <p className="text-slate-500 font-medium">There are currently no verified agents in the Library.</p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {activeTab === 'my-agents' && isAdmin && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {aiAgents.map(agent => (
                    <div key={agent.id} className={cn(
                      "border rounded-2xl p-6 transition-all hover:shadow-md flex flex-col h-full",
                      agent.is_default ? "border-indigo-300 bg-indigo-50/30" : "border-slate-200 bg-white"
                    )}>
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center shrink-0 shadow-inner">
                          <Bot className="w-6 h-6 text-white" />
                        </div>
                        {agent.is_default && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">
                            DEFAULT
                          </span>
                        )}
                      </div>
                      
                      <h4 className="text-lg font-bold text-slate-900 mb-1 line-clamp-1">{agent.name}</h4>
                      <p className="text-sm text-slate-500 mb-4 line-clamp-2 min-h-[40px]">{agent.description}</p>
                      
                      <div className="space-y-3 mb-6 flex-1">
                        {agent.model && (
                           <div className="flex items-center gap-2 text-xs font-medium text-slate-600 bg-slate-100 w-fit px-2 py-1 rounded">
                             <Settings className="w-3.5 h-3.5" />
                             {agent.model}
                           </div>
                        )}
                        {agent.assigned_teams && agent.assigned_teams.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {agent.assigned_teams.map(t => (
                              <span key={t} className="px-2 py-1 bg-slate-800 text-white rounded-md text-[10px] font-semibold">
                                {t}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <div>
                            <span className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded-md text-[10px] font-semibold border border-emerald-200">
                              GLOBAL AGENT
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-2 pt-4 border-t border-slate-100">
                        <button
                          onClick={() => handleEditAgent(agent)}
                          className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                        >
                          <Edit2 className="w-4 h-4" /> Configure
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete ${agent.name}?`)) {
                              deleteAiAgentFromDb(agent.id);
                            }
                          }}
                          className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {aiAgents.length === 0 && (
                    <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-white">
                      <Sparkles className="w-10 h-10 text-slate-300 mx-auto mb-4" />
                      <h3 className="text-lg font-bold text-slate-700 mb-1">No Agents Found</h3>
                      <p className="text-slate-500 font-medium">Get started by creating your first specialized AI Agent.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
