import React, { useState, useEffect, useRef } from 'react';
import { Bot, User, Send, Sparkles, Users } from 'lucide-react';

export const ChatPanel = ({ socket, roomId, userId, userName }) => {
  const [activeTab, setActiveTab] = useState('group'); // group, ai
  const [aiMessages, setAiMessages] = useState([]); // Array of { id, text, sender, isBot, isStreaming }
  const [groupMessages, setGroupMessages] = useState([]); // Array of { id, text, senderId, senderName, timestamp }
  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const chatBottomRef = useRef(null);

  // Scroll to bottom whenever messages list, thinking status, or active tab changes
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiMessages, groupMessages, isThinking, activeTab]);

  useEffect(() => {
    if (!socket) return;

    // 1. Listen for standard User-to-User group messages
    socket.on('chat:message', (payload) => {
      setGroupMessages((prev) => [...prev, payload]);
    });

    // 2. Listen when a new AI answer starts streaming
    socket.on('chat:response:start', ({ userId: senderId, userName: senderName, message, answerId }) => {
      setAiMessages((prev) => {
        // Prevent duplicate user questions from showing up for the sender
        if (senderId === userId && prev.some(m => m.text === message && m.sender === senderName)) {
          return [
            ...prev,
            {
              id: answerId,
              text: '',
              sender: 'MeetMind AI',
              isBot: true,
              isStreaming: true
            }
          ];
        }
        
        return [
          ...prev,
          {
            id: `usr-${Date.now()}`,
            text: message,
            sender: senderName,
            isBot: false,
            isStreaming: false
          },
          {
            id: answerId,
            text: '',
            sender: 'MeetMind AI',
            isBot: true,
            isStreaming: true
          }
        ];
      });
      setIsThinking(true);
    });

    // 3. Listen to token stream chunks
    socket.on('chat:token', ({ token, done, answerId }) => {
      setIsThinking(false);
      setAiMessages((prev) =>
        prev.map((msg) => {
          if (msg.id === answerId) {
            return {
              ...msg,
              text: msg.text + token,
              isStreaming: !done
            };
          }
          return msg;
        })
      );
    });

    return () => {
      socket.off('chat:message');
      socket.off('chat:response:start');
      socket.off('chat:token');
    };
  }, [socket, userId]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputText.trim() || !socket) return;

    const message = inputText.trim();
    setInputText('');

    if (activeTab === 'group') {
      // Send group chat message
      socket.emit('chat:message', {
        roomId,
        userId,
        userName,
        message
      });
    } else {
      // Send AI chatbot question
      setAiMessages((prev) => [
        ...prev,
        {
          id: `usr-local-${Date.now()}`,
          text: message,
          sender: userName,
          isBot: false,
          isStreaming: false
        }
      ]);

      socket.emit('chat:question', {
        roomId,
        userId,
        userName,
        message
      });
    }
  };

  return (
    <div className="glass-panel rounded-2xl flex flex-col h-[calc(100vh-280px)] border-slate-800/80 overflow-hidden">
      {/* Tab Selectors / Header */}
      <div className="border-b border-slate-800/60 bg-slate-900/40 p-1.5 flex gap-2">
        <button
          onClick={() => setActiveTab('group')}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'group'
              ? 'bg-brand-accent/25 text-brand-accent border border-brand-accent/35'
              : 'text-slate-400 hover:text-slate-200 border border-transparent'
          }`}
        >
          <Users size={13} />
          <span>Group Chat</span>
        </button>
        <button
          onClick={() => setActiveTab('ai')}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'ai'
              ? 'bg-brand-accent/25 text-brand-accent border border-brand-accent/35'
              : 'text-slate-400 hover:text-slate-200 border border-transparent'
          }`}
        >
          <Bot size={13} />
          <span>AI</span>
        </button>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {activeTab === 'group' ? (
          /* GROUP CHAT RENDER */
          groupMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs text-center px-4">
              <Users size={32} className="text-slate-700 mb-2" />
              <span>No messages in this meeting yet. Send a message to chat with other users!</span>
            </div>
          ) : (
            groupMessages.map((msg) => {
              const isMe = msg.senderId === userId;
              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-2.5 ${isMe ? 'justify-end' : 'justify-start'}`}
                >
                  {/* Avatar left */}
                  {!isMe && (
                    <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 flex-shrink-0">
                      <User size={14} />
                    </div>
                  )}

                  {/* Message bubble */}
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      isMe
                        ? 'bg-brand-accent text-white rounded-tr-none shadow-md shadow-brand-accent/10'
                        : 'bg-slate-900/80 text-slate-200 rounded-tl-none border border-slate-850'
                    }`}
                  >
                    {/* Sender Name */}
                    <span className="block text-[10px] opacity-65 mb-1 font-semibold">
                      {isMe ? 'You' : msg.senderName}
                    </span>
                    {/* Text */}
                    <p className="whitespace-pre-wrap font-light">{msg.text}</p>
                  </div>

                  {/* Avatar right */}
                  {isMe && (
                    <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-350 flex-shrink-0">
                      <User size={14} />
                    </div>
                  )}
                </div>
              );
            })
          )
        ) : (
          /* AI CO-PILOT RENDER */
          aiMessages.length === 0 && !isThinking ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs text-center px-4">
              <Bot size={32} className="text-slate-700 mb-2" />
              <span>Ask me questions about the meeting or for general assistant help.</span>
            </div>
          ) : (
            aiMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-start gap-2.5 ${msg.isBot ? 'justify-start' : 'justify-end'}`}
              >
                {/* Bot Icon left */}
                {msg.isBot && (
                  <div className="w-8 h-8 rounded-lg bg-indigo-950 border border-brand-accent/30 flex items-center justify-center text-indigo-400 flex-shrink-0">
                    <Bot size={16} />
                  </div>
                )}

                {/* Message bubble */}
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.isBot
                      ? 'bg-slate-900/80 text-slate-200 rounded-tl-none border border-slate-850'
                      : 'bg-brand-accent text-white rounded-tr-none shadow-md shadow-brand-accent/10'
                  }`}
                >
                  {/* Sender Label */}
                  <span className="block text-[10px] opacity-65 mb-1 font-semibold">
                    {msg.sender}
                  </span>
                  
                  {/* Text Content */}
                  <p className="whitespace-pre-wrap font-light">
                    {msg.text || (msg.isStreaming && <span className="text-slate-500 italic">Thinking...</span>)}
                  </p>

                  {/* Cursor for streaming effect */}
                  {msg.isStreaming && msg.text && (
                    <span className="inline-block w-1.5 h-3 bg-brand-cyan animate-pulse ml-0.5" />
                  )}
                </div>

                {/* User Icon right */}
                {!msg.isBot && (
                  <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-350 flex-shrink-0">
                    <User size={16} />
                  </div>
                )}
              </div>
            ))
          )
        )}

        {/* Live typing indicator for AI */}
        {activeTab === 'ai' && isThinking && (
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-950 border border-brand-accent/30 flex items-center justify-center text-indigo-400">
              <Bot size={16} />
            </div>
            <div className="bg-slate-900/80 text-slate-400 rounded-2xl rounded-tl-none px-4 py-3 text-xs border border-slate-850 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={chatBottomRef} />
      </div>

      {/* Form Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-slate-800/60 bg-slate-900/20 flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={activeTab === 'group' ? "Send message to room..." : "Ask meeting AI..."}
          className="flex-1 glass-input py-2 text-xs"
          disabled={activeTab === 'ai' && isThinking}
        />
        <button
          type="submit"
          className="bg-brand-accent hover:bg-brand-accent/90 text-white w-9 h-9 rounded-xl flex items-center justify-center transition-all flex-shrink-0 shadow-md shadow-brand-accent/10 disabled:opacity-40"
          disabled={!inputText.trim() || (activeTab === 'ai' && isThinking)}
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
};

export default ChatPanel;
