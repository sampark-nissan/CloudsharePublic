"use client"

import { createContext, useState, useEffect, useContext } from "react"
import auth from "@react-native-firebase/auth"
import firestore from "@react-native-firebase/firestore"
import AsyncStorage from "@react-native-async-storage/async-storage"

const AuthContext = createContext({})

let IS_REGISTRATION_IN_PROGRESS = false;

export const setAuthRegistrationStatus = (isRegistering) => {
  IS_REGISTRATION_IN_PROGRESS = isRegistering;
}; 

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        await firebaseUser.reload(); // latest info is fetched
  
        if (IS_REGISTRATION_IN_PROGRESS || firebaseUser.emailVerified || firebaseUser.isAnonymous) {
          const userData = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || "",
            name: firebaseUser.displayName || "",
            photoURL: firebaseUser.photoURL || "",
          }
  
          setUser(userData)
          await AsyncStorage.setItem("@CloudShare:user", JSON.stringify(userData))
        } else {
          // Unverified users are signed out immediately
          await auth().signOut()
          setUser(null)
          await AsyncStorage.removeItem("@CloudShare:user")
        }
      } else {
        setUser(null)
        await AsyncStorage.removeItem("@CloudShare:user")
      }
  
      setLoading(false)
    })
  
     return () => {
      unsubscribe();
      IS_REGISTRATION_IN_PROGRESS = false; // Reset flag if component unmounts
    }
  }, [])
  

  const signOut = async () => {
    try {
      await auth().signOut()
    } catch (error) {
      throw error
    }
  }

  const forgotPassword = async (email) => {
    try {
      await auth().sendPasswordResetEmail(email)
    } catch (error) {
      throw error
    }
  }

  const updateProfile = async (data) => {
    try {
      if (auth().currentUser) {
        await auth().currentUser?.updateProfile({
          name: data.name || auth().currentUser.name,
          photoURL: data.photoURL || auth().currentUser.photoURL,
        })

        if (data.email && data.email !== auth().currentUser.email) {
          await auth().currentUser.updateEmail(data.email)
        }

        await firestore().collection("users").doc(auth().currentUser.uid).update({
          name: data.name,
          email: data.email,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        })

        setUser({
          ...user,
          ...data,
        })
      }
    } catch (error) {
      throw error
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signOut,
        forgotPassword,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }

  return context
}
