import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleLogin = () => {
    router.replace('/Drawer/(tabs)' as any)
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.card}>

          <View style={styles.logoContainer}>
            <View style={styles.logo}>
              <Ionicons name="leaf" size={32} color={'white'} />
            </View>
          </View>

          <Text style={styles.title}>CJNET</Text>
          <Text style={styles.subTitle}>Um app da sua internet</Text>

          <Text style={styles.label}>Email</Text>
          <View style={styles.inputContainer}>
            <Ionicons name='mail-outline' size={24} color='#666' style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder='seu@email.com'
              placeholderTextColor="#999"
              keyboardType='email-address'
              autoCapitalize='none'
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <Text style={styles.label}>Password</Text>
          <View style={styles.inputContainer}>
            <Ionicons name='lock-closed-outline' size={24} color='#666' style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder='******'
              placeholderTextColor="#999"
              autoCapitalize='none'
              secureTextEntry={true}
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <TouchableOpacity onPress={handleLogin} style={styles.button}>
            <Text style={styles.buttonText}>Entrar</Text>
          </TouchableOpacity>

        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9ff',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#ffffff',
    width: '100%',
    borderRadius: 24,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subTitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 54,
    backgroundColor: '#fafafa',
    marginBottom: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    height: '100%',
  },
  button: {
    backgroundColor: '#000',
    borderRadius: 12,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  }
})