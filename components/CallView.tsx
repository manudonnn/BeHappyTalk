import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity, Dimensions,
  Platform, StatusBar as RNStatusBar
} from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons, MaterialIcons, Ionicons } from '@expo/vector-icons';
import { CameraView } from 'expo-camera';
import { 
    RTCView, 
    MediaStream 
} from 'react-native-webrtc';
import InCallManager from 'react-native-incall-manager';
import { useKeepAwake } from 'expo-keep-awake';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
  interpolate
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

interface CallViewProps {
  type: 'Chat' | 'Call' | 'Video';
  provider: any;
  timeLeft: number | null;
  onEndCall: () => void;
  wallet: number | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
}

const PulseCircle = ({ delay = 0, size = 160 }: { delay?: number; size?: number }) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    scale.value = withDelay(delay, withRepeat(withTiming(1.8, { duration: 2500, easing: Easing.out(Easing.quad) }), -1, false));
    opacity.value = withDelay(delay, withRepeat(withTiming(0, { duration: 2500, easing: Easing.out(Easing.quad) }), -1, false));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
    width: size,
    height: size,
    borderRadius: size / 2,
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'rgba(250, 204, 21, 0.4)', // FACC15
  }));

  return <Animated.View style={animatedStyle} />;
};

export default function CallView({ type, provider, timeLeft, onEndCall, wallet, localStream, remoteStream }: CallViewProps) {
  useKeepAwake();
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(true);
  const [cameraType, setCameraType] = useState<'front' | 'environment'>('front');

  useEffect(() => {
    // Force speakerphone for video calls, allow toggle for audio calls
    if (type === 'Video') {
        InCallManager.setSpeakerphoneOn(true);
        setIsSpeaker(true);
      } else {
        InCallManager.setSpeakerphoneOn(isSpeaker);
      }
  }, [isSpeaker, type]);

  useEffect(() => {
    // Handle Mute
    if (localStream) {
        localStream.getAudioTracks().forEach(track => {
            track.enabled = !isMuted;
        });
    }
  }, [isMuted, localStream]);

  const toggleCamera = () => {
    setCameraType(prev => prev === 'front' ? 'environment' : 'front');
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
         // @ts-ignore
         if (track._switchCamera) track._switchCamera();
      });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isVideo = type === 'Video';

  return (
    <View style={styles.container}>
      {/* Background */}
      {isVideo ? (
        <View style={styles.videoPlaceholder}>
           {remoteStream ? (
                <RTCView
                    stream={remoteStream}
                    style={styles.remoteVideo}
                    objectFit="cover"
                />
           ) : (
                <>
                    <Image source={provider.image} style={styles.fullscreenImage} blurRadius={10} />
                    <BlurView intensity={20} style={StyleSheet.absoluteFill} />
                </>
           )}
           <View style={styles.remoteVideoContainer}>
              <View style={styles.videoOverlay}>
                 <Text style={styles.recordingDot}>● LIVE</Text>
              </View>
           </View>
        </View>
      ) : (
        <View style={styles.audioBackground}>
          {remoteStream && (
             <RTCView 
                stream={remoteStream} 
                style={{ position: 'absolute', opacity: 0 }} 
             />
          )}
          <Image source={provider.image} style={styles.fullscreenImage} blurRadius={40} />
          <BlurView intensity={40} style={StyleSheet.absoluteFill} tint="dark" />
        </View>
      )}

      {/* Header Info */}
      <View style={styles.header}>
        <View style={styles.providerInfo}>
          <Text style={styles.providerName}>{provider.name}</Text>
          <Text style={styles.callStatus}>{isVideo ? 'Video Calling...' : 'Voice Calling...'}</Text>
        </View>
        <View style={styles.topRight}>
            {wallet !== null && (
                <View style={styles.walletBadge}>
                    <MaterialCommunityIcons name="wallet-outline" size={14} color="#FACC15" />
                    <Text style={styles.walletText}>₹{wallet}</Text>
                </View>
            )}
            {timeLeft !== null && (
                <View style={styles.timerBadge}>
                    <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
                </View>
            )}
        </View>
      </View>

      {/* Center Content (Avatar/Pulse) */}
      {!isVideo && (
        <View style={styles.centerContent}>
          <View style={styles.pulseContainer}>
            <PulseCircle delay={0} />
            <PulseCircle delay={800} />
            <PulseCircle delay={1600} />
            <View style={styles.avatarBorder}>
              <Image source={provider.image} style={styles.mainAvatar} />
            </View>
          </View>
        </View>
      )}

      {/* Local Video Preview Overlay */}
      {isVideo && localStream && (
        <View style={styles.localPreviewContainer}>
          <RTCView 
            stream={localStream} 
            style={styles.localCamera} 
            objectFit="cover"
            zOrder={1}
            mirror={cameraType === 'front'}
          />
        </View>
      )}

      {/* Controls */}
      <View style={styles.footer}>
        <BlurView intensity={30} tint="dark" style={styles.controlsGrid}>
          <View style={styles.controlsRow}>
            <TouchableOpacity 
              style={[styles.controlBtn, isMuted && styles.activeControl]} 
              onPress={() => setIsMuted(!isMuted)}
            >
              <Ionicons name={isMuted ? "mic-off" : "mic"} size={26} color={isMuted ? "#0A0B10" : "white"} />
              <Text style={styles.controlLabel}>Mute</Text>
            </TouchableOpacity>

            <TouchableOpacity 
                style={styles.endCallBtn} 
                onPress={onEndCall}
            >
              <MaterialCommunityIcons name="phone-hangup" size={32} color="white" />
            </TouchableOpacity>

            {isVideo ? (
               <TouchableOpacity 
                  style={styles.controlBtn} 
                  onPress={toggleCamera}
                >
                  <Ionicons name="camera-reverse" size={26} color="white" />
                  <Text style={styles.controlLabel}>Flip</Text>
                </TouchableOpacity>
            ) : (
                <TouchableOpacity 
                    style={[styles.controlBtn, !isSpeaker && styles.activeControl]} 
                    onPress={() => setIsSpeaker(!isSpeaker)}
                >
                    <Ionicons name={isSpeaker ? "volume-high" : "volume-mute"} size={26} color={!isSpeaker ? "#0A0B10" : "white"} />
                    <Text style={styles.controlLabel}>Speaker</Text>
                </TouchableOpacity>
            )}
          </View>
        </BlurView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  fullscreenImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%', opacity: 0.6 },
  
  header: { 
    position: 'absolute', top: Platform.OS === 'ios' ? 60 : 40, 
    left: 24, right: 24, 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    zIndex: 10 
  },
  providerInfo: { gap: 4 },
  providerName: { color: 'white', fontSize: 24, fontWeight: 'bold', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  callStatus: { color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: '500' },
  
  topRight: { alignItems: 'flex-end', gap: 12 },
  walletBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(250, 204, 21, 0.2)' },
  walletText: { color: '#FACC15', fontWeight: 'bold', fontSize: 12, marginLeft: 4 },
  timerBadge: { backgroundColor: '#EF4444', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  timerText: { color: 'white', fontWeight: 'bold', fontSize: 14 },

  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  pulseContainer: { justifyContent: 'center', alignItems: 'center' },
  avatarBorder: { width: 160, height: 160, borderRadius: 80, borderWidth: 4, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden', backgroundColor: '#1A1C23' },
  mainAvatar: { width: '100%', height: '100%' },

  videoPlaceholder: { flex: 1, backgroundColor: '#0A0B10' },
  remoteVideoContainer: { flex: 1, overflow: 'hidden' },
  remoteVideo: { width: '100%', height: '100%' },
  videoOverlay: { position: 'absolute', top: 120, left: 24, backgroundColor: 'rgba(239, 68, 68, 0.8)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  recordingDot: { color: 'white', fontSize: 10, fontWeight: 'bold' },

  localPreviewContainer: { 
    position: 'absolute', top: 120, right: 24, 
    width: 110, height: 160, 
    borderRadius: 16, overflow: 'hidden', 
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)',
    zIndex: 20,
    elevation: 20
  },
  localCamera: { width: '100%', height: '100%', backgroundColor: 'transparent' },
  localPreviewOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.1)' },

  footer: { position: 'absolute', bottom: 40, left: 24, right: 24, zIndex: 30 },
  controlsGrid: { borderRadius: 32, overflow: 'hidden', paddingVertical: 20, paddingHorizontal: 24, backgroundColor: 'rgba(26, 28, 35, 0.5)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  controlsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  
  controlBtn: { alignItems: 'center', gap: 8, width: 64 },
  activeControl: { backgroundColor: 'white', borderRadius: 32, paddingVertical: 8 },
  controlLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '600' },
  
  endCallBtn: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#EF4444', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8 },
  audioBackground: { flex: 1, backgroundColor: '#0A0B10' },
});
