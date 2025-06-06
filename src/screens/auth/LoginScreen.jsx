"use client"

import { useState } from "react"
import { View, StyleSheet, Image, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert } from "react-native"
import { TextInput, Button, Text, Headline, Caption, HelperText } from "react-native-paper"
import { SafeAreaView } from "react-native-safe-area-context"
import { useAuth } from "../../context/AuthContext"
import { StatusBar } from "react-native"
import auth from '@react-native-firebase/auth'
import AsyncStorage from '@react-native-async-storage/async-storage';


const LoginScreen = ({ navigation }) => {
  const { signIn } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [secureTextEntry, setSecureTextEntry] = useState(true)

  const handleGuestLogin = async () => {
    const response = await auth().signInAnonymously()
      .then(() => {
        Alert.alert("Guest Signin","You signed in anonymously")
        navigation.reset({
          index: 0,
          routes: [{ name: "Main" }],
        })
        setLoading(false)
      })
      .catch(error => {
        if (error.code === 'auth/operation-not-allowed') {
          console.log('Enable anonymous in your firebase console.');
        }

        console.error(error);
      });
  }

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Please fill in all fields")
      return
    }

    setLoading(true)
    setError("")

    try {
      const response = await auth().signInWithEmailAndPassword(email, password)
      const loggedInUser = response.user;

      if (!loggedInUser.emailVerified) { 
        Alert.alert("SignIn Error", "Please verify your email", [
          {
            text: "Resend Verification Email",
            onPress: async () => {
              try {
                await loggedInUser.reload();

                if (loggedInUser.emailVerified) {
                  Alert.alert("Already Verified", "Your email is already verified.");
                  return;
                }

                // Add a simple cooldown mechanism using a timestamp
                const lastSent = await AsyncStorage.getItem("lastVerificationSent");
                const now = Date.now();

                if (lastSent && now - parseInt(lastSent) < 60000) {
                  Alert.alert("Wait", "Please wait at least 1 minute before resending.");
                  return;
                }

                await loggedInUser.sendEmailVerification();
                await AsyncStorage.setItem("lastVerificationSent", now.toString());

                Alert.alert("Verification Sent", "Check your inbox or spam folder.");
              } catch (err) {
                console.error("Resend Error:", err);

                if (err.code === 'auth/too-many-requests') {
                  Alert.alert("Too Many Requests", "You’ve sent too many requests. Please wait a while and try again later.");
                } else {
                  Alert.alert("Error", err.message || "Failed to resend verification email.");
                }
              } finally {
                await auth().signOut();
              }
            }
          },

          {
            text: "Cancel",
            style: "cancel",
            onPress: async () => {
              await auth().signOut();
            }
          }
        ]);

        throw new Error("Please verify your email before logging in.");
      }


      navigation.reset({
        index: 0,
        routes: [{ name: "Main" }],
      })
      setLoading(false)
    } catch (err) {
      console.log("Login error: ", err)
      setError(err.message || "Failed to sign in.")
      setLoading(false)
    }
  }



  return (
    <>
    <StatusBar backgroundColor="#ffffff" barStyle="dark-content"/>
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.logoContainer}>
            <View style={styles.logoBackground}>
              <Image source={require("../../assets/logo.png")} style={styles.logo} resizeMode="contain" />
            </View>
            <Headline style={styles.title}>Welcome Back</Headline>
            <Caption style={styles.subtitle}>Sign in to continue to CloudShare</Caption>
          </View>

          <View style={styles.formContainer}>
            {error ? (
              <HelperText type="error" visible={!!error}>
                {error}
              </HelperText>
            ) : null}

            <TextInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
            />

            <TextInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={secureTextEntry}
              mode="outlined"
              style={styles.input}
              right={
                <TextInput.Icon
                  name={secureTextEntry ? "eye-off" : "eye"}
                  onPress={() => setSecureTextEntry(!secureTextEntry)}
                />
              }
            />

            <TouchableOpacity onPress={() => navigation.navigate("ForgotPassword")} style={styles.forgotPassword}>
              <Text style={styles.forgotPasswordText}>Forgot password?</Text>
            </TouchableOpacity>

            <Button
              mode="contained"
              onPress={handleLogin}
              loading={loading}
              disabled={loading}
              style={styles.button}
              contentStyle={styles.buttonContent}
            >
              Sign In
            </Button>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate("Register")}>
                <Text style={styles.footerLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ alignItems: "center", marginTop: 10 }}>
            <Button
              mode="outlined"
              onPress={() => handleGuestLogin()}
              style={{ width: "100%" }}
              contentStyle={styles.buttonContent}
            >
              Continue Without Sign In
            </Button>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView></>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    justifyContent: "center",
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 30,
  },
  logoBackground: {
    width: 80,
    height: 80,
    borderRadius: 40,
    //backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  logo: {
    width: 100,
    height: 100,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
  },
  formContainer: {
    width: "100%",
  },
  input: {
    marginBottom: 16,
  },
  forgotPassword: {
    alignSelf: "flex-end",
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: "#3b82f6",
    fontWeight: "500",
  },
  button: {
    marginBottom: 24,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  footerText: {
    color: "#666",
  },
  footerLink: {
    color: "#3b82f6",
    fontWeight: "500",
  },
})

export default LoginScreen
