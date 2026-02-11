import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Platform, I18nManager } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppNavigator } from './src/navigation/AppNavigator';

// הפעלת RTL לעברית - חייב להיות לפני כל רנדור
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.webWrapper}>
        <View style={styles.appContainer}>
          <AppNavigator />
        </View>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
  webWrapper: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  appContainer: {
    flex: 1,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 480 : undefined,
  },
});
