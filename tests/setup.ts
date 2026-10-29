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
    getForegroundPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
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

// Mock expo-sqlite para ambiente Jest/Node
jest.mock('expo-sqlite', () => {
    const { createMockSQLiteDatabase } = require('./mocks/mockSQLite');
    const mockDb = createMockSQLiteDatabase();
    return {
        openDatabaseAsync: jest.fn(async () => mockDb),
        openDatabaseSync: jest.fn(() => mockDb),
    };
});

// Mock expo-camera para testes unitários
jest.mock('expo-camera', () => {
    const React = require('react');
    const { View } = require('react-native');

    const CameraView = React.forwardRef((props: any, ref: any) => {
        React.useImperativeHandle(ref, () => ({
            takePictureAsync: jest.fn(async (options?: any) => ({
                uri: 'file:///storage/emulated/0/cjnet/camera-captured.jpg',
                width: 1080,
                height: 1920,
            })),
            resumePreview: jest.fn(async () => {}),
            pausePreview: jest.fn(async () => {}),
        }));
        return React.createElement(View, { testID: 'mock-camera-view', ...props }, props.children);
    });

    return {
        CameraView,
        useCameraPermissions: () => [
            { granted: true, canAskAgain: true, status: 'granted' },
            jest.fn(async () => ({ granted: true, status: 'granted' })),
        ],
        Camera: {
            requestCameraPermissionsAsync: jest.fn(async () => ({ granted: true, status: 'granted' })),
            getCameraPermissionsAsync: jest.fn(async () => ({ granted: true, status: 'granted' })),
        },
    };
});

// Mock expo-image-picker para disparar captura de câmera nativa em testes
jest.mock('expo-image-picker', () => ({
    requestCameraPermissionsAsync: jest.fn(async () => ({ status: 'granted', granted: true })),
    requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ status: 'granted', granted: true })),
    launchCameraAsync: jest.fn(async () => ({
        canceled: false,
        assets: [
            {
                uri: 'file:///storage/emulated/0/cjnet/foto-camera-real-celular.jpg',
                width: 1080,
                height: 1920,
                fileSize: 450 * 1024,
            },
        ],
    })),
    launchImageLibraryAsync: jest.fn(async () => ({
        canceled: false,
        assets: [
            {
                uri: 'file:///storage/emulated/0/cjnet/foto-galeria-celular.jpg',
                width: 1080,
                height: 1920,
                fileSize: 420 * 1024,
            },
        ],
    })),
    CameraType: {
        back: 'back',
        front: 'front',
    },
}));

// Mock react-native-maps para ambiente de testes e web
jest.mock('react-native-maps', () => {
    const React = require('react');
    const { View } = require('react-native');

    const MockMapView = (props: any) => React.createElement(View, { testID: 'mock-map-view', ...props }, props.children);
    const MockMarker = (props: any) => React.createElement(View, { testID: 'mock-marker', ...props }, props.children);
    const MockPolygon = (props: any) => React.createElement(View, { testID: 'mock-polygon', ...props }, props.children);
    const MockCircle = (props: any) => React.createElement(View, { testID: 'mock-circle', ...props }, props.children);

    return {
        __esModule: true,
        default: MockMapView,
        MapView: MockMapView,
        Marker: MockMarker,
        Polygon: MockPolygon,
        Circle: MockCircle,
        PROVIDER_GOOGLE: 'google',
        PROVIDER_DEFAULT: 'default',
    };
});

