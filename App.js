import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import FolderListScreen from './src/screens/FolderListScreen';
import FolderDetailScreen from './src/screens/FolderDetailScreen';
import ColorPickerScreen from './src/screens/ColorPickerScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <>
      <StatusBar style="dark" />
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="FolderList"
          screenOptions={{
            headerStyle: {
              backgroundColor: '#fff',
            },
            headerTintColor: '#007AFF',
            headerTitleStyle: {
              fontWeight: '600',
            },
          }}
        >
          <Stack.Screen
            name="FolderList"
            component={FolderListScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="FolderDetail"
            component={FolderDetailScreen}
            options={({ route }) => ({
              title: route.params?.folder?.name || 'Folder',
            })}
          />
          <Stack.Screen
            name="ColorPicker"
            component={ColorPickerScreen}
            options={{ title: 'Extract Color' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}
