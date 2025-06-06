"use client"

import Ionicons from 'react-native-vector-icons/Ionicons'
import { useState, useEffect } from "react"
import { View, StyleSheet, ScrollView, Image, TouchableOpacity, Alert } from "react-native"
import { Text, Appbar, Card, Button, TextInput, Avatar, Divider, List } from "react-native-paper"
import { SafeAreaView } from "react-native-safe-area-context"
import { useAuth } from "../../context/AuthContext"
import { getActualStorageStats } from '../../services/firebaseService'
import { launchImageLibrary } from "react-native-image-picker"
import auth from '@react-native-firebase/auth';
import { StatusBar } from 'react-native'
import { theme } from '../../theme'

const ProfileScreen = ({ navigation }) => {
  const { user, signOut, updateProfile } = useAuth()
  const [stats, setStats] = useState({
    totalFiles: 0,
    totalStorage: 0,
    storageLimit: 15 * 1024 * 1024 * 1024,
  })
  const [loading, setLoading] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [name, setName] = useState(user?.name || "")
  const [email, setEmail] = useState(user?.email || "")
  const [profileImage, setProfileImage] = useState(user?.photoURL || null)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const statsData = await getActualStorageStats()
      console.log("Fetched stats: ", statsData)
      setStats(statsData)
    } catch (error) {
      console.error("Error loading stats:", error)
    }
  }

  const handleSignOut = async () => {
    if (user) {
      try {
        await auth().signOut();
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      } catch (error) {
        console.error("Sign out error:", error);
        throw error;
      }
    }
    if (!user) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    }
  };


  const handleUpdateProfile = async () => {
    if (!name) {
      Alert.alert("Error", "Name cannot be empty")
      return
    }

    setLoading(true)

    try {
      await updateProfile({
        displayName: name,
        email: email,
        photoURL: profileImage,
      })

      setEditMode(false)
      Alert.alert("Success", "Profile updated successfully")
    } catch (error) {
      console.error("Error updating profile:", error)
      Alert.alert("Error", error.message || "Failed to update profile. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const pickImage = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: "photo",
        quality: 0.8,
      })

      if (!result.didCancel && result.assets && result.assets.length > 0) {
        setProfileImage(result.assets[0].uri)
      }
    } catch (error) {
      console.error("Error picking image:", error)
      Alert.alert("Error", "Failed to pick image. Please try again.")
    }
  }

  const formatBytes = (bytes, decimals = 2) => {
    if (!bytes || isNaN(bytes)) return "0 Bytes"

    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"]

    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i]
  }


  const getStoragePercentage = () => {
    if (!stats.storageLimit || stats.storageLimit === 0) return 0;
    console.log("Storage usage:", stats.totalStorage, "/", stats.storageLimit, "→", (stats.totalStorage / stats.storageLimit) * 100, "%");
    return Math.min((stats.totalStorage / stats.storageLimit) * 100, 100);
  };


  return (
    <>
      <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />
      <SafeAreaView style={styles.container} edges={["top"]}>
        <Appbar.Header style={{ backgroundColor: "#ffffff", height: 35, elevation: 0 }}>
          <Appbar.BackAction onPress={() => navigation.goBack()} />
          <Appbar.Content title="Profile" titleStyle={{ textAlignVertical: "center" }} />
          {!editMode && <Appbar.Action icon="account-edit" onPress={() => setEditMode(true)} />}
        </Appbar.Header>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
          <Card style={styles.profileCard}>
            <Card.Content>
              <View style={styles.profileHeader}>
                {editMode ? (
                  <TouchableOpacity style={styles.avatarContainer} onPress={pickImage}>
                    {profileImage ? (
                      <Image source={{ uri: profileImage }} style={styles.avatar} />
                    ) : (
                      <Avatar.Text size={80} label={name.charAt(0)} />
                    )}
                    <View style={styles.editAvatarButton}>
                      <Ionicons name="camera" size={16} color="#fff" />
                    </View>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.avatarContainer}>
                    {profileImage ? (
                      <Image source={{ uri: profileImage }} style={styles.avatar} />
                    ) : (
                      <Avatar.Text size={80} label={name.charAt(0)} />
                    )}
                  </View>
                )}

                {editMode ? (
                  <View style={styles.editForm}>
                    <TextInput label="Name" value={name} onChangeText={setName} mode="outlined" style={styles.input} />

                    <TextInput
                      label="Email"
                      value={email}
                      onChangeText={setEmail}
                      mode="outlined"
                      style={styles.input}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />

                    <View style={styles.editActions}>
                      <Button
                        mode="contained"
                        onPress={handleUpdateProfile}
                        loading={loading}
                        disabled={loading}
                        style={styles.saveButton}
                      >
                        Save Changes
                      </Button>
                      <Button mode="outlined" onPress={() => setEditMode(false)} style={styles.cancelButton}>
                        Cancel
                      </Button>
                    </View>
                  </View>
                ) : (
                  <View style={styles.profileInfo}>
                    <Text style={styles.profileName}>{user?.name || "User"}</Text>
                    <Text style={styles.profileEmail}>{user?.email || ""}</Text>
                  </View>
                )}
              </View>
            </Card.Content>
          </Card>

          <Card style={styles.statsCard}>
            <Card.Content>
              <Text style={styles.sectionTitle}>Storage</Text>
              <View style={styles.storageInfo}>
                <Text style={styles.storageText}>{formatBytes(stats.totalStorage)}</Text>
                console.log(stats.storageLimit);
                <Text style={styles.storageLimitText}>of {formatBytes(stats.storageLimit)}</Text>
              </View>
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBar, { width: `${getStoragePercentage()}%` , backgroundColor: getStoragePercentage() >= 90 ? theme.colors.error : theme.colors.primary }]} />
              </View>
              <Text style={styles.statsText}>{stats.totalFiles} files</Text>
            </Card.Content>
          </Card>

          <List.Section>
            <List.Subheader>Account</List.Subheader>
            <List.Item
              title="Settings"
              left={(props) => <List.Icon {...props} icon="cog-outline" />}
              onPress={() => navigation.navigate("Settings")}
            />
            <List.Item
              title="Notification Preferences"
              left={(props) => <List.Icon {...props} icon="bell-outline" />}
              onPress={() => { }}
            />
            <Divider />
            <List.Subheader>Support</List.Subheader>
            <List.Item
              title="Help Center"
              left={(props) => <List.Icon {...props} icon="help-circle-outline" />}
              onPress={() => { }}
            />
            <List.Item
              title="Privacy Policy"
              left={(props) => <List.Icon {...props} icon="shield-outline" />}
              onPress={() => { }}
            />
            <List.Item
              title="Terms of Service"
              left={(props) => <List.Icon {...props} icon="file-document-outline" />}
              onPress={() => { }}
            />
            <Divider />
            <List.Item
              title="Sign Out"
              left={(props) => <List.Icon {...props} color="#ef4444" icon="logout" />}
              titleStyle={{ color: "#ef4444" }}
              onPress={handleSignOut}
            />
          </List.Section>
        </ScrollView>
      </SafeAreaView></>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  scrollContent: {
    padding: 16,
  },
  profileCard: {
    marginBottom: 16,
  },
  profileHeader: {
    alignItems: "center",
  },
  avatarContainer: {
    marginBottom: 16,
    position: "relative",
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  editAvatarButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#7c3aed",
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  profileInfo: {
    alignItems: "center",
  },
  profileName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
  },
  profileEmail: {
    fontSize: 14,
    color: "#6b7280",
  },
  editForm: {
    width: "100%",
    marginTop: 16,
  },
  input: {
    marginBottom: 16,
  },
  editActions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  saveButton: {
    flex: 1,
    marginRight: 8,
  },
  cancelButton: {
    flex: 1,
    marginLeft: 8,
  },
  statsCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1f2937",
    marginBottom: 8,
  },
  storageInfo: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 8,
  },
  storageText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
  },
  storageLimitText: {
    fontSize: 12,
    color: "#9ca3af",
    marginLeft: 4,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: "#e5e7eb",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressBar: {
    height: "100%",
    borderRadius: 3,
  },
  statsText: {
    fontSize: 14,
    color: "#6b7280",
  },
})

export default ProfileScreen
