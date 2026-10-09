import '@testing-library/jest-native/extend-expect';

(global as any).IS_REACT_ACT_ENVIRONMENT = true;




// Mock @expo/vector-icons para evitar warnings de act(...) por carregamento assíncrono de fontes nos testes

jest.mock('@expo/vector-icons', () => {

    const React = require('react');

    const { Text } = require('react-native');

    const MockIcon = (props: any) => React.createElement(Text, props, props.name);

    return {

        Ionicons: MockIcon,

        MaterialIcons: MockIcon,

        FontAwesome: MockIcon,

        Feather: MockIcon,

        AntDesign: MockIcon,

        Entypo: MockIcon,

    };

});

// Mock expo-location para testes unitários
jest.mock('expo-location', () => ({
    requestForegroundPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
    getCurrentPositionAsync: jest.fn(async () => ({
        coords: {
            latitude: -21.1850,
            longitude: -45.4350,
            altitude: 0,
            accuracy: 5,
            altitudeAccuracy: 5,
            heading: 0,
            speed: 0,
        },
        timestamp: Date.now(),
    })),
    Accuracy: {
        Balanced: 3,
        High: 4,
        Highest: 5,
        Low: 2,
        Lowest: 1,
    },
}));
