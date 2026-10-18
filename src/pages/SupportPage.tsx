import { useState, useEffect } from 'react';
import { ArrowRight, Headphones } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { SupportChat } from '@/components/SupportChat';
import type { SupportConversation } from '@/types';

interface SupportPageProps {
  onBack: () => void;
}

export function SupportPage({ onBack }: SupportPageProps) {
  const { captain } = useAuth();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!captain?.id) return;

    (async () => {
      const { data, error } = await supabase
        .from('support_conversations')
        .select('id')
        .eq('captain_id', captain.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setConversationId((data as SupportConversation).id);
      }
      setLoading(false);
    })();
  }, [captain?.id]);

  if (!captain) return null;

  return (
    <div className="min-h-screen bg-neutral-50 font-cairo" dir="rtl">
      <div className="safe-top bg-primary-500 text-white px-5 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center hover:bg-white/25 transition-colors"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Headphones className="w-5 h-5" />
            <h1 className="text-lg font-bold">الدعم الفني</h1>
          </div>
        </div>
      </div>

      {!loading && (
        <SupportChat
          captainId={captain.id}
          conversationId={conversationId}
          onConversationCreated={(id) => setConversationId(id)}
          embedded
        />
      )}
    </div>
  );
}
