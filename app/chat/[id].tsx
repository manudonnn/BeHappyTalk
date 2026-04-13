import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, Platform, StatusBar as RNStatusBar,
  TextInput, FlatList, Image, TouchableOpacity, KeyboardAvoidingView, ActivityIndicator, Alert
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import io from 'socket.io-client';
import { useAuth } from '../../hooks/useAuth';
import { API_URL, SOCKET_URL } from '../../constants/ServerConfig';
import CallView from '../../components/CallView';
import {
    RTCPeerConnection,
    RTCIceCandidate,
    RTCSessionDescription,
    mediaDevices,
    MediaStream
} from 'react-native-webrtc';



const PROVIDER_IMAGE = require('../../assets/images/girl_smiling_1775250936696.png');

type Message = {
  id: string;
  type: 'system' | 'incoming' | 'outgoing';
  text: string;
  time: string;
};

export default function ChatScreen() {
  const router = useRouter();
  const { id: providerId, sessionId, type, duration } = useLocalSearchParams<{ id: string, sessionId?: string, type?: string, duration?: string }>();
  const { user } = useAuth();

  const [message, setMessage] = useState('');
  const [contact, setContact] = useState<any>({ name: 'Loading...', image: PROVIDER_IMAGE, status: 'online', verified: false });
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [wallet, setWallet] = useState<number | null>(null);

  // WebRTC States
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [renderRtc, setRenderRtc] = useState(0);
  const pc = useRef<RTCPeerConnection | null>(null);

  const socketRef = useRef<any>(null);
  const flatListRef = useRef<FlatList>(null);

  const userId = user?.id;

  useEffect(() => {
     if (duration) {
        setTimeLeft(parseInt(duration, 10) * 60);
     }
  }, [duration]);

  useEffect(() => {
     if (timeLeft === null || timeLeft <= 0) return;
     const timer = setInterval(() => {
        setTimeLeft(prev => prev !== null ? prev - 1 : null);
     }, 1000);
     return () => clearInterval(timer);
  }, [timeLeft]);

  useEffect(() => {
    if (!userId || !providerId) return;

    // 1. Fetch provider info
    fetch(`${API_URL}/providers`)
      .then(r => r.json())
      .then((data: any[]) => {
        const found = data.find(p => p.id === providerId);
        if (found) setContact({ ...found, image: PROVIDER_IMAGE });
      })
      .catch(console.error);

    // 2. Fetch existing messages
    fetch(`${API_URL}/chat/${userId}/${providerId}`)
      .then(r => r.json())
      .then((data: any[]) => {
        const mapped = data.map(m => ({
          id: m.id.toString(),
          type: m.senderId === userId ? 'outgoing' : 'incoming',
          text: m.text,
          time: new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        } as Message));
        setMessages(mapped);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
      })
      .catch(console.error);
      
    // Fetch initial wallet balance
    fetch(`${API_URL}/user/${userId}`)
      .then(r => r.json())
      .then((data: any) => setWallet(data.walletBalance))
      .catch(console.error);

    // 3. Setup socket
    socketRef.current = io(SOCKET_URL, { transports: ['websocket'] });

    socketRef.current.on('connect', () => {
      socketRef.current.emit('join_chat', { userId, providerId });
    });

    socketRef.current.on('webrtc_signal', async ({ from, signal }: any) => {
        console.log(`[WebRTC] Signal Received: type: ${signal.type}, state: ${pc.current?.signalingState}`);
        if (!pc.current) return;

        try {
            if (signal.type === 'offer') {
                if (pc.current.signalingState !== 'stable') {
                    console.log('[WebRTC] Offer ignored: state is', pc.current.signalingState);
                    return;
                }
                await pc.current.setRemoteDescription(new RTCSessionDescription(signal));
                const answer = await pc.current.createAnswer();
                await pc.current.setLocalDescription(answer);
                socketRef.current?.emit('webrtc_signal', {
                    to: `chat_${user?.id}_${providerId}`,
                    signal: pc.current.localDescription
                });
            } else if (signal.type === 'answer') {
                if (pc.current.signalingState !== 'have-local-offer') {
                    console.log('[WebRTC] Answer ignored: state is', pc.current.signalingState);
                    return;
                }
                await pc.current.setRemoteDescription(new RTCSessionDescription(signal));
            } else if (signal.type === 'candidate') {
                await pc.current.addIceCandidate(new RTCIceCandidate(signal.candidate));
            }
        } catch (e) {
            console.error('[WebRTC] Signaling Error:', e, 'at state:', pc.current?.signalingState);
        }
    });

    socketRef.current.on('receive_message', (newMsg: any) => {
      // Show typing indicator then add message
      if (newMsg.senderId === providerId) {
        setIsTyping(true);
        setTimeout(() => {
          setIsTyping(false);
          setMessages(prev => {
            if (prev.find(m => m.id === newMsg.id.toString())) return prev;
            return [
              ...prev,
              {
                id: newMsg.id.toString(),
                type: 'incoming',
                text: newMsg.text,
                time: new Date(newMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              },
            ];
          });
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);
        }, 600);
      } else {
        // User's own message confirmed by server
        setMessages(prev => {
          if (prev.find(m => m.id === newMsg.id.toString())) return prev;
          return [
            ...prev,
            {
              id: newMsg.id.toString(),
              type: 'outgoing',
              text: newMsg.text,
              time: new Date(newMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ];
        });
        setIsSending(false);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);
      }
    });

    socketRef.current.on('session_ended', ({ reason }: { reason: string }) => {
      alert(reason === 'insufficient_funds' ? 'Session ended: Insufficient wallet balance.' : 'Session ended automatically.');
      router.replace('/home');
    });

    socketRef.current.on('wallet_update', ({ walletBalance }: { walletBalance: number }) => {
      setWallet(walletBalance);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [userId, providerId]);

  const endSession = () => {
    if (sessionId && socketRef.current) {
      socketRef.current.emit('end_interaction', { sessionId });
    }
    router.replace('/home');
  };

  const sendMessage = () => {
    const trimmed = message.trim();
    if (!trimmed || !socketRef.current || !userId || !isSessionActive) return;

    setIsSending(true);
    socketRef.current.emit('send_message', {
      userId,
      providerId,
      senderId: userId,
      text: trimmed,
    });
    setMessage('');
  };

  const isSessionActive = Boolean(sessionId) && (timeLeft === null || timeLeft > 0);

  const setupPeerConnection = () => {
    if (pc.current) return; // Do not recreate if it already exists!
    
    console.log('Mobile setting up PeerConnection');
    pc.current = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    (pc.current as any).onicecandidate = (event: any) => {
        if (event.candidate) {
            socketRef.current?.emit('webrtc_signal', {
                to: `chat_${user?.id}_${providerId}`,
                signal: { type: 'candidate', candidate: event.candidate }
            });
        }
    };

    (pc.current as any).ontrack = (event: any) => {
        console.log('Mobile received remote track:', event.track.kind);
        setRemoteStream(event.streams[0]);
        setRenderRtc(r => r + 1);
    };
  };

  const startMedia = async (callType: string) => {
      try {
          console.log('Mobile acquiring media...');
          
          // Double check permissions before calling getUserMedia to avoid native crash
          const stream = await mediaDevices.getUserMedia({
              audio: true,
              video: callType === 'Video' ? {
                  facingMode: 'user',
                  width: 640,
                  height: 480,
                  frameRate: 30
              } : false
          }) as MediaStream;

          setLocalStream(stream);
          setupPeerConnection(); // Ensure PC exists
          
          stream.getTracks().forEach(track => {
              pc.current?.addTrack(track, stream);
          });
      } catch (e) {
          console.error('Media Error:', e);
          Alert.alert("Media Error", "Could not start camera or microphone. Please check permissions.", [
            { text: "Go to Permissions", onPress: () => router.push('/permissions') },
            { text: "Cancel", style: "cancel" }
          ]);
      }
  };

  const stopMedia = () => {
      localStream?.getTracks().forEach(t => t.stop());
      setLocalStream(null);
      setRemoteStream(null);
      pc.current?.close();
      pc.current = null;
  };

  useEffect(() => {
     if (type === 'Call' || type === 'Video') {
        startMedia(type);
     } else {
        stopMedia();
     }
  }, [type]);

  const renderMessage = ({ item }: { item: Message }) => {
    if (item.type === 'system') {
      return (
        <View style={styles.systemPillCt}>
          <View style={styles.systemPill}>
            <Text style={styles.systemText}>{item.text}</Text>
          </View>
        </View>
      );
    }

    if (item.type === 'incoming') {
      return (
        <View style={styles.incomingRow}>
          <View style={styles.incomingBubble}>
            <Text style={styles.msgText}>{item.text}</Text>
          </View>
          <Text style={styles.timeLeft}>{item.time}</Text>
        </View>
      );
    }

    return (
      <View style={styles.outgoingRow}>
        <View style={styles.outgoingBubble}>
          <Text style={styles.msgText}>{item.text}</Text>
        </View>
        <View style={styles.timeRowRight}>
          <Text style={styles.timeRight}>{item.time}</Text>
          <MaterialCommunityIcons name="check-all" size={14} color="#34D399" />
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Dynamic View Content */}
        {type && (type === 'Call' || type === 'Video') ? (
            <CallView 
                type={type as any}
                provider={contact}
                timeLeft={timeLeft}
                wallet={wallet}
                onEndCall={endSession}
                localStream={localStream}
                remoteStream={remoteStream}
            />
        ) : (
            <>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <MaterialIcons name="arrow-back" size={24} color="rgba(255,255,255,0.92)" />
                        <View style={styles.avatarCt}>
                            <Image source={contact.image} style={styles.avatar} />
                            <View
                                style={[
                                    styles.statusDot,
                                    { backgroundColor: contact.status === 'online' ? '#34D399' : '#F59E0B' },
                                ]}
                            />
                        </View>
                    </TouchableOpacity>

                    <View style={styles.headerInfo}>
                        <View style={styles.nameRow}>
                            <Text style={styles.contactName}>{contact.name}</Text>
                            {contact.verified && (
                                <MaterialCommunityIcons name="check-decagram" size={14} color="#00E5FF" />
                            )}
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            {isTyping ? (
                                <Text style={styles.typingText}>typing...</Text>
                            ) : (
                                <Text style={styles.statusText}>
                                    {contact.status === 'online' ? 'Online' : 'Away'}
                                </Text>
                            )}
                            {timeLeft !== null && (
                                <View style={{ backgroundColor: '#EF444425', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
                                    <Text style={{ color: '#EF4444', fontWeight: 'bold', fontSize: 12 }}>
                                        {Math.floor(timeLeft / 60).toString().padStart(2, '0')}:{(timeLeft % 60).toString().padStart(2, '0')}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>

                    <View style={[styles.headerActions, { flexDirection: 'column', gap: 6, alignItems: 'flex-end' }]}>
                        {wallet !== null && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E2028', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: '#FACC1530' }}>
                                <MaterialCommunityIcons name="wallet-outline" size={14} color="#FACC15" style={{ marginRight: 4 }} />
                                <Text style={{ color: '#FACC15', fontWeight: 'bold', fontSize: 11 }}>₹{wallet}</Text>
                            </View>
                        )}
                        <TouchableOpacity style={styles.endBtn} onPress={endSession}>
                            <Text style={styles.endBtnText}>End {type || 'Session'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Messages */}
                <View style={styles.chatBg}>
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={item => item.id}
                    renderItem={renderMessage}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
                    ListEmptyComponent={
                    <View style={styles.emptyCt}>
                        <MaterialCommunityIcons name="chat-outline" size={48} color="rgba(255,255,255,0.10)" />
                        <Text style={styles.emptyText}>
                        Say hello to {contact.name}!{'\n'}They're ready to listen 💛
                        </Text>
                    </View>
                    }
                />

                {/* Typing indicator bubble */}
                {isTyping && (
                    <View style={styles.typingBubbleRow}>
                    <View style={styles.typingBubble}>
                        <Text style={styles.typingDots}>● ● ●</Text>
                    </View>
                    </View>
                )}
                </View>

                {/* Input */}
                <View style={[styles.inputContainer, !isSessionActive && { opacity: 0.5 }]}>
                <View style={[styles.inputWrapper, !isSessionActive && { backgroundColor: '#12141B' }]}>
                    <TextInput
                    style={styles.textInput}
                    placeholder={isSessionActive ? "Message..." : "Session ended"}
                    placeholderTextColor="rgba(255,255,255,0.35)"
                    value={message}
                    onChangeText={setMessage}
                    multiline
                    editable={isSessionActive}
                    onSubmitEditing={sendMessage}
                    />
                </View>
                <TouchableOpacity
                    style={[styles.sendButton, (!message.trim() || isSending || !isSessionActive) && styles.sendButtonDisabled]}
                    onPress={sendMessage}
                    disabled={!message.trim() || isSending || !isSessionActive}
                >
                    {isSending ? (
                    <ActivityIndicator size="small" color="rgba(255,255,255,0.60)" />
                    ) : (
                    <MaterialCommunityIcons name="send" size={20} color="rgba(255,255,255,0.92)" />
                    )}
                </TouchableOpacity>
                </View>
            </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#1A1C23', paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0 },
  container: { flex: 1, backgroundColor: '#0A0B10' },

  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1C23', paddingVertical: 10, paddingHorizontal: 12, elevation: 6 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatarCt: { position: 'relative' },
  avatar: { width: 42, height: 42, borderRadius: 21 },
  statusDot: { position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: '#1A1C23' },
  headerInfo: { flex: 1, marginLeft: 10 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  contactName: { color: 'rgba(255,255,255,0.92)', fontSize: 16, fontWeight: 'bold' },
  statusText: { color: 'rgba(255,255,255,0.45)', fontSize: 12, marginTop: 1 },
  typingText: { color: '#34D399', fontSize: 12, marginTop: 1, fontStyle: 'italic' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  actionBtn: { padding: 4 },
  endBtn: { backgroundColor: '#EF4444', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  endBtnText: { color: '#0A0B10', fontWeight: 'bold', fontSize: 13 },

  chatBg: { flex: 1, backgroundColor: '#0D0E16' },
  listContent: { padding: 16, gap: 10, flexGrow: 1 },

  emptyCt: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80, gap: 16 },
  emptyText: { color: 'rgba(255,255,255,0.25)', fontSize: 14, textAlign: 'center', lineHeight: 22 },

  systemPillCt: { alignItems: 'center', marginVertical: 8 },
  systemPill: { backgroundColor: '#1A1C23', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16 },
  systemText: { color: 'rgba(255,255,255,0.60)', fontSize: 12 },

  incomingRow: { alignItems: 'flex-start', maxWidth: '78%' },
  incomingBubble: { backgroundColor: '#1E2028', padding: 12, borderRadius: 16, borderTopLeftRadius: 4 },
  timeLeft: { color: 'rgba(255,255,255,0.30)', fontSize: 11, marginTop: 4, marginLeft: 6 },

  outgoingRow: { alignItems: 'flex-end', alignSelf: 'flex-end', maxWidth: '78%' },
  outgoingBubble: { backgroundColor: '#4C1D95', padding: 12, borderRadius: 16, borderBottomRightRadius: 4 },
  timeRowRight: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, marginRight: 4 },
  timeRight: { color: 'rgba(255,255,255,0.30)', fontSize: 11 },

  msgText: { color: 'rgba(255,255,255,0.92)', fontSize: 15, lineHeight: 22 },

  typingBubbleRow: { paddingHorizontal: 16, paddingBottom: 8 },
  typingBubble: { backgroundColor: '#1E2028', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, borderTopLeftRadius: 4, alignSelf: 'flex-start' },
  typingDots: { color: 'rgba(255,255,255,0.45)', fontSize: 10, letterSpacing: 3 },

  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, backgroundColor: '#0A0B10', gap: 10 },
  inputWrapper: { flex: 1, backgroundColor: '#1A1C23', borderRadius: 24, paddingHorizontal: 16, paddingVertical: Platform.OS === 'ios' ? 12 : 8, minHeight: 48, justifyContent: 'center' },
  textInput: { color: 'rgba(255,255,255,0.92)', fontSize: 15, maxHeight: 100 },
  sendButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#4C1D95', justifyContent: 'center', alignItems: 'center' },
  sendButtonDisabled: { opacity: 0.4 },
});
