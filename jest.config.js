module.exports = {

    preset: 'jest-expo',

    setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect', '<rootDir>/tests/setup.ts'],

    transformIgnorePatterns: [

        'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg)'

    ],

    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
    },
    testPathIgnorePatterns: [

        '/node_modules/',

        '/android/',

        '/ios/',

    ]

};