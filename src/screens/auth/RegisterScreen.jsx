"use client"

import firestore from '@react-native-firebase/firestore';
import { useState } from "react"
import { View, StyleSheet, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert } from "react-native"
import { TextInput, Button, Text, Headline, Caption, HelperText } from "react-native-paper"
import { SafeAreaView } from "react-native-safe-area-context"
//import { useAuth } from "../../context/AuthContext"
import { StatusBar } from "react-native"
import auth from '@react-native-firebase/auth'
import { setAuthRegistrationStatus } from '../../context/AuthContext';

const RegisterScreen = ({ navigation }) => {
  //const { signUp } = useAuth()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [secureTextEntry, setSecureTextEntry] = useState(true)
  const [secureConfirmTextEntry, setSecureConfirmTextEntry] = useState(true)

  const handleGuestLogin = async () => {
    const response = await auth().signInAnonymously()
      .then(() => {
        Alert.alert("Guest Signin", "You signed in anonymously")
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

  const waitForCurrentUser = async (retries = 10, delay = 100) => {
  for (let i = 0; i < retries; i++) {
    const currentUser = auth().currentUser;
    if (currentUser) return currentUser;
    await new Promise(res => setTimeout(res, delay));
  }
  throw new Error("auth().currentUser not available after registration.");
};


  const handleRegister = async () => {
  if (!name || !email || !password || !confirmPassword) {
    setError("Please fill in all fields");
    return;
  }

  if (!isValidEmail(email)) {
    setError("Provide proper email");
    return;
  }

  if (password !== confirmPassword) {
    setError("Passwords do not match");
    return;
  }

  setLoading(true);
  setError("");
  setAuthRegistrationStatus(true);

  try {
    const userCredential = await auth().createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;

    if (!user) throw new Error("User registration failed");

    await user.updateProfile({ displayName: name });
    await user.sendEmailVerification();

    await firestore()
      .collection("users")
      .doc(user.uid)
      .set({
        name,
        email: user.email,
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

    await auth().signOut();

    Alert.alert("Success", "Account created! Please verify your email.");
    navigation.reset({
      index: 0,
      routes: [{ name: "Login" }],
    });
  } catch (err) {
    console.log("Register error: ", err);

    if (err.code === "auth/email-already-in-use") {
      setError("This email is already registered. Try signing in instead.");
    } else if (err.code === "auth/invalid-email") {
      setError("The email address is invalid.");
    } else if (err.code === "auth/weak-password") {
      setError("Password should be at least 6 characters.");
    } else {
      setError("Registration failed. Please try again.");
    }
  } finally {
      setAuthRegistrationStatus(false); // <--- Signal registration end
      setLoading(false);
    }

  setLoading(false);
};

  const isValidEmail = (email) => {
    const basicFormat = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    const suspiciousPatterns = [
      /^\d{5,}@/, // starts with 5+ digits
      /@(?:gm|gn|gl)\.com$/, // misspelled Gmail
      /@email\.com$/, // fake domain
      /\.con$/, // typo of '.com'
    ]

    if (!basicFormat.test(email)) return false

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(email.toLowerCase())) {
        return false
      }
    }

    return true
  }



  return (
    <>
      <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.headerContainer}>
              <Headline style={styles.title}>Create Account</Headline>
              <Caption style={styles.subtitle}>Sign up to get started with CloudShare</Caption>
            </View>

            <View style={styles.formContainer}>
              {error ? (
                <HelperText type="error" visible={!!error}>
                  {error}
                </HelperText>
              ) : null}

              <TextInput label="Full Name" value={name} onChangeText={setName} mode="outlined" style={styles.input} />

              <View style={{ position: "relative", marginBottom: 16 }}>
                <TextInput
                  label="Email"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (error) setError("");
                  }}
                  mode="outlined"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={{ marginBottom: 0 }}
                />

                {/* Absolutely positioned HelperText */}
                {email.length > 0 && !isValidEmail(email) && (
                  <HelperText
                    type="error"
                    visible={true}
                    style={{
                      position: "absolute",
                      bottom: -18, // push it just below the input field
                      left: 5,    // match TextInput padding
                      fontSize: 11,
                      marginBottom: 0,
                      paddingBottom: 0,
                    }}
                  >
                    Invalid email address
                  </HelperText>
                )}
              </View>



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

              <TextInput
                label="Confirm Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={secureConfirmTextEntry}
                mode="outlined"
                style={styles.input}
                right={
                  <TextInput.Icon
                    name={secureConfirmTextEntry ? "eye-off" : "eye"}
                    onPress={() => setSecureConfirmTextEntry(!secureConfirmTextEntry)}
                  />
                }
              />

              <Button
                mode="contained"
                onPress={handleRegister}
                loading={loading}
                disabled={loading}
                style={styles.button}
                contentStyle={styles.buttonContent}
              >
                Sign Up
              </Button>

              <View style={styles.footer}>
                <Text style={styles.footerText}>Already have an account? </Text>
                <TouchableOpacity onPress={() => navigation.navigate("Login")}>
                  <Text style={styles.footerLink}>Sign In</Text>
                </TouchableOpacity>
              </View >
              <View style={{ alignItems: "center", marginTop: 10 }}></View>
              <Button
                mode="outlined"
                onPress={() => handleGuestLogin()}
                style={{ width: "100%" }}
                contentStyle={styles.buttonContent}
                labelStyle={{ color: "#3b82f6" }}

              >
                Continue without signing in
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
  headerContainer: {
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
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

export default RegisterScreen
