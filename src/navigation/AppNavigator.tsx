import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { NavigationContainer } from '@react-navigation/native';
import { View, Text, StyleSheet } from 'react-native';
import { Theme } from '@constants/theme';
import { HomeScreen } from '@screens/HomeScreen';
import { TrainingScreen } from '@screens/TrainingScreen';
import { ChallengeScreen } from '@screens/ChallengeScreen';
import { StatisticsScreen } from '@screens/StatisticsScreen';
import { NotesScreen } from '@screens/NotesScreen';
import { SettingsScreen } from '@screens/SettingsScreen';
import { PiViewScreen } from '@screens/PiViewScreen';
import { RecordingsScreen } from '@screens/RecordingsScreen';

const Drawer = createDrawerNavigator();

// Custom drawer content with Hebrew RTL
const CustomDrawerContent = ({ navigation }: any) => {
  const menuItems = [
    { name: 'Home', label: 'בית', icon: '🏠' },
    { name: 'Training', label: 'אימון', icon: '🧠' },
    { name: 'Challenge', label: 'אתגר', icon: '🏆' },
    { name: 'Statistics', label: 'סטטיסטיקות', icon: '📊' },
    { name: 'PiView', label: 'רשימת ספרות', icon: '🔢' },
    { name: 'Notes', label: 'פתקים', icon: '📝' },
    { name: 'Recordings', label: 'הקלטות', icon: '🎙️' },
    { name: 'Settings', label: 'הגדרות', icon: '⚙️' },
  ];

  return (
    <View style={drawerStyles.container}>
      <View style={drawerStyles.header}>
        <Text style={drawerStyles.headerIcon}>π</Text>
        <Text style={drawerStyles.headerTitle}>משחק זיכרון פאי</Text>
      </View>
      {menuItems.map((item) => (
        <View key={item.name} style={drawerStyles.itemWrapper}>
          <Text
            style={drawerStyles.item}
            onPress={() => navigation.navigate(item.name)}
          >
            {item.icon}  {item.label}
          </Text>
        </View>
      ))}
    </View>
  );
};

const drawerStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
    marginBottom: 16,
  },
  headerIcon: {
    fontSize: 48,
    color: Theme.colors.primary,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: Theme.fontSize.lg,
    color: Theme.colors.text,
    fontWeight: Theme.fontWeight.bold,
    marginTop: 8,
  },
  itemWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  item: {
    fontSize: Theme.fontSize.lg,
    color: Theme.colors.text,
    textAlign: 'right',
  },
});

export const AppNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <Drawer.Navigator
        drawerContent={(props) => <CustomDrawerContent {...props} />}
        screenOptions={{
          headerStyle: {
            backgroundColor: Theme.colors.background,
          },
          headerTintColor: Theme.colors.text,
          headerTitleStyle: {
            fontWeight: Theme.fontWeight.bold,
          },
          drawerPosition: 'right',
          drawerStyle: {
            backgroundColor: Theme.colors.background,
            width: 260,
          },
        }}
      >
        <Drawer.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: 'בית' }}
        />
        <Drawer.Screen
          name="Training"
          component={TrainingScreen}
          options={{ title: 'אימון' }}
        />
        <Drawer.Screen
          name="Challenge"
          component={ChallengeScreen}
          options={{ title: 'אתגר' }}
        />
        <Drawer.Screen
          name="Statistics"
          component={StatisticsScreen}
          options={{ title: 'סטטיסטיקות' }}
        />
        <Drawer.Screen
          name="PiView"
          component={PiViewScreen}
          options={{ title: 'רשימת ספרות' }}
        />
        <Drawer.Screen
          name="Notes"
          component={NotesScreen}
          options={{ title: 'פתקים' }}
        />
        <Drawer.Screen
          name="Recordings"
          component={RecordingsScreen}
          options={{ title: 'הקלטות' }}
        />
        <Drawer.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: 'הגדרות' }}
        />
      </Drawer.Navigator>
    </NavigationContainer>
  );
};
