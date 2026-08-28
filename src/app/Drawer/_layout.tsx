import { Drawer } from 'expo-router/drawer'

export default function DrawerLayout() {
    return (
        <Drawer
            screenOptions={{

            }}
        >
            <Drawer.Screen
                name='(tabs)'
                options={{
                    drawerLabel: 'Painel',
                    title: 'Painel'
                }}
            />
            <Drawer.Screen
                name='hellopage'
                options={{
                    drawerLabel: 'Hello',
                    title: 'Hello'
                }}
            />
        </Drawer>
    )
}