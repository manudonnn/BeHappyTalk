import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, Platform, StatusBar as RNStatusBar, ScrollView, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons, AntDesign, FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function RazorpayMock() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      
      {/* Dark Header */}
      <View style={styles.darkHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        
        <View style={styles.merchantInfo}>
          <View style={styles.merchantLogoBox}>
            <Text style={styles.logoChar}>C</Text>
          </View>
          <View>
            <Text style={styles.merchantName}>Clarity</Text>
            <View style={styles.trustBadge}>
              <MaterialIcons name="security" size={12} color="#4ADE80" />
              <Text style={styles.trustText}>Razorpay Trusted Business</Text>
            </View>
          </View>
        </View>

        <View style={styles.userIconCircle}>
          <MaterialIcons name="person" size={20} color="#CFD0D6" />
        </View>
      </View>

      {/* Light Content Area (Webview style) */}
      <View style={styles.contentArea}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24, paddingBottom: 100 }}>
          
          <Text style={styles.pageTitle}>Payment Options</Text>
          
          <Text style={styles.sectionSubtitle}>Recommended</Text>
          
          <View style={styles.cardGroup}>
            <TouchableOpacity style={styles.paymentMethodRow}>
               <View style={styles.methodLeft}>
                 <AntDesign name="google" size={20} color="#4285F4" />
                 <Text style={styles.methodText}>UPI - Google Pay</Text>
               </View>
               <MaterialIcons name="chevron-right" size={24} color="#CFD0D6" />
            </TouchableOpacity>
            
            <View style={styles.divider} />
            
            <TouchableOpacity style={styles.paymentMethodRow}>
               <View style={styles.methodLeft}>
                 <FontAwesome5 name="google-pay" size={20} color="#0EA5E9" />
                 <Text style={styles.methodText}>UPI - PayTM</Text>
               </View>
               <MaterialIcons name="chevron-right" size={24} color="#CFD0D6" />
            </TouchableOpacity>
          </View>

          <Text style={[styles.sectionSubtitle, { marginTop: 32 }]}>All Payment Options</Text>
          
          <View style={styles.cardGroup}>
             <View style={styles.upiHeader}>
                <View style={styles.upiTitleRow}>
                    <AntDesign name="swap" size={20} color="#656673" style={{ transform: [{ rotate: '90deg' }] }} />
                    <Text style={styles.methodText}>UPI</Text>
                    <View style={styles.tinyIcons}>
                      {/* Fake Tiny logos */}
                      <View style={[styles.tinyLogo, {backgroundColor: '#4285F4'}]} />
                      <View style={[styles.tinyLogo, {backgroundColor: '#A855F7'}]} />
                      <View style={[styles.tinyLogo, {backgroundColor: '#0EA5E9'}]} />
                    </View>
                </View>
                <MaterialIcons name="expand-less" size={24} color="#8A8A93" />
             </View>

             <View style={styles.upiGrid}>
                <View style={styles.upiGridItem}><Text style={styles.gridItemText}>Google Pay</Text></View>
                <View style={styles.upiGridItem}><Text style={styles.gridItemText}>PayTM</Text></View>
                <View style={styles.upiGridItem}><Text style={styles.gridItemText}>Axis Mobile</Text></View>
                <View style={styles.upiGridItem}><Text style={styles.gridItemText}>Apps & UPI</Text></View>
             </View>
          </View>

        </ScrollView>
      </View>

      {/* Fixed Footer */}
      <View style={styles.fixedFooter}>
        <View style={styles.termsBox}>
          <Text style={styles.termsText}>
            By proceeding, I agree to Razorpay's <Text style={{fontWeight: 'bold'}}>Privacy Notice</Text> • 
            <Text style={{textDecorationLine: 'underline'}}> Edit Preferences</Text>
          </Text>
        </View>
        <View style={styles.checkoutBar}>
          <View>
            <Text style={styles.totalAmount}>₹999</Text>
            <Text style={styles.viewDetailsText}>View Details ^</Text>
          </View>
          <TouchableOpacity style={styles.continueButton}>
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#21222C', paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0 },
  darkHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2B2C3A', paddingVertical: 16, paddingHorizontal: 16, justifyContent: 'space-between' },
  backButton: { },
  merchantInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, marginLeft: 16 },
  merchantLogoBox: { width: 44, height: 44, borderRadius: 8, borderWidth: 1, borderColor: '#4E4F5A', justifyContent: 'center', alignItems: 'center' },
  logoChar: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  merchantName: { color: '#FFF', fontSize: 18, fontWeight: '600' },
  trustBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#4ADE8020', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, gap: 4, marginTop: 4 },
  trustText: { color: '#4ADE80', fontSize: 10, fontWeight: '600' },
  userIconCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#4E4F5A', justifyContent: 'center', alignItems: 'center' },
  
  contentArea: { flex: 1, backgroundColor: '#F9FAFB' },
  pageTitle: { fontSize: 20, fontWeight: 'bold', color: '#1F2937', marginBottom: 24 },
  sectionSubtitle: { fontSize: 14, color: '#6B7280', marginBottom: 12 },
  
  cardGroup: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden' },
  paymentMethodRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  methodLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  methodText: { fontSize: 16, color: '#374151', fontWeight: '500' },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginLeft: 48 },
  
  upiHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  upiTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tinyIcons: { flexDirection: 'row', gap: 4 },
  tinyLogo: { width: 14, height: 14, borderRadius: 7 },
  
  upiGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, paddingTop: 0, gap: 12 },
  upiGridItem: { width: '48%', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingVertical: 16, alignItems: 'center', backgroundColor: '#FFFFFF' },
  gridItemText: { fontSize: 14, color: '#4B5563', fontWeight: '500' },

  fixedFooter: { backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  termsBox: { backgroundColor: '#F3F4F6', paddingVertical: 12, paddingHorizontal: 24 },
  termsText: { fontSize: 12, color: '#6B7280', textAlign: 'center', lineHeight: 18 },
  checkoutBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  totalAmount: { fontSize: 20, fontWeight: 'bold', color: '#1F2937' },
  viewDetailsText: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  continueButton: { backgroundColor: '#111827', paddingHorizontal: 40, paddingVertical: 14, borderRadius: 8 },
  continueButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' }
});
