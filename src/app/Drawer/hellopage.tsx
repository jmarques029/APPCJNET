import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function Hello() {
    return (
        <View style={styles.container}>
            <Text style={styles.text}>Hello World!</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    text: {
        fontSize: 32,
        fontWeight: 'bold',
    },
})