import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Bot,
  User,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  Code2,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  TrendingDown,
  DollarSign,
  HelpCircle,
  RotateCcw,
} from 'lucide-react';
import {
  answerFinancialQuery,
  AnalystToolContext,
  VerificationResult,
} from '../services/analyst';
import {
  Transaction,
  Classification,
  EffectiveTransaction,
  AccountingConventions,
  AuditCorrection,
} from '../types/accounting';

export interface Message {
  id: string;
  sender: 'user' | 'analyst';
  text: string;
  toolExecutions?: Array<{ toolName: string; args: any; result: any }>;
  verification?: VerificationResult;
  source?: string;
  timestamp: string;
}

interface AnalystChatViewProps {
  transactions: EffectiveTransaction[];
  classifications: Map<string, Classification>;
  conventions: AccountingConventions;
  auditHistory: AuditCorrection[];
  messages?: Message[];
  setMessages?: React.Dispatch<React.SetStateAction<Message[]>>;
}

export const AnalystChatView: React.FC<AnalystChatViewProps> = ({
  transactions,
  classifications,
  conventions,
  auditHistory,
  messages: externalMessages,
  setMessages: externalSetMessages,
}) => {
  const [internalMessages, setInternalMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'analyst',
      text: "Hello! I am your AI Financial Analyst. I have verified access to your restaurant's Q1 2026 general ledger, automated classification rules, and audit trail.\n\nAsk me about revenue trends, margin contraction, specific bank transactions, calendar normalization, or balance sheet reclassifications. All figures in my answers are deterministically verified against the ledger.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const messages = externalMessages || internalMessages;
  const setMessages = externalSetMessages || setInternalMessages;

  const handleResetChat = () => {
    setMessages([
      {
        id: 'welcome',
        sender: 'analyst',
        text: "Hello! I am your AI Financial Analyst. I have verified access to your restaurant's Q1 2026 general ledger, automated classification rules, and audit trail.\n\nAsk me about revenue trends, margin contraction, specific bank transactions, calendar normalization, or balance sheet reclassifications. All figures in my answers are deterministically verified against the ledger.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedTools, setExpandedTools] = useState<{ [msgId: string]: boolean }>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const quickPrompts = [
    'Why did operating profit decline in February compared to January?',
    'Investigate catering food purchase T1179 ($6,200) from Sysco',
    'Explain sales tax remittance T1062 and Florida payee risk',
    'What was our food cost percentage and total COGS in January?',
    'What was the oven purchase T1061 and why is it excluded from P&L?',
    'Tell me about the annual license renewal T1181 and prepaid option',
  ];

  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || input;
    if (!textToSend.trim() || loading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInput('');
    setLoading(true);

    try {
      const context: AnalystToolContext = {
        transactions,
        classifications,
        effectiveTransactions: transactions,
        conventions,
        auditHistory,
      };

      const result = await answerFinancialQuery(textToSend, context);

      const analystMsg: Message = {
        id: `analyst-${Date.now()}`,
        sender: 'analyst',
        text: result.answer,
        toolExecutions: result.toolExecutions,
        verification: result.verification,
        source: result.source,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, analystMsg]);
    } catch (err: any) {
      const errorMsg: Message = {
        id: `err-${Date.now()}`,
        sender: 'analyst',
        text: `Error analyzing financial data: ${err?.message || 'Tool call failure'}. Please verify query parameters.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const toggleTools = (msgId: string) => {
    setExpandedTools((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 h-[calc(100vh-140px)] flex flex-col">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            AI Financial Analyst
            <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              Deterministic Tool Grounding
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Hallucination guardrail active: all monetary figures are strictly verified against ledger queries.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleResetChat}
            title="Reset conversation history"
            className="flex items-center gap-1 px-2.5 py-1 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Chat</span>
          </button>
          <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-300 font-semibold bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800/40">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Zero Hallucination Guardrail</span>
          </div>
        </div>
      </div>

      {/* Quick Prompts Bar */}
      <div className="py-2.5 overflow-x-auto flex gap-2 shrink-0 border-b border-slate-200 dark:border-slate-800/60">
        {quickPrompts.map((prompt, i) => (
          <button
            key={i}
            onClick={() => handleSend(prompt)}
            className="text-xs bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 hover:text-indigo-700 dark:text-slate-300 dark:hover:text-white px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 whitespace-nowrap transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>{prompt}</span>
          </button>
        ))}
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex items-start gap-3 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {m.sender === 'analyst' && (
              <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/40 flex items-center justify-center shrink-0 mt-0.5 text-indigo-600 dark:text-indigo-400">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div
              className={`max-w-2xl rounded-2xl p-4 text-xs space-y-2.5 shadow-xs ${
                m.sender === 'user'
                  ? 'bg-indigo-600 text-white shadow-indigo-500/10'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200'
              }`}
            >
              <div className="leading-relaxed whitespace-pre-wrap font-sans text-[13px]">
                {m.text}
              </div>

              {/* Tool Execution Drawer */}
              {m.toolExecutions && m.toolExecutions.length > 0 && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  <button
                    onClick={() => toggleTools(m.id)}
                    className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-mono text-[11px] transition-colors cursor-pointer"
                  >
                    {expandedTools[m.id] ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5" />
                    )}
                    <Code2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>
                      Executed {m.toolExecutions.length} Deterministic Tool(s)
                    </span>
                  </button>

                  {expandedTools[m.id] && (
                    <div className="mt-2 space-y-2 p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px] font-mono">
                      {m.toolExecutions.map((exec, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="text-indigo-600 dark:text-indigo-400 font-bold">
                            &gt; {exec.toolName}({JSON.stringify(exec.args)})
                          </div>
                          <pre className="text-slate-600 dark:text-slate-400 max-h-40 overflow-y-auto p-2 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 text-[10px] whitespace-pre-wrap">
                            {JSON.stringify(exec.result, null, 2)}
                          </pre>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Verification Audit Footer */}
              {m.verification && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    {m.verification.passed ? (
                      <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        All figures verified against ledger tools
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400 font-semibold">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        Unverified figures flagged
                      </span>
                    )}
                  </div>
                  <span className="text-slate-400 dark:text-slate-500 font-mono">{m.timestamp}</span>
                </div>
              )}
            </div>

            {m.sender === 'user' && (
              <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-slate-800 border border-indigo-200 dark:border-slate-700 flex items-center justify-center shrink-0 mt-0.5 text-indigo-700 dark:text-slate-300">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/40 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-indigo-600 dark:text-indigo-400 animate-pulse" />
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-xl text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2 shadow-xs">
              <span className="inline-block w-2 h-2 rounded-full bg-indigo-600 animate-ping" />
              <span>Querying deterministic financial tools & verifying numbers...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="pt-3 border-t border-slate-200 dark:border-slate-800 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a financial question (e.g. 'Why did operating profit drop in Feb?' or 'Inspect T1062')..."
            className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-medium shadow-2xs"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <span>Analyze</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
