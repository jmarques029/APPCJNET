import { Observation } from "@/domain/entities/Observation";
import { container } from "@/factorie/container";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, View } from "react-native";

export default function List() {
    const [list, setList] = useState<Observation[]>([]);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            let active = true;
            setLoading(true);
            container.listObservations.execute().then((res) => { //then é a mesma coisa de usar async/await
                console.log(res)
                if (active) {
                    setList(res)
                }
            }).finally(() => {
                if (active) setLoading(false)
            })
            return () => { active = false; }
        }, [])
    )

    const renderItem = ({ item }: { item: Observation }) => {
        return (
            <View style={styles.card}>
                <Image source={{ uri: item.photo }} resizeMode="cover" style={styles.image} />
                <View style={styles.info}>
                    <Text style={styles.text}>
                        <Text style={{ fontWeight: 'bold' }}>Latitude: </Text>
                        {item.coordinates.latitude.toFixed(4)}
                    </Text>
                    <Text style={styles.text}>
                        <Text style={{ fontWeight: 'bold' }}>Longitude: </Text>
                        {item.coordinates.longitude.toFixed(4)}
                    </Text>
                </View>
            </View>
        )
    }

    return (
        <View style={styles.container}>
            {loading ? (
                <View style={styles.loader}>
                    <ActivityIndicator size="large" color="#000" />
                </View>
            ) : (
                <FlatList
                    data={list}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                />
            )
            }
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    loader: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        padding: 16,
        gap: 16,
    },
    card: {
        flexDirection: 'column',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
        gap: 12,
    },
    image: {
        width: '100%',
        height: 300,
        borderRadius: 8,
        backgroundColor: '#e0e0e0',
    },
    info: {
        width: '100%',
        gap: 8
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    text: {
        fontSize: 14,
        color: '#666',
    },
})