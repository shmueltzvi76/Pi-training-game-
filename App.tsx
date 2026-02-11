import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, I18nManager, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppNavigator } from './src/navigation/AppNavigator';

// הפעלת RTL לעברית - חייב להיות לפני כל רנדור
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

// Web-specific global CSS reset for full-screen responsiveness
if (Platform.OS === 'web') {
  const style = document.createElement('style');
  style.textContent = `
    * { box-sizing: border-box; }
    html, body, #root {
      width: 100% !important;
      height: 100dvh !important;
      height: 100vh !important;
      margin: 0 !important;
      padding: 0 !important;
      background-color: #000000 !important;
      overflow: hidden !important;
    }
    @supports (height: 100dvh) {
      html, body, #root {
        height: 100dvh !important;
      }
    }
    #root > div {
      width: 100% !important;
      height: 100% !important;
    }
  `;
  document.head.appendChild(style);
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar style="light" />
      <AppNavigator />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
    ...(Platform.OS === 'web' ? {
      width: '100%' as any,
      height: '100%' as any,
      minHeight: '100vh' as any,
    } : {}),
  },
});
