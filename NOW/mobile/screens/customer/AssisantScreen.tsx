import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

// ========== Types ==========
type Message = {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: string;
};

// ========== Component ==========
const AssistantScreen: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'أهلاً بك! 👋 أنا مساعد ناو الذكي. كيف أقدر أساعدك اليوم؟',
      sender: 'assistant',
      timestamp: new Date().toISOString(),
    },
  ]);
  const [inputText, setInputText] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const listRef = useRef<FlatList<Message>>(null);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const sendMessage = () => {
    const text = inputText.trim();
    if (!text) return;

    const userMessage: Message = {
      id: generateId(),
      text,
      sender: 'user',
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    // محاكاة رد المساعد بعد تأخير قصير
    setTimeout(() => {
      const assistantReply: Message = {
        id: generateId(),
        text: getAssistantResponse(text),
        sender: 'assistant',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantReply]);
      setIsTyping(false);
    }, 1200);

    // تمرير لأسفل بعد الإرسال
    setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const getAssistantResponse = (query: string): string => {
    const lower = query.toLowerCase();
    if (lower.includes('توصيل') || lower.includes('شحن')) {
      return 'نوفر خدمة توصيل سريعة حتى باب المنزل. يمكنك تتبع طلبك لحظيًا من خلال التطبيق.';
    } else if (lower.includes('دفع')) {
      return 'حاليًا ندعم الدفع عند الاستلام (كاش). قريبًا سنضيف الدفع الإلكتروني.';
    } else if (lower.includes('مطعم') || lower.includes('متجر') || lower.includes('محل')) {
      return 'يمكنك استكشاف المتاجر والمطاعم من خلال الشاشة الرئيسية والبحث عن الأصناف المفضلة لديك.';
    } else if (lower.includes('شكوى') || lower.includes('مشكلة')) {
      return 'نأسف لسماع ذلك. يمكنك التواصل مع الدعم الفني من خلال الإعدادات، وسنسعد بمساعدتك.';
    } else {
      return 'شكرًا لتواصلك! سأقوم بتحويل استفسارك لفريق الدعم إن لزم الأمر. هل هناك شيء آخر يمكنني مساعدتك به؟';
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.sender === 'user';
    return (
      <View
        style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.assistantBubble,
        ]}
      >
        <Text style={isUser ? styles.userText : styles.assistantText}>
          {item.text}
        </Text>
        <Text style={styles.timestamp}>
          {new Date(item.timestamp).toLocaleTimeString('ar-EG', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.assistantInfo}>
          <View style={styles.avatar}>
            <Ionicons name="chatbubble-ellipses" size={24} color="#FFFFFF" />
          </View>
          <View>
            <Text style={styles.headerTitle}>مساعد ناو</Text>
            <View style={styles.onlineRow}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineText}>متاح الآن</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Messages */}
      <FlatList
        ref={listRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.messagesContainer}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
      />

      {/* Typing Indicator */}
      {isTyping && (
        <View style={styles.typingRow}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.typingText}>المساعد يكتب...</Text>
        </View>
      )}

      {/* Input Bar */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="اكتب رسالتك..."
            placeholderTextColor={COLORS.textLight}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!inputText.trim()}
          >
            <Ionicons name="send" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ========== Styles ==========
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  assistantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  onlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.success,
  },
  onlineText: {
    fontSize: 12,
    color: COLORS.success,
    fontWeight: '500',
  },
  messagesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderBottomLeftRadius: 4,
  },
  userText: {
    color: '#FFFFFF',
    fontSize: 15,
  },
  assistantText: {
    color: COLORS.text,
    fontSize: 15,
  },
  timestamp: {
    fontSize: 10,
    color: COLORS.textLight,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  typingText: {
    color: COLORS.secondaryText,
    fontSize: 13,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.text,
    marginRight: 8,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});

export default AssistantScreen;