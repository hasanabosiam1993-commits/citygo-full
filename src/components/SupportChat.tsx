import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send,
  MessageCircle,
  Bot,
  User,
  Headphones,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { SupportMessage } from '@/types';

const QUICK_REPLIES = [
  { label: 'كيف أشحن محفظتي؟', reply: 'لشحن محفظتك: اضغط على "شحن المحفظة" في صفحة الدخول، ثم ارفع صورة إيصال التحويل. سيتم اعتماد الشحن من الإدارة خلال 24 ساعة.' },
  { label: 'متى يمكنني سحب رصيدي؟', reply: 'يمكنك طلب سحب رصيدك أيام الإثنين والخميس فقط، بحد أدنى 5 دنانير، مع الحفاظ على رصيد أساسي 5 دنانير في محفظتك.' },
  { label: 'كم عمولة قبول الرحلة؟', reply: 'عمولة قبول الرحلة هي 0.50 دينار تخصم من محفظتك وتضاف لصاحب الرحلة عند قبولها.' },
  { label: 'كيف أتواصل مع الإدارة؟', reply: 'أكتب رسالتك هنا وسيتم تحويلك لمحادثة مع الإدارة. سيتم الرد عليك في أقرب وقت ممكن.' },
];

interface SupportChatProps {
  captainId: string;
  conversationId: string | null;
  onConversationCreated?: (id: string) => void;
  embedded?: boolean;
}

export function SupportChat({ captainId, conversationId, onConversationCreated, embedded = false }: SupportChatProps) {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async (convId: string) => {
    const { data, error } = await supabase
      .from('support_messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data as SupportMessage[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!conversationId) {
      setLoading(false);
      return;
    }
    fetchMessages(conversationId);
  }, [conversationId, fetchMessages]);

  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`support_messages:${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as SupportMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const createConversation = async (): Promise<string> => {
    const { data, error } = await supabase
      .from('support_conversations')
      .insert({ captain_id: captainId })
      .select()
      .maybeSingle();

    if (error || !data) throw new Error('Failed to create conversation');
    return (data as { id: string }).id;
  };

  const sendBotMessage = async (convId: string, reply: string) => {
    await supabase
      .from('support_messages')
      .insert({
        conversation_id: convId,
        sender_type: 'bot',
        body: reply,
      });
  };

  const handleQuickReply = async (reply: string) => {
    setSending(true);
    try {
      let convId = conversationId;
      if (!convId) {
        convId = await createConversation();
        onConversationCreated?.(convId);
      }
      await sendBotMessage(convId, reply);
      setShowQuickReplies(false);
    } catch {
      // ignore
    }
    setSending(false);
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    setSending(true);

    try {
      let convId = conversationId;
      if (!convId) {
        convId = await createConversation();
        onConversationCreated?.(convId);
      }

      const { data, error } = await supabase
        .from('support_messages')
        .insert({
          conversation_id: convId,
          sender_type: 'captain',
          body: input.trim(),
        })
        .select()
        .maybeSingle();

      if (!error && data) {
        setMessages((prev) => [...prev, data as SupportMessage]);
      }

      setInput('');
      setShowQuickReplies(false);
    } catch {
      // ignore
    }
    setSending(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-neutral-300 animate-spin" />
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${embedded ? '' : 'min-h-screen bg-neutral-50 font-cairo'}`} dir="rtl">
      {!embedded && (
        <div className="safe-top bg-primary-500 text-white px-5 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold">الدعم الفني</h1>
              <p className="text-xs text-white/70">تواصل مع الإدارة أو المساعد الآلي</p>
            </div>
          </div>
        </div>
      )}

      <div ref={scrollRef} className={`flex-1 overflow-y-auto px-4 py-4 space-y-3 ${embedded ? 'max-h-[400px]' : ''}`}>
        {messages.length === 0 && showQuickReplies && (
          <div className="text-center py-6 animate-fade-in">
            <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <Bot className="w-8 h-8 text-primary-500" />
            </div>
            <p className="text-sm font-bold text-neutral-700 mb-1">المساعد الآلي</p>
            <p className="text-xs text-neutral-400 mb-4">اختر سؤالاً شائعاً أو اكتب رسالتك</p>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {showQuickReplies && (
          <div className="space-y-2 pt-2">
            <p className="text-xs font-semibold text-neutral-500 mb-2">أسئلة شائعة</p>
            {QUICK_REPLIES.map((qr, idx) => (
              <button
                key={idx}
                onClick={() => handleQuickReply(qr.reply)}
                disabled={sending}
                className="w-full flex items-center justify-between bg-white border-2 border-neutral-200 rounded-xl2 px-4 py-3 text-right hover:border-primary-300 transition-colors active:scale-[0.98] disabled:opacity-50"
              >
                <span className="text-sm text-neutral-700 font-medium">{qr.label}</span>
                <ArrowRight className="w-4 h-4 text-primary-400 flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className={`border-t border-neutral-200 bg-white p-3 ${embedded ? 'rounded-b-xl2' : 'safe-bottom'}`}>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="اكتب رسالتك..."
            className="flex-1 bg-neutral-50 border-2 border-neutral-200 rounded-xl2 px-4 py-2.5 text-sm focus:outline-none focus:border-primary-500 transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="w-11 h-11 bg-primary-500 text-white rounded-xl2 flex items-center justify-center hover:bg-primary-600 transition-colors active:scale-95 disabled:opacity-50 flex-shrink-0"
          >
            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: SupportMessage }) {
  const isCaptain = message.sender_type === 'captain';
  const isBot = message.sender_type === 'bot';

  const icon = isBot ? <Bot className="w-4 h-4" /> : isCaptain ? <User className="w-4 h-4" /> : <Headphones className="w-4 h-4" />;
  const label = isBot ? 'المساعد الآلي' : isCaptain ? 'أنت' : 'الإدارة';

  return (
    <div className={`flex gap-2 animate-fade-in ${isCaptain ? 'flex-row-reverse' : ''}`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
        isBot ? 'bg-primary-50 text-primary-500' : isCaptain ? 'bg-secondary-50 text-secondary-500' : 'bg-accent-50 text-accent-600'
      }`}>
        {icon}
      </div>
      <div className={`max-w-[75%] ${isCaptain ? 'items-end' : ''}`}>
        <div className={`rounded-xl2 px-3.5 py-2.5 text-sm leading-relaxed ${
          isBot
            ? 'bg-primary-50 text-neutral-800 border border-primary-100'
            : isCaptain
            ? 'bg-secondary-500 text-white'
            : 'bg-white border border-neutral-200 text-neutral-800 shadow-card'
        }`}>
          {message.body}
        </div>
        <p className={`text-[10px] text-neutral-400 mt-1 ${isCaptain ? 'text-left' : ''}`}>{label}</p>
      </div>
    </div>
  );
}
