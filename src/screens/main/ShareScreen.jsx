"use client"

import Ionicons from 'react-native-vector-icons/Ionicons'
import { useState, useEffect, useCallback } from "react"
import { View, StyleSheet, ScrollView, TouchableOpacity, Share, Alert, Image } from "react-native"
import { Text, Appbar, Button, TextInput, Chip, Card, ActivityIndicator, Menu, FAB } from "react-native-paper"
import { SafeAreaView } from "react-native-safe-area-context"
import { deleteShare, getSharedFiles } from "../../services/firebaseService"
import { StatusBar } from 'react-native'
import { ToastAndroid, Platform } from 'react-native'
// import Clipboard from '@react-native-clipboard/clipboard'
import { theme } from '../../theme'
import { useFocusEffect } from '@react-navigation/native'



const ShareScreen = ({ navigation }) => {
  const [sharedFiles, setSharedFiles] = useState([])
  const [loading, setLoading] = useState(true)
  // const [selectedFile, setSelectedFile] = useState(null)
  // const [menuVisible, setMenuVisible] = useState(false)
  // const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 })

  useFocusEffect(
  useCallback(() => {
    loadSharedFiles();
  }, [])
  );

  const loadSharedFiles = async () => {
    try {
      setLoading(true);
      const files = await getSharedFiles();
  
      const now = new Date();
      const validFiles = [];
  
      for (const file of files) {
      const expiresAt = file.expiresAt?.toDate ? file.expiresAt.toDate() : new Date(file.expiresAt);

      if (now >= expiresAt) {
        // File has expired
        await deleteShare(file.publicId);

        // Show toast
        const message = `${file.name || "A file"} expired and deleted.`;
        if (Platform.OS === 'android') {
          ToastAndroid.show(message, ToastAndroid.SHORT);
        } else {
          Alert.alert("File expired and deleted", message);
        }
      } else {
        validFiles.push(file); // Still valid
      }
    }

    validFiles.sort((a, b) => {
      const aTime = a.expiry?.toDate ? a.expiry.toDate().getTime() : new Date(a.expiry).getTime();
      const bTime = b.expiry?.toDate ? b.expiry.toDate().getTime() : new Date(b.expiry).getTime();
      return aTime - bTime;
    });
  
      setSharedFiles(validFiles);
    } catch (error) {
      console.error("Error loading or cleaning shared files:", error);
    } finally {
      setLoading(false);
    }
  };
  
  
  const handleShareAgain = async (file) => {
    try {
      await Share.share({
        message: `Check out this file I shared with you: ${file.link}`,
        url: file.link, // iOS only
        title: file.file.name,
      })
    } catch (error) {
      console.error("Error sharing:", error)
    }
  }

  const handleStopSharing = async (file) => {
    try {
      await deleteShare(file.publicId)
      setSharedFiles(prev => prev.filter(f => f.publicId !== file.publicId))
      await loadSharedFiles();
      Alert.alert("Success", "Stopped sharing the file.")
    } catch (error) {
      console.error("Error stopping share:", error)
      Alert.alert("Error", "Failed to stop sharing. Please try again.")
    }
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return "Never"

    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleString(undefined, {
      dateStyle: "long",
      timeStyle: "short",
    })
  }

  const getExpirationText = (expiresAt) => {
    if (!expiresAt) return "Never expires";

    const now = new Date();
    const expDate = expiresAt.toDate ? expiresAt.toDate() : new Date(expiresAt);

    if (expDate < now) {
      return "Expired";
    }

    const diffMs = expDate - now;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHours === 0 && diffMinutes > 0) {
      return `Expires in ${diffMinutes} minute${diffMinutes === 1 ? "" : "s"}`;
    }
    
    if (diffMinutes < 0) {
      return `Expires in a minute`;
    }

    return `Expires in ${diffHours} hour${diffHours === 1 ? "" : "s"}`;
  };

  // const getAccessTypeIcon = (accessType) => {
  //   if (accessType === "public") {
  //     return "globe-outline"
  //   } else if (accessType === "specific") {
  //     return "people-outline"
  //   } else {
  //     return "lock-closed-outline"
  //   }
  // }

  // const getAccessTypeText = (accessType) => {
  //   if (accessType === "public") {
  //     return "Anyone with the link"
  //   } else if (accessType === "specific") {
  //     return "Specific users only"
  //   } else {
  //     return "Password protected"
  //   }
  // }

  // const showMenu = (file, event) => {
  //   setSelectedFile(file)
  //   setMenuPosition({
  //     x: event.nativeEvent.pageX,
  //     y: event.nativeEvent.pageY,
  //   })
  //   setMenuVisible(true)
  // }

  const getFilePreview = (file) => {
    const isImage = file.url && (file.url.endsWith(".jpg") || file.url.endsWith(".png") || file.url.endsWith(".jpeg"));

    if (isImage) {
      console.log("Image URL:", file.url);
      return (
        <Image source={{ uri: file.url }} style={styles.filePreviewImage} />
      );
    } else {
      return (
        <Text style={styles.filePreviewText}>{file.name || "No preview available"}</Text>
      );
    }
  };

  return (
    <>
      <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />
      <SafeAreaView style={styles.container} edges={["top"]}>
        <Appbar.Header style={{ backgroundColor: "#ffffff", height: 35, elevation: 0 }}>
          <Appbar.Content title="Shared Files" titleStyle={{ textAlignVertical: "center" }} />
          <Appbar.Action icon="refresh" onPress={loadSharedFiles} />
        </Appbar.Header>

        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#7c3aed" />
          </View>
        ) : sharedFiles.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="share-social-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyText}>No shared files</Text>
            <Text style={styles.emptySubtext}>Files you share will appear here</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
            {sharedFiles.map((sharedFile) => (
              <Card key={sharedFile.publicId} style={styles.shareCard}>
                <Card.Content>
                  {/* File Preview */}
                  <View style={styles.filePreviewContainer}>
                    {getFilePreview(sharedFile)}
                  </View>

                  <View style={styles.shareHeader}>
                    <View style={styles.fileInfo}>
                      <Text style={styles.fileName} numberOfLines={1}>
                        {sharedFile.name || "Unknown file"}
                      </Text>
                    </View>
                    <Text style={{fontSize: 12,color: getExpirationText(sharedFile.expiry)=="Expires in a minute"? theme.colors.error : "#6b7280"}}>{getExpirationText(sharedFile.expiry)}</Text>

                    {/* <TouchableOpacity onPress={(event) => showMenu(sharedFile, event)} style={styles.menuButton}>
                    <Ionicons name="ellipsis-vertical" size={20} color="#6b7280" />
                  </TouchableOpacity> */}
                  </View>

                  <View style={styles.statsContainer}>
                    {/* <View style={styles.statItem}>
                    <Text style={styles.statValue}>{sharedFile.views || 0}</Text>
                    <Text style={styles.statLabel}>Views</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{sharedFile.downloads || 0}</Text>
                    <Text style={styles.statLabel}>Downloads</Text>
                  </View> */}
                    <View style={styles.statItem}>
                      <Text style={styles.statLabel}>Shared on</Text>
                      <Text style={styles.statValue}>{formatDate(sharedFile.createdAt)}</Text>
                    </View>

                    <View style={styles.accessRightAligned}>
                      <View style={styles.accessChip}>
                        <Ionicons name="globe-outline" size={14} color="#7c3aed" />
                        <Text style={styles.chipText}>No Password</Text>
                      </View>
                    </View>
                  </View>


                  <View style={styles.linkContainer}>
                    <TextInput
                      value={sharedFile.url}
                      disabled
                      mode="outlined"
                      dense
                      right={
                        <TextInput.Icon
                          icon="content-copy"
                          onPress={() => {
                            Share.share({
                              message: sharedFile.url,
                            })
                          }}
                        />
                      }
                    />
                  </View>

                  <View style={styles.actionButtons}>
                    <Button mode="contained" onPress={() => handleShareAgain(sharedFile)} style={styles.shareButton}>
                      Share Again
                    </Button>
                    <Button
                      mode="outlined"
                      onPress={() => handleStopSharing(sharedFile)}
                      style={styles.stopButton}
                      textColor="#ef4444"
                    >
                      Delete
                    </Button>
                  </View>
                </Card.Content>
              </Card>

            ))}
          </ScrollView>
        )}
        <FAB style={styles.fab} icon="plus" onPress={() => navigation.navigate("Upload")} />

        {/* <Menu visible={menuVisible} onDismiss={() => setMenuVisible(false)} anchor={menuPosition}>
        <Menu.Item
          title="Share Again"
          leadingIcon="share-variant"
          onPress={() => {
            setMenuVisible(false)
            if (selectedFile) handleShareAgain(selectedFile)
          }}
        />
        <Menu.Item
          title="Copy Link"
          leadingIcon="content-copy"
          onPress={() => {
            setMenuVisible(false)
            if (selectedFile?.url) {
              Clipboard.setString(selectedFile.url)
              if (Platform.OS === 'android') {
                ToastAndroid.show("Link copied to clipboard", ToastAndroid.SHORT)
              } else {
                Alert.alert("Copied", "Link copied to clipboard")
              }
            }
          }}         
        />
        <Menu.Item
          title="Stop Sharing"
          leadingIcon="link-off"
          onPress={() => {
            setMenuVisible(false)
            if (selectedFile) handleStopSharing(selectedFile)
          }}
        />
      </Menu> */}
      </SafeAreaView></>
  )
}

const styles = StyleSheet.create({
  filePreviewImage: {
    width: "100%",
    height: 100,
    borderRadius: 8,
    resizeMode: "cover",
    marginBottom: 8,
  },
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#4b5563",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 24,
  },
  emptyButton: {
    marginTop: 8,
  },
  scrollContent: {
    padding: 16,
  },
  shareCard: {
    marginBottom: 16,
  },
  shareHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 6,
  },
  accessChip: {
    backgroundColor: "#f3f0ff",
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    height: 30,
    padding: 2,
  },
  chipText: {
    fontSize: 11,
    color: "#7c3aed",
  },
  menuButton: {
    padding: 4,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 12,
  },
  accessRightAligned: {
    justifyContent: "flex-end",
  },
  statItem: {
    alignItems: "left",
  },
  statValue: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#1f2937",
  },
  statLabel: {
    fontSize: 12,
    color: "#6b7280",
  },
  linkContainer: {
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  shareButton: {
    flex: 1,
    marginRight: 8,
  },
  stopButton: {
    flex: 1,
    marginLeft: 8,
    borderColor: "#ef4444",
  },
  fab: {
    position: "absolute",
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: "#3b82f6",
  },
})

export default ShareScreen
