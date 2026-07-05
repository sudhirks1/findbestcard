import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, ActivityIndicator, Alert, TextInput, Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useAuthStore } from '../../store/useAuthStore';
import * as api from '../../utils/api';
import { COLORS } from '../../utils/constants';

const ADMIN_EMAIL = 'sudhirplacesai@gmail.com';

type ChatMessage = { role: 'user' | 'assistant'; content: string };
interface Question { id: string; text: string }

export default function AIAdvisorScreen() {
  const { token, email } = useAuthStore();
  const isAdmin = email === ADMIN_EMAIL;

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [error, setError] = useState('');

  // Per-question conversation threads
  const [threads, setThreads] = useState<Record<string, ChatMessage[]>>({});
  const [threadLoading, setThreadLoading] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [followUp, setFollowUp] = useState<Record<string, string>>({});

  // Open question (free-form)
  const [openThread, setOpenThread] = useState<ChatMessage[]>([]);
  const [openInput, setOpenInput] = useState('');
  const [openLoading, setOpenLoading] = useState(false);
  const [openExpanded, setOpenExpanded] = useState(false);

  const scrollRef = useRef<ScrollView>(null);

  const loadQuestions = useCallback(async () => {
    if (!token) return;
    try {
      const data = await api.getQuestions(token);
      setQuestions(data);
    } catch {
      setError('Could not load questions.');
    } finally {
      setLoadingQuestions(false);
    }
  }, [token]);

  useEffect(() => { loadQuestions(); }, [loadQuestions]);

  const sendMessage = async (questionId: string, userText: string, history: ChatMessage[]) => {
    if (!token || !userText.trim()) return;
    setThreadLoading((l) => ({ ...l, [questionId]: true }));
    const updated: ChatMessage[] = [...history, { role: 'user', content: userText }];
    setThreads((t) => ({ ...t, [questionId]: updated }));
    setFollowUp((f) => ({ ...f, [questionId]: '' }));
    try {
      const answer = await api.askAI(token, userText, history);
      setThreads((t) => ({ ...t, [questionId]: [...updated, { role: 'assistant', content: answer }] }));
    } catch (e: any) {
      setThreads((t) => ({ ...t, [questionId]: [...updated, { role: 'assistant', content: `Error: ${e.message || 'Could not get answer'}` }] }));
    } finally {
      setThreadLoading((l) => ({ ...l, [questionId]: false }));
    }
  };

  const handleTapQuestion = async (q: Question) => {
    const isExpanded = expanded[q.id];
    if (isExpanded) {
      setExpanded((e) => ({ ...e, [q.id]: false }));
      return;
    }
    setExpanded((e) => ({ ...e, [q.id]: true }));
    if (threads[q.id]?.length) return; // already has a thread
    await sendMessage(q.id, q.text, []);
  };

  const handleFollowUp = (q: Question) => {
    const text = followUp[q.id]?.trim();
    if (!text) return;
    const history = threads[q.id] ?? [];
    sendMessage(q.id, text, history);
  };

  const handleOpenSend = async () => {
    const text = openInput.trim();
    if (!text || !token) return;
    setOpenLoading(true);
    setOpenExpanded(true);
    const history = openThread;
    const updated: ChatMessage[] = [...history, { role: 'user', content: text }];
    setOpenThread(updated);
    setOpenInput('');
    try {
      const answer = await api.askAI(token, text, history);
      setOpenThread([...updated, { role: 'assistant', content: answer }]);
    } catch (e: any) {
      setOpenThread([...updated, { role: 'assistant', content: `Error: ${e.message || 'Could not get answer'}` }]);
    } finally {
      setOpenLoading(false);
    }
  };

  const handleAddQuestion = () => {
    if (!token) return;
    Alert.prompt(
      'New Question',
      'Enter a question for all users:',
      async (text) => {
        if (!text?.trim()) return;
        try {
          await api.addQuestion(token, text.trim());
          loadQuestions();
        } catch (e: any) {
          Alert.alert('Error', e.message);
        }
      },
      'plain-text',
      '',
    );
  };

  const handleDeleteQuestion = (q: Question) => {
    if (!token) return;
    Alert.alert('Delete Question', `Remove "${q.text}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteQuestion(token, q.id);
            setQuestions((qs) => qs.filter((x) => x.id !== q.id));
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  };

  return (
    <LinearGradient colors={[COLORS.bgGradientStart, COLORS.bgGradientEnd]} style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <View>
          <Text style={styles.headerSub}>Powered by Claude</Text>
          <Text style={styles.headerTitle}>AI Advisor</Text>
        </View>
        {isAdmin && (
          <TouchableOpacity style={styles.addBtn} onPress={handleAddQuestion} activeOpacity={0.8}>
            <FontAwesome name="plus" size={16} color={COLORS.accentLight} />
          </TouchableOpacity>
        )}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {/* Open question box */}
          <View style={styles.openBox}>
            <View style={styles.openBoxHeader}>
              <FontAwesome name="comment" size={13} color={COLORS.accentLight} />
              <Text style={styles.openBoxTitle}>Ask anything about your cards</Text>
            </View>
            <Text style={styles.openBoxSub}>Strictly related to credit card rewards, wallet strategy, and subscriptions.</Text>

            {openExpanded && openThread.length > 0 && (
              <View style={styles.thread}>
                {openThread.map((msg, i) => (
                  <View key={i} style={[styles.bubble, msg.role === 'user' ? styles.bubbleUser : styles.bubbleAI]}>
                    <Text style={[styles.bubbleText, msg.role === 'user' ? styles.bubbleTextUser : styles.bubbleTextAI]}>
                      {msg.content}
                    </Text>
                  </View>
                ))}
                {openLoading && (
                  <View style={[styles.bubble, styles.bubbleAI]}>
                    <ActivityIndicator size="small" color={COLORS.accentLight} />
                  </View>
                )}
              </View>
            )}

            <View style={styles.inputRow}>
              <TextInput
                style={styles.openInput}
                value={openInput}
                onChangeText={setOpenInput}
                placeholder="e.g. Which card should I use for Amazon purchases?"
                placeholderTextColor={COLORS.textMuted}
                multiline
                onSubmitEditing={handleOpenSend}
                returnKeyType="send"
                blurOnSubmit
              />
              <TouchableOpacity
                style={[styles.sendBtn, (!openInput.trim() || openLoading) && styles.sendBtnDisabled]}
                onPress={handleOpenSend}
                disabled={!openInput.trim() || openLoading}
                activeOpacity={0.8}
              >
                {openLoading
                  ? <ActivityIndicator size="small" color="#FFF" />
                  : <FontAwesome name="send" size={14} color="#FFF" />
                }
              </TouchableOpacity>
            </View>
            {openThread.length > 0 && (
              <TouchableOpacity onPress={() => { setOpenThread([]); setOpenExpanded(false); }} style={styles.clearBtn}>
                <Text style={styles.clearBtnText}>Clear conversation</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Preset questions */}
          <Text style={styles.sectionLabel}>Suggested Questions</Text>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {loadingQuestions ? (
            <ActivityIndicator color={COLORS.accentLight} style={{ marginTop: 20 }} />
          ) : (
            questions.map((q) => {
              const isExpanded = expanded[q.id];
              const isLoading = threadLoading[q.id];
              const thread = threads[q.id] ?? [];

              return (
                <View key={q.id} style={[styles.card, isExpanded && styles.cardExpanded]}>
                  <TouchableOpacity
                    onPress={() => handleTapQuestion(q)}
                    onLongPress={isAdmin ? () => handleDeleteQuestion(q) : undefined}
                    activeOpacity={0.8}
                  >
                    <View style={styles.cardHeader}>
                      <Text style={styles.questionText}>{q.text}</Text>
                      <FontAwesome
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={12}
                        color={COLORS.textMuted}
                        style={{ marginLeft: 8, marginTop: 2 }}
                      />
                    </View>
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={styles.answerArea}>
                      {/* Conversation thread */}
                      {thread.map((msg, i) => (
                        <View key={i} style={[styles.bubble, msg.role === 'user' ? styles.bubbleUser : styles.bubbleAI]}>
                          <Text style={[styles.bubbleText, msg.role === 'user' ? styles.bubbleTextUser : styles.bubbleTextAI]}>
                            {msg.content}
                          </Text>
                        </View>
                      ))}
                      {isLoading && (
                        <View style={[styles.bubble, styles.bubbleAI]}>
                          <ActivityIndicator size="small" color={COLORS.accentLight} />
                        </View>
                      )}

                      {/* Follow-up input — only shown after first answer */}
                      {thread.some((m) => m.role === 'assistant') && !isLoading && (
                        <View style={[styles.inputRow, { marginTop: 12 }]}>
                          <TextInput
                            style={styles.openInput}
                            value={followUp[q.id] ?? ''}
                            onChangeText={(t) => setFollowUp((f) => ({ ...f, [q.id]: t }))}
                            placeholder="Ask a follow-up..."
                            placeholderTextColor={COLORS.textMuted}
                            multiline
                            onSubmitEditing={() => handleFollowUp(q)}
                            returnKeyType="send"
                            blurOnSubmit
                          />
                          <TouchableOpacity
                            style={[styles.sendBtn, !followUp[q.id]?.trim() && styles.sendBtnDisabled]}
                            onPress={() => handleFollowUp(q)}
                            disabled={!followUp[q.id]?.trim()}
                            activeOpacity={0.8}
                          >
                            <FontAwesome name="send" size={14} color="#FFF" />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              );
            })
          )}

          <View style={styles.footer}>
            <FontAwesome name="lock" size={12} color={COLORS.textMuted} />
            <Text style={styles.footerText}>
              Responses use your wallet and subscription data and are strictly limited to credit card topics.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 16,
  },
  headerSub: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  headerTitle: {
    color: COLORS.textPrimary,
    fontSize: 32,
    fontWeight: '800',
    marginTop: 2,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.accent + '33',
    borderWidth: 1,
    borderColor: COLORS.accentLight + '55',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { paddingHorizontal: 20, paddingBottom: 80, gap: 10 },
  openBox: {
    backgroundColor: 'rgba(5,150,105,0.08)',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.25)',
    gap: 10,
    marginBottom: 4,
  },
  openBoxHeader: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  openBoxTitle: { color: COLORS.accentLight, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  openBoxSub: { color: COLORS.textMuted, fontSize: 12, lineHeight: 17 },
  sectionLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 4,
    marginTop: 4,
  },
  errorText: { color: COLORS.red, fontSize: 13 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  cardExpanded: {
    borderColor: COLORS.accentLight + '44',
    backgroundColor: 'rgba(5,150,105,0.06)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  questionText: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    lineHeight: 21,
  },
  answerArea: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceBorder,
    gap: 8,
  },
  thread: { gap: 8 },
  bubble: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '92%',
  },
  bubbleUser: {
    backgroundColor: COLORS.accent + '33',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  bubbleAI: {
    backgroundColor: COLORS.surface,
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  bubbleText: { fontSize: 14, lineHeight: 21 },
  bubbleTextUser: { color: COLORS.accentLight, fontWeight: '500' },
  bubbleTextAI: { color: COLORS.textPrimary },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  openInput: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 14,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  clearBtn: { alignSelf: 'flex-end' },
  clearBtnText: { color: COLORS.textMuted, fontSize: 12 },
  footer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingTop: 8,
    paddingHorizontal: 4,
    marginTop: 8,
  },
  footerText: {
    color: COLORS.textMuted,
    fontSize: 11,
    lineHeight: 16,
    flex: 1,
  },
});
