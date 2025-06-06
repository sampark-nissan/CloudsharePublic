"use client"

import { useEffect } from "react"
import { View, StyleSheet, ActivityIndicator } from "react-native"
import { useAuth } from "../../context/AuthContext"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { StatusBar } from "react-native"

const AuthLoadingScreen = ({ navigation }) => {
  const { user, loading } = useAuth()

  useEffect(() => {
    const checkAuthState = async () => {
      try {
        const userString = await AsyncStorage.getItem("@CloudShare:user")

        if (!loading) {
          if (user || userString) {
            navigation.replace("Main")
          } else {
            navigation.replace("Login")
          }
        }
      } catch (error) {
        console.error("Error checking auth state:", error)
        navigation.replace("Login")
      }
    }

    checkAuthState()
  }, [loading, user, navigation])

  return (
    <>
    <StatusBar backgroundColor="#ffffff" barStyle="dark-content"/>
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#7c3aed" />
    </View></>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
})

export default AuthLoadingScreen
