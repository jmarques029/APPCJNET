import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
            }}>
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Camera',
                    tabBarIcon: () => <Ionicons name="camera-outline" size={24} color={"black"} />,
                }}
            />
            <Tabs.Screen
                name="maps"
                options={{
                    title: 'Maps',
                    tabBarIcon: () => <Ionicons name="map-outline" size={24} color={"black"} />,
                }}
            />
            <Tabs.Screen
                name="list"
                options={{
                    title: 'Lista',
                    tabBarIcon: () => <Ionicons name="list-outline" size={24} color={"black"} />,
                }}
            />
        </Tabs>
    );
}