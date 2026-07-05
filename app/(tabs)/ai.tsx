import React, { useState, useEffect, useCallback } from 'react';
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

interface Question { id: string; text: string }

export default function AIAdvisorScreen() {
  const { token, email } = useAuthStore();
  const isAdmin = email === ADMIN_EMAIL;

  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [error, setError] = useState('');

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

  const handleTap = async (q: Question) => {
    // Toggle if already answered
    if (answers[q.id]) {
      setExpanded((e) => ({ ...e, [q.id]: !e[q.id] }));
      return;
    }
    if (!token) return;
    setExpanded((e) => ({ ...e, [q.id]: true }));
    setLoading((l) => ({ ...l, [q.id]: true }));
    try {
      const answer = await api.askAI(token, q.text);
      setAnswers((a) => ({ ...a, [q.id]: answer }));
    } catch (e: any) {
      setAnswers((a) => ({ ...a, [q.id]: `Error: ${e.message || 'Could not get answer'}` }));
    } finally {
      setLoading((l) => ({ ...l, [q.id]: false }));
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

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>
          Tap a question to get personalised advice based on your wallet and subscriptions.
          {isAdmin ? '\n\nAdmin: + to add questions, hold to delete.' : ''}
        </Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {loadingQuestions ? (
          <ActivityIndicator color={COLORS.accentLight} style={{ marginTop: 40 }} />
        ) : (
          questions.map((q) => {
            const isExpanded = expanded[q.id];
            const isLoading = loading[q.id];
            const answer = answers[q.id];

            return (
              <TouchableOpacity
                key={q.id}
                style={[styles.card, isExpanded && styles.cardExpanded]}
                onPress={() => handleTap(q)}
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

                {isExpanded && (
                  <View style={styles.answerArea}>
                    {isLoading ? (
                      <View style={styles.thinking}>
                        <ActivityIndicator size="small" color={COLORS.accentLight} />
                        <Text style={styles.thinkingText}>Analysing your wallet…</Text>
                      </View>
                    ) : answer ? (
                      <Text style={styles.answerText}>{answer}</Text>
                    ) : null}
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        )}

        <View style={styles.footer}>
          <FontAwesome name="lock" size={12} color={COLORS.textMuted} />
          <Text style={styles.footerText}>
            Questions are answered using your wallet and subscription data. Responses are not stored.
          </Text>
        </View>
      </ScrollView>
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
  scroll: { paddingHorizontal: 20, paddingBottom: 60, gap: 10 },
  intro: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 8,
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
    backgroundColor: 'rgba(5,150,105,0.08)',
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
  },
  thinking: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  thinkingText: { color: COLORS.textMuted, fontSize: 13 },
  answerText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    lineHeight: 22,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingTop: 8,
    paddingHorizontal: 4,
  },
  footerText: {
    color: COLORS.textMuted,
    fontSize: 11,
    lineHeight: 16,
    flex: 1,
  },
});
