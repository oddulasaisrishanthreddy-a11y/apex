/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { MessageSquare, X, Send, Bot, Loader2, Sparkles, PhoneCall } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import axios from 'axios';

interface Message {
  role: 'user' | 'model';
  text: string;
}

export default function Chatbot() {
  const { user } = useSelector((state: RootState) => state.auth);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'Hello! I am **Apex Support AI**, your personal shopping companion. Ask me anything about our premium catalog, shipping, warranties, or tracking orders!' }
  ]);
  const [inputMsg, setInputMsg] = useState('');
  const [loading, setLoading] = useState(false);
  
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOpenChat = () => {
      setIsOpen(true);
    };
    window.addEventListener('open-apex-chatbot', handleOpenChat);
    return () => {
      window.removeEventListener('open-apex-chatbot', handleOpenChat);
    };
  }, []);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, loading]);

  const handleSendMessage = async (customMessage?: string) => {
    const textToSend = customMessage || inputMsg;
    if (!textToSend.trim() || loading) return;

    if (!customMessage) setInputMsg('');
    
    // Add user message to history
    const updatedMessages = [...messages, { role: 'user' as const, text: textToSend }];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      const response = await axios.post('/api/chatbot', {
        message: textToSend,
        chatHistory: updatedMessages.slice(0, -1), // skip current because it is sent as "message"
        userId: user?.id
      });

      setMessages([...updatedMessages, { role: 'model' as const, text: response.data.reply }]);
    } catch (err) {
      console.error(err);
      setMessages([...updatedMessages, { role: 'model' as const, text: 'I apologize, there was an issue routing my neural desk. Please rephrase or message human support at support@apexstore.ai.' }]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    'What products are in stock?',
    'What is the return policy?',
    'How do I get free shipping?',
    user ? 'Track my active orders' : 'How do I log in?'
  ];

  return (
    <div className="fixed bottom-6 right-6 z-40 font-sans">
      <AnimatePresence>
        {/* Chat Window */}
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 50 }}
            className="w-[290px] sm:w-[340px] h-[390px] max-h-[60vh] bg-white border border-gray-100 rounded-3xl shadow-2xl flex flex-col overflow-hidden mb-4 border border-indigo-50"
          >
            {/* Header */}
            <div className="px-3.5 py-2.5 bg-gray-900 text-white flex justify-between items-center bg-gradient-to-r from-gray-950 to-gray-900 border-b border-gray-800 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1.5 rounded-xl bg-indigo-600/30 text-indigo-400 border border-indigo-500/20 shrink-0">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-bold tracking-tight truncate">Apex Support AI</h3>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="w-1 h-1 rounded-full bg-green-500 animate-pulse shrink-0"></span>
                    <span className="text-[8px] text-gray-400 uppercase font-mono tracking-wider font-semibold truncate">3.5 Active</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <a
                  href="tel:9502093743"
                  className="p-1 px-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white transition-colors flex items-center gap-0.5 text-[8px] font-extrabold shadow-sm shrink-0"
                  title="Call hotline priority human assistance"
                >
                  <PhoneCall className="h-2.5 w-2.5" />
                  <span>Call Us</span>
                </a>
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-1.5 py-1 bg-red-600 hover:bg-red-500 text-[8px] font-bold rounded-lg text-white transition-all cursor-pointer shrink-0 shadow-sm border border-white/5 flex items-center gap-0.5 active:scale-95"
                  id="close-chat"
                  title="Close support chat window"
                >
                  <X className="h-2.5 w-2.5" />
                  <span>Close</span>
                </button>
              </div>
            </div>

            {/* Conversation Flow */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-50/50">
              {messages.map((m, idx) => (
                <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`p-3 rounded-2xl text-xs max-w-[85%] leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-none shadow-md shadow-indigo-100'
                      : 'bg-white border border-gray-100 text-gray-700 rounded-bl-none shadow-sm shadow-gray-100'
                  }`}>
                    {/* Render markdown bolding loosely or regular text */}
                    {m.text.split('**').map((chunk, chunkIdx) => 
                      chunkIdx % 2 === 1 ? <strong key={chunkIdx} className="font-bold">{chunk}</strong> : chunk
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="p-3 rounded-2xl bg-white border border-gray-100 text-gray-400 rounded-bl-none flex items-center gap-1.5 text-xs shadow-sm">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600" />
                    <span>Bot is synthesizing reply...</span>
                  </div>
                </div>
              )}
              <div ref={bottomRef}></div>
            </div>

            {/* Quick Suggestions */}
            {messages.length === 1 && (
              <div className="px-4 py-2 bg-gray-50 border-t border-gray-100/50 overflow-x-auto whitespace-nowrap scrollbar-none flex gap-2">
                {quickPrompts.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(p)}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-white border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50 text-[11px] font-semibold text-indigo-600 rounded-full transition-colors truncate max-w-[200px]"
                  >
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    {p}
                  </button>
                ))}
              </div>
            )}

            {/* Input Portal */}
            <form
              onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
              className="p-2 border-t border-gray-100 bg-white flex items-center gap-1.5 shrink-0"
            >
              <input
                type="text"
                placeholder="Message support..."
                value={inputMsg}
                onChange={(e) => setInputMsg(e.target.value)}
                disabled={loading}
                className="flex-1 px-3 py-1.5 border border-gray-100 rounded-full text-[11px] bg-gray-55 bg-gray-50/50 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white transition-all disabled:opacity-50 min-w-0"
              />
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 border border-rose-200 text-rose-600 hover:bg-rose-55 hover:bg-rose-50 rounded-full transition-colors shrink-0 active:scale-95"
                title="Close chat window"
                id="close-chat-bottom"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <button
                type="submit"
                disabled={!inputMsg.trim() || loading}
                className="p-1.5 bg-indigo-600 active:bg-indigo-700 disabled:bg-gray-100 text-white disabled:text-gray-300 rounded-full transition-all hover:shadow-indigo-200 hover:shadow-xl shrink-0"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Launcher Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="w-14 h-14 bg-indigo-600 flex items-center justify-center text-white rounded-full shadow-2xl shadow-indigo-400 cursor-pointer border border-indigo-500 hover:bg-indigo-500 transition-colors relative"
        id="chatbot-launcher-btn"
      >
        {isOpen ? (
          <X className="h-6 w-6 text-white animate-in spin-in duration-200" />
        ) : (
          <MessageSquare className="h-6 w-6 text-white" />
        )}
        {!isOpen && (
          <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-indigo-600 animate-pulse"></span>
        )}
      </motion.button>
    </div>
  );
}
