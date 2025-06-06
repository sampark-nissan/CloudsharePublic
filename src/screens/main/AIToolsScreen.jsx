"use client"

import Ionicons from 'react-native-vector-icons/Ionicons'
import { useState, useEffect } from "react"
import { View, StyleSheet, ScrollView, Image, TouchableOpacity, Alert } from "react-native"
import { Text, Appbar, Card, Button, ActivityIndicator } from "react-native-paper"
import { SafeAreaView } from "react-native-safe-area-context"
import { launchImageLibrary } from "react-native-image-picker"
import { removeBackground, autoEnhance, applyArtisticFilter, autoCrop, detectObjects, uploadToCloudinary } from "../../services/cloudinaryService"
import auth from "@react-native-firebase/auth"
import { StatusBar } from 'react-native'
// import { Video } from 'expo-av' // Make sure you have expo-av installed if using this

const AIToolsScreen = ({ navigation }) => {
  const [user, setUser] = useState(null)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [selectedImage, setSelectedImage] = useState(null)
  const [processedImage, setProcessedImage] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [activeTab, setActiveTab] = useState("tools")

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(currentUser => {
      setUser(currentUser)
      setCheckingAuth(false)
    })
    return unsubscribe
  }, [])

  const aiTools = [
    {
      id: "background-removal",
      name: "Background Removal",
      description: "Remove the background from your images with AI",
      icon: "cut-outline",
    },
    {
      id: "auto-enhance",
      name: "Auto Enhance",
      description: "Automatically enhance image quality and colors",
      icon: "color-wand-outline",
    },
    {
      id: "artistic-filter",
      name: "Artistic Filter",
      description: "Apply AI-powered artistic styles to your images",
      icon: "brush-outline",
    },
    {
      id: "auto-crop",
      name: "Auto Crop",
      description: "Intelligently crop images to highlight the main subject",
      icon: "crop-outline",
    },
    {
      id: "object-detection",
      name: "Object Detect",
      description: "Identify and locate objects within your images",
      icon: "scan-outline",
    },
    {
      id: "gen-remove",
      name: "AI Remove",
      description: "Identify and remove objects within your images",
      icon: "remove-circle-outline", // Or a suitable icon
    },
    {
      id: "gen-fill-16-9", // Example with a specific aspect ratio
      name: "AI Fill (16:9)",
      description: "Crop your image to a 16:9 screen size",
      icon: "expand-outline", // Or a suitable icon
    },
    {
      id: "gen-fill-1-1", // Example with a specific aspect ratio
      name: "AI Fill (1:1)",
      description: "Crop your image to a 1:1 screen size",
      icon: "square-outline", // Or a suitable icon
    },
    {
      id: "gen-replace",
      name: "AI Replace",
      description: "Identify and replace objects within your images",
      icon: "swap-horizontal-outline", // Or a suitable icon
    },
    {
      id: "gen-recolor",
      name: "AI Recolor",
      description: "Identify and re-colour objects within your images",
      icon: "color-fill-outline", // Or a suitable icon
    },
  ]

  const pickMedia = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: "mixed",
        quality: 0.8,
      });

      if (!result.didCancel && result.assets?.length > 0) {
        const asset = result.assets[0];
        setSelectedImage(asset);
        setProcessedImage(null);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick media. Please try again.");
    }
  };

  const processImage = async (tool) => {
    if (!selectedImage) {
      Alert.alert("No media selected", "Please select an image or video first.");
      return;
    }

    setProcessing(true);
    try {
      const uploaded = await uploadToCloudinary(selectedImage.uri);
      const publicId = uploaded.public_id;
      const isImage = selectedImage.type?.startsWith("image");

      if (!isImage) {
        Alert.alert("Note", "Video uploaded. Editing support for videos is limited.");
        setProcessedImage({ uri: uploaded.secure_url });
        return;
      }

      let resultUrl;
      switch (tool.id) {
        case "background-removal":
          resultUrl = await removeBackground(publicId);
          break;
        case "auto-enhance":
          resultUrl = await autoEnhance(publicId);
          break;
        case "artistic-filter":
          resultUrl = await applyArtisticFilter(publicId, "primavera");
          break;
        case "auto-crop":
          resultUrl = await autoCrop(publicId, "1:1");
          break;
        case "object-detection":
          resultUrl = await detectObjects(publicId);
          break;
        default:
          break;
      }

      setProcessedImage({ uri: resultUrl });
    } catch (error) {
      console.error("Processing error:", error);
      Alert.alert("Failed", "Processing failed. Try again.");
    } finally {
      setProcessing(false);
    }
  };

  const saveProcessedImage = () => {
    if (!processedImage) return
    Alert.alert("Success", "Image saved to your gallery.")
    navigation.navigate("Gallery")
  }

  if (checkingAuth) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </SafeAreaView>
    )
  }

  if (!user || user.email === "" || user.providerData.length === 0) {
    return (
      <>
        <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />
        <SafeAreaView style={[styles.container, { backgroundColor: "#fff", justifyContent: "center", alignItems: "center" }]}>
          <Text style={{ color: "#00008B", fontSize: 18, marginBottom: 24 }}>Sign in to use this feature</Text>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <TouchableOpacity style={[styles.authButton, { backgroundColor: "#3b82f6" }]} onPress={() => navigation.navigate("Login")}>
              <Text style={styles.authButtonText}>Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.authButton, { backgroundColor: "#10b981" }]} onPress={() => navigation.navigate("Register")}>
              <Text style={styles.authButtonText}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </>
    )
  }

  return (
    <>
      <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />
      <SafeAreaView style={styles.container} edges={["top"]}>
        <Appbar.Header
          style={{
            backgroundColor: "#ffffff",
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 0,
            height: 25,
          }}
        >
          <Appbar.Content title="AI Tools" titleStyle={{ textAlignVertical: "center" }} />
        </Appbar.Header>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
          {/* {activeTab === "tools" ? ( */}
            <View style={styles.toolsGrid}>
              {aiTools.map((tool) => (
                <Card key={tool.id} style={styles.toolCard}>
                  <Card.Content>
                    <View style={styles.toolHeader}>
                      <View style={styles.toolIconContainer}>
                        <Ionicons name={tool.icon} size={24} color="#7c3aed" />
                      </View>
                      <Text style={styles.toolName}>{tool.name}</Text>
                    </View>
                    <Text style={styles.toolDescription}>{tool.description}</Text>
                  </Card.Content>
                  <Card.Actions>
                    <Button mode="outlined" onPress={() => navigation.navigate("EditImage", { tool })}>
                      Use Tool
                    </Button>
                  </Card.Actions>
                </Card>
              ))}
            </View>
          {/* ) : (
            <View style={styles.editorContainer}>
              <View style={styles.imageContainers}>
                <Card style={styles.imageCard}>
                  <Card.Content>
                    <Text style={styles.cardTitle}>Original Image</Text>
                    <TouchableOpacity style={styles.imagePlaceholder} onPress={pickMedia}>
                      {selectedImage ? (
                        selectedImage.type?.startsWith("video") ? (
                          <Video
                            source={{ uri: selectedImage.uri }}
                            style={styles.image}
                            resizeMode="contain"
                            useNativeControls
                            shouldPlay={false}
                          />
                        ) : (
                          <Image source={{ uri: selectedImage.uri }} style={styles.image} />
                        )
                      ) : (
                        <View style={styles.placeholderContent}>
                          <Ionicons name="image-outline" size={48} color="#d1d5db" />
                          <Text style={styles.placeholderText}>Tap to select image</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </Card.Content>
                  <Card.Actions style={{ justifyContent: 'space-between' }}>
                    <Button mode="outlined" onPress={pickMedia}>
                      {selectedImage ? "Change Image" : "Select Image"}
                    </Button>
                    {selectedImage && (
                      <Button
                        mode="text"
                        onPress={() => {
                          setSelectedImage(null)
                          setProcessedImage(null)
                        }}
                        textColor="#ef4444"
                      >
                        Clear Image
                      </Button>
                    )}
                  </Card.Actions>
                </Card>

                <Card style={styles.imageCard}>
                  <Card.Content>
                    <Text style={styles.cardTitle}>Processed Image</Text>
                    <View style={styles.imagePlaceholder}>
                      {processing ? (
                        <View style={styles.placeholderContent}>
                          <ActivityIndicator size="large" color="#7c3aed" />
                          <Text style={styles.processingText}>Processing image...</Text>
                        </View>
                      ) : processedImage ? (
                        <Image source={{ uri: processedImage.uri }} style={styles.image} />
                      ) : (
                        <View style={styles.placeholderContent}>
                          <Ionicons name="sparkles-outline" size={48} color="#d1d5db" />
                          <Text style={styles.placeholderText}>
                            {selectedImage ? "Apply an effect" : "Select an image first"}
                          </Text>
                        </View>
                      )}
                    </View>
                  </Card.Content>
                  <Card.Actions>
                    <Button mode="contained" disabled={!processedImage} onPress={saveProcessedImage}>
                      Save to Gallery
                    </Button>
                  </Card.Actions>
                </Card>
              </View>

              {selectedImage && (
                <View style={styles.toolsContainer}>
                  <Text style={styles.toolsTitle}>Available Tools</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.toolsScroll}>
                    {aiTools.map((tool) => (
                      <TouchableOpacity
                        key={tool.id}
                        style={styles.toolButton}
                        onPress={() => processImage(tool)}
                        disabled={processing}
                      >
                        <View style={styles.toolButtonIcon}>
                          <Ionicons name={tool.icon} size={24} color="#7c3aed" />
                        </View>
                        <Text style={styles.toolButtonText}>{tool.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          )} */}
        </ScrollView>
      </SafeAreaView> </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#ffffff",
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#7c3aed",
  },
  tabText: {
    fontSize: 16,
    color: "#6b7280",
  },
  activeTabText: {
    color: "#7c3aed",
    fontWeight: "500",
  },
  scrollContent: {
    padding: 16,
  },
  toolsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  toolCard: {
    width: "48%",
    marginBottom: 16,
  },
  toolHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  toolIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f3f0ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  toolName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1f2937",
    justifyContent: "center",
    alignItems: "center",
  },
  toolDescription: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  editorContainer: {
    flex: 1,
  },
  imageContainers: {
    marginBottom: 24,
  },
  imageCard: {
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
  },
  imagePlaceholder: {
    height: 200,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "contain",
  },
  placeholderContent: {
    alignItems: "center",
  },
  placeholderText: {
    marginTop: 8,
    fontSize: 14,
    color: "#9ca3af",
  },
  processingText: {
    marginTop: 16,
    fontSize: 14,
    color: "#6b7280",
  },
  toolsContainer: {
    marginBottom: 16,
  },
  toolsTitle: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 12,
  },
  toolsScroll: {
    flexDirection: "row",
  },
  toolButton: {
    alignItems: "center",
    marginRight: 16,
    width: 80,
  },
  toolButtonIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#f3f0ff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  toolButtonText: {
    fontSize: 12,
    color: "#4b5563",
    textAlign: "center",
  },
  centeredContainer: {
    flex: 1,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  authButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  authButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
})

export default AIToolsScreen
