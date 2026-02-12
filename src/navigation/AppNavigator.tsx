import React, { useState } from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { NavigationContainer } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
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

// Custom drawer content for native
const CustomDrawerContent = ({ navigation }: any) => {
  return (
    <View style={drawerStyles.container}>
      <View style={drawerStyles.header}>
        <Text style={drawerStyles.headerIcon}>π</Text>
        <Text style={drawerStyles.headerTitle}>משחק זיכרון פאי</Text>
      </View>
      {menuItems.map((item) => (
        <TouchableOpacity
          key={item.name}
          style={drawerStyles.itemWrapper}
          onPress={() => {
            navigation.navigate(item.name);
            navigation.closeDrawer();
          }}
        >
          <Text style={drawerStyles.item}>
            {item.icon}  {item.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

// Web: custom menu overlay that works reliably
const WebMenuOverlay = ({ visible, onClose, onNavigate }: {
  visible: boolean;
  onClose: () => void;
  onNavigate: (screen: string) => void;
}) => {
  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={webMenuStyles.backdrop} onPress={onClose}>
        <Pressable style={webMenuStyles.menu} onPress={(e) => e.stopPropagation()}>
          <View style={webMenuStyles.header}>
            <Text style={webMenuStyles.headerIcon}>π</Text>
            <Text style={webMenuStyles.headerTitle}>משחק זיכרון פאי</Text>
          </View>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.name}
              style={webMenuStyles.itemWrapper}
              onPress={() => {
                onNavigate(item.name);
                onClose();
              }}
            >
              <Text style={webMenuStyles.item}>
                {item.icon}  {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const webMenuStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  menu: {
    width: 260,
    backgroundColor: Theme.colors.background,
    paddingTop: 60,
    borderLeftWidth: 1,
    borderLeftColor: Theme.colors.border,
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

// Web navigator with custom hamburger menu
const WebNavigator: React.FC = () => {
  const [menuVisible, setMenuVisible] = useState(false);
  const navigationRef = React.useRef<any>(null);

  const handleNavigate = (screen: string) => {
    navigationRef.current?.navigate(screen);
  };

  return (
    <NavigationContainer ref={navigationRef}>
      <WebMenuOverlay
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onNavigate={handleNavigate}
      />
      <Drawer.Navigator
        drawerContent={() => null}
        screenOptions={{
          headerStyle: {
            backgroundColor: Theme.colors.background,
          },
          headerTintColor: Theme.colors.text,
          headerTitleStyle: {
            fontWeight: Theme.fontWeight.bold,
          },
          drawerPosition: 'right',
          swipeEnabled: false,
          drawerStyle: { width: 0 },
          sceneContainerStyle: {
            backgroundColor: Theme.colors.background,
          },
          headerRight: () => (
            <TouchableOpacity
              onPress={() => setMenuVisible(true)}
              style={{ paddingHorizontal: 16 }}
            >
              <Text style={{ color: Theme.colors.text, fontSize: 24 }}>☰</Text>
            </TouchableOpacity>
          ),
        }}
      >
        <Drawer.Screen name="Home" component={HomeScreen} options={{ title: 'בית' }} />
        <Drawer.Screen name="Training" component={TrainingScreen} options={{ title: 'אימון' }} />
        <Drawer.Screen name="Challenge" component={ChallengeScreen} options={{ title: 'אתגר' }} />
        <Drawer.Screen name="Statistics" component={StatisticsScreen} options={{ title: 'סטטיסטיקות' }} />
        <Drawer.Screen name="PiView" component={PiViewScreen} options={{ title: 'רשימת ספרות' }} />
        <Drawer.Screen name="Notes" component={NotesScreen} options={{ title: 'פתקים' }} />
        <Drawer.Screen name="Recordings" component={RecordingsScreen} options={{ title: 'הקלטות' }} />
        <Drawer.Screen name="Settings" component={SettingsScreen} options={{ title: 'הגדרות' }} />
      </Drawer.Navigator>
    </NavigationContainer>
  );
};

// Native navigator with standard drawer
const NativeNavigator: React.FC = () => {
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
          drawerType: 'front',
          overlayColor: 'rgba(0,0,0,0.7)',
          drawerStyle: {
            backgroundColor: Theme.colors.background,
            width: 260,
          },
          sceneContainerStyle: {
            backgroundColor: Theme.colors.background,
          },
        }}
      >
        <Drawer.Screen name="Home" component={HomeScreen} options={{ title: 'בית' }} />
        <Drawer.Screen name="Training" component={TrainingScreen} options={{ title: 'אימון' }} />
        <Drawer.Screen name="Challenge" component={ChallengeScreen} options={{ title: 'אתגר' }} />
        <Drawer.Screen name="Statistics" component={StatisticsScreen} options={{ title: 'סטטיסטיקות' }} />
        <Drawer.Screen name="PiView" component={PiViewScreen} options={{ title: 'רשימת ספרות' }} />
        <Drawer.Screen name="Notes" component={NotesScreen} options={{ title: 'פתקים' }} />
        <Drawer.Screen name="Recordings" component={RecordingsScreen} options={{ title: 'הקלטות' }} />
        <Drawer.Screen name="Settings" component={SettingsScreen} options={{ title: 'הגדרות' }} />
      </Drawer.Navigator>
    </NavigationContainer>
  );
};

export const AppNavigator: React.FC = () => {
  return Platform.OS === 'web' ? <WebNavigator /> : <NativeNavigator />;
};
