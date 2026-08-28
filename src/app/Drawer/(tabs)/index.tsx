import { container } from "@/factorie/container";
import { CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function Camera() {
    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [facing, setFacing] = useState<CameraType>('back');
    const [permission, requestPermission] = useCameraPermissions();
    const cameraRef = useRef<CameraView>(null);
    const [uri, setUri] = useState<string | null>(null);

    useEffect(() => {
        async function getCurrentLocation() {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert("Permissão negada", "Precisamos de acesso à sua localização para salvar a observação.");
                return;
            }

            let location = await Location.getCurrentPositionAsync({});
            setLocation(location);
        }
        getCurrentLocation();
    }, [])

    if (!permission) {
        return <View />
    }

    if (!permission.granted) {
        return (
            <View>
                <Text>Permissão negada</Text>
                <Button title="Conceder permissão" onPress={requestPermission} />
            </View>
        )
    }

    async function savePhoto() {
        if (!uri || !location) {
            Alert.alert("Erro", "Localização ou foto indisponível.");
            return;
        }

        await container.registerObservation.execute({
            photo: uri,
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
        });
        setUri(null);
        Alert.alert("Sucesso", "Foto salva com sucesso!");
    }

    function toggleCameraFacing() {
        setFacing(current => current === 'back' ? 'front' : 'back');
    }

    async function takePicture() {
        if (cameraRef.current) {
            const foto = await cameraRef.current.takePictureAsync();
            if (foto.uri) {
                setUri(foto.uri);
            }
        }
    }

    function mostrarFoto() {
        if (uri) {
            return (
                <>
                    <Image source={{ uri }} style={{ flex: 1 }} />
                    <View style={styles.buttonFlip}>
                        <TouchableOpacity style={styles.button} onPress={savePhoto}>
                            <Text style={styles.text}>Salvar</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.buttonCapture}>
                        <TouchableOpacity style={styles.button} onPress={() => setUri(null)}>
                            <Text style={styles.text}>Cancelar</Text>
                        </TouchableOpacity>
                    </View>
                </>
            )
        }
    }

    function viewCamera() {
        return (
            <>
                <CameraView style={styles.camera} facing={facing} ref={cameraRef} />
                <View style={styles.buttonFlip}>
                    <TouchableOpacity style={styles.button} onPress={toggleCameraFacing}>
                        <Text style={styles.text}>Virar Câmera</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.buttonCapture}>
                    <TouchableOpacity style={styles.button} onPress={takePicture}>
                        <Text style={styles.text}>Capturar</Text>
                    </TouchableOpacity>
                </View>
            </>
        )
    }

    return (
        <View style={styles.camera}>
            {uri ? mostrarFoto() : viewCamera()}
        </View>
    );
}

const styles = StyleSheet.create({
    camera: {
        flex: 1,
    },
    buttonFlip: {
        position: 'absolute',
        bottom: 30,
        right: 30,
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: 15,
        borderRadius: 10,
    },
    buttonCapture: {
        position: 'absolute',
        bottom: 30,
        left: 30,
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: 15,
        borderRadius: 10,
    },
    button: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    text: {
        fontSize: 18,
        color: 'white',
        fontWeight: 'bold',
    },
});