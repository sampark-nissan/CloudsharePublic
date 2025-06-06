import { launchImageLibrary } from 'react-native-image-picker';
import storage from '@react-native-firebase/storage';
import uuid from 'react-native-uuid';
import { PermissionsAndroid, Platform } from "react-native";
import { StatusBar } from 'react-native';
import Ionicons from "react-native-vector-icons/Ionicons";
import { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  Dimensions,
  ScrollView,
  Alert, // Import Alert
} from "react-native";
import { Text, Appbar, Chip, Menu, Divider, ActivityIndicator, FAB } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
// Make sure deleteMultipleFiles is exported from firebaseService
import { getUserFiles, saveImageMetadata, deleteMultipleFiles } from "../../services/firebaseService";
import auth from "@react-native-firebase/auth";
import { uploadToCloudinary } from '../../services/cloudinaryService';
import { useFocusEffect } from '@react-navigation/native';

const { width: screenWidth } = Dimensions.get("window");
const numColumns = 3;

const GalleryScreen = ({ navigation, route }) => {
  const [user, setUser] = useState(null);
  const [files, setFiles] = useState([]);
  const [filteredFiles, setFilteredFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [viewMode, setViewMode] = useState("grid");
  const [menuVisible, setMenuVisible] = useState(false);
  const [sortBy, setSortBy] = useState("newest");
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [uploading, setUploading] = useState(false);
  // --- Multi-select state ---
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  // -------------------------

  const handlePickAndUpload = async () => {
    const hasPermission = await requestMediaPermission();
    if (!hasPermission) {
      console.warn("Permission not granted");
      return;
    }

    launchImageLibrary(
      { mediaType: 'mixed', selectionLimit: 0 }, // 0 for multiple selections
      async (response) => {
        if (response.didCancel || response.errorCode) {
          console.log("User cancelled picker or error:", response.errorMessage || response.errorCode);
          return;
        }

        const assets = response.assets;
        if (!assets || assets.length === 0) return;

        setUploading(true);
        try {
          await Promise.all(assets.map(async (asset) => {
            const { uri, fileName, type } = asset;
            const cloudResponse = await uploadToCloudinary(uri, type);

            await saveImageMetadata({
              publicId: cloudResponse.public_id,
              name: fileName,
              url: cloudResponse.secure_url,
              type: type,
              size: cloudResponse.bytes,
            });
          }));
          await loadFiles();
        } catch (error) {
          console.error("Upload failed:", error);
          Alert.alert("Upload Error", "Some files might have failed to upload.");
        } finally {
          setUploading(false);
        }
      }
    );
  };

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(currentUser => {
      setUser(currentUser);
      setCheckingAuth(false);
    });
    return unsubscribe;
  }, []);

  useFocusEffect(
    useCallback(() => {
        if (user) {
            loadFiles()
        }
    }, [user])
  );

  const loadFiles = async () => {
    try {
      setLoading(true);
      const filesData = await getUserFiles();
      setFiles(filesData);
      filterFiles(filesData, activeFilter);
    } catch (error) {
      console.error("Error loading files:", error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFiles();
    setRefreshing(false);
  };

  useEffect(() => {
    if (user) loadFiles();
  }, [user]);

  const filterFiles = (filesData, filter) => {
    let newFilteredFiles = [];
    if (filter === "all") {
      newFilteredFiles = filesData;
    } else if (filter === "images") {
      newFilteredFiles = filesData.filter(file => file.type?.includes("image"));
    } else if (filter === "videos") {
      newFilteredFiles = filesData.filter(file => file.type?.includes("video"));
    } else if (filter === "documents") {
      newFilteredFiles = filesData.filter(
        file =>
          file.type?.includes("pdf") ||
          file.type?.includes("doc") ||
          file.type?.includes("sheet") ||
          file.type?.includes("text")
      );
    }
    setFilteredFiles(sortFiles(newFilteredFiles));
  };

  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
    filterFiles(files, filter);
  };

  const sortFiles = (filesToSort) => {
    const sorted = [...filesToSort];

    sorted.sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
      const sizeA = a.size || 0;
      const sizeB = b.size || 0;
      const nameA = a.name || '';
      const nameB = b.name || '';

      switch (sortBy) {
        case "newest":
          return dateB - dateA;
        case "oldest":
          return dateA - dateB;
        case "name":
          return nameA.localeCompare(nameB);
        case "size":
          return sizeB - sizeA;
        default:
          return 0;
      }
    });

    return sorted;
  };


  useEffect(() => {
    filterFiles(files, activeFilter);
  }, [sortBy, files, activeFilter]);

  const formatBytes = (bytes, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };


  const getFileIcon = (fileType) => {
    if (fileType?.includes("image")) return "image-outline";
    if (fileType?.includes("video")) return "videocam-outline";
    if (fileType?.includes("pdf")) return "document-text-outline";
    return "document-outline";
  };

 const handleLongPress = (file) => {
    if (!isSelectionMode) {
        setIsSelectionMode(true);
        setSelectedFiles([file.publicId]);
    }
};
  const handlePress = (file) => {
  if (isSelectionMode) {
    const newSelectedFiles = selectedFiles.includes(file.publicId) // Use publicId here
      ? selectedFiles.filter(id => id !== file.publicId) // Use publicId here
      : [...selectedFiles, file.publicId]; // Use publicId here

    setSelectedFiles(newSelectedFiles);

    if (newSelectedFiles.length === 0) {
      setIsSelectionMode(false);
    }
  } else {
    const currentIndex = filteredFiles.findIndex(f => f.publicId === file.publicId); // *** CRITICAL CHANGE: Use publicId ***
    if (currentIndex !== -1) {
      navigation.navigate("FileDetail", {
        files: filteredFiles,
        currentIndex: currentIndex
      });
    } else {
      Alert.alert("Error", "Could not find file details.");
    }
  }
};

  const handleDeleteSelected = () => {
  Alert.alert(
    "Delete Files",
    `Are you sure you want to delete ${selectedFiles.length} file(s)? This action cannot be undone.`,
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setLoading(true);
          try {
            // Get publicIds for selected files (selectedFiles now holds publicIds)
            // No change needed here, as selectedFiles should now contain publicIds
            await deleteMultipleFiles(selectedFiles); // selectedFiles should already be publicIds
            setSelectedFiles([]);
            setIsSelectionMode(false);
            await loadFiles();
          } catch (error) {
            console.error("Error deleting files:", error);
            Alert.alert("Error", "Failed to delete files. Please try again.");
          } finally {
            setLoading(false);
          }
        },
      },
    ]
  );
};

  const renderGridItem = ({ item, index }) => {
    const isSelected = selectedFiles.includes(item.id);
    return (
      <TouchableOpacity
        style={styles.gridItem}
        onPress={() => {
  handlePress(item); // First action
}}
        onLongPress={() => handleLongPress(item)}
      >
        {item.type?.includes("image") ? (
          <Image source={{ uri: item.url }} style={styles.gridImage} />
        ) : (
          <View style={styles.gridFile}>
            <Ionicons name={getFileIcon(item.type)} size={32} color="#7c3aed" />
            <Text style={styles.gridFileType}>{item.type?.split("/")[1]?.toUpperCase() || "FILE"}</Text>
          </View>
        )}
        <View style={styles.gridItemOverlay}>
          <Text style={styles.gridItemName} numberOfLines={1}>{item.name}</Text>
        </View>
        {isSelectionMode && (
          <View style={styles.selectionCircle}>
            {isSelected && <Ionicons name="checkmark-circle" size={24} color="#3b82f6" />}
            {!isSelected && <Ionicons name="ellipse-outline" size={24} color="#ffffff" />}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderListItem = ({ item, index }) => {
    const isSelected = selectedFiles.includes(item.id);
    const createdAtDate = item.createdAt?.toDate ? item.createdAt.toDate() : new Date(0);

    return (
      <TouchableOpacity
        style={[styles.listItem, isSelected && styles.selectedListItem]}
        onPress={() => {
  handlePress(item); // First action
}}
        onLongPress={() => handleLongPress(item)}
      >
        <View style={styles.listItemContent}>
          {isSelectionMode && (
            <View style={styles.listSelectionIcon}>
              {isSelected ?
                <Ionicons name="checkmark-circle" size={24} color="#3b82f6" />
                : <Ionicons name="ellipse-outline" size={24} color="#9ca3af" />}
            </View>
          )}
          <View style={styles.listItemIcon}>
            {item.type?.includes("image") ? (
              <Image source={{ uri: item.url }} style={styles.listItemThumb} />
            ) : (
              <Ionicons name={getFileIcon(item.type)} size={24} color="#7c3aed" />
            )}
          </View>
          <View style={styles.listItemInfo}>
            <Text style={styles.listItemName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.listItemDetails}>
              {formatBytes(item.size)} • {createdAtDate.toLocaleDateString()}
            </Text>
          </View>
          {!isSelectionMode && <Ionicons name="chevron-forward" size={20} color="#9ca3af" />}
        </View>
      </TouchableOpacity>
    );
  };


  if (checkingAuth) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </SafeAreaView>
    );
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
    );
  }

  const requestMediaPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const version = parseInt(Platform.Version, 10);
        let permissionsToRequest;

        if (version >= 33) { // Android 13+
          permissionsToRequest = [
            PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
            PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
          ];
        } else { // Android 12 and below
          permissionsToRequest = [PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE];
        }

        const granted = await PermissionsAndroid.requestMultiple(permissionsToRequest);

        // Check if *all* requested permissions are granted
        const allGranted = Object.values(granted).every(
          status => status === PermissionsAndroid.RESULTS.GRANTED
        );

        if (allGranted) {
          console.log("Media permissions granted");
          return true;
        } else {
          Alert.alert("Permission Denied", "Cannot access media without permission.");
          return false;
        }
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true; // Assume iOS or permission not needed
  };

  return (
    <>
      <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />
      <SafeAreaView style={styles.container} edges={["top"]}>
        <Appbar.Header style={{ backgroundColor: "#ffffff", height: 50, elevation: 1 }}>
          {isSelectionMode ? (
            <>
              <Appbar.Action icon="close" onPress={() => { setIsSelectionMode(false); setSelectedFiles([]); }} />
              <Appbar.Content title={`${selectedFiles.length} selected`} titleStyle={{ fontSize: 18 }} />
              <Appbar.Action icon="delete" onPress={handleDeleteSelected} disabled={selectedFiles.length === 0 || loading} />
            </>
          ) : (
            <>
              <Appbar.Content title="Gallery" titleStyle={{ textAlignVertical: "center" }} />
              <Appbar.Action icon="magnify" onPress={() => { /* Implement Search */ }} />
              <Menu
                visible={menuVisible}
                onDismiss={() => setMenuVisible(false)}
                anchor={<Appbar.Action icon="dots-vertical" onPress={() => setMenuVisible(true)} />}
              >
                <Menu.Item title="Sort by newest" onPress={() => { setSortBy("newest"); setMenuVisible(false); }} leadingIcon="arrow-down-thick" />
                <Menu.Item title="Sort by oldest" onPress={() => { setSortBy("oldest"); setMenuVisible(false); }} leadingIcon="arrow-up-thick" />
                <Menu.Item title="Sort by name" onPress={() => { setSortBy("name"); setMenuVisible(false); }} leadingIcon="sort-alphabetical-ascending" />
                <Menu.Item title="Sort by size" onPress={() => { setSortBy("size"); setMenuVisible(false); }} leadingIcon="sort-numeric-ascending" />
                <Divider />
                <Menu.Item
                  title={viewMode === "grid" ? "List view" : "Grid view"}
                  onPress={() => { setViewMode(viewMode === "grid" ? "list" : "grid"); setMenuVisible(false); }}
                  leadingIcon={viewMode === "grid" ? "view-list" : "view-grid"}
                />
              </Menu>
            </>
          )}
        </Appbar.Header>

        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Chip selected={activeFilter === "all"} onPress={() => handleFilterChange("all")} style={styles.filterChip} selectedColor="#3b82f6">All Files</Chip>
            <Chip selected={activeFilter === "images"} onPress={() => handleFilterChange("images")} style={styles.filterChip} selectedColor="#3b82f6">Images</Chip>
            <Chip selected={activeFilter === "videos"} onPress={() => handleFilterChange("videos")} style={styles.filterChip} selectedColor="#3b82f6">Videos</Chip>
            <Chip selected={activeFilter === "documents"} onPress={() => handleFilterChange("documents")} style={styles.filterChip} selectedColor="#3b82f6">Documents</Chip>
          </ScrollView>
        </View>

        {(loading && !refreshing) ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#7c3aed" />
          </View>
        ) : filteredFiles.length === 0 ? (
          <ScrollView
            contentContainerStyle={styles.emptyContainer}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          >
            <Ionicons name="images-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyText}>No files found</Text>
            <Text style={styles.emptySubtext}>
              {activeFilter === "all" ? "Upload your first file" : `No ${activeFilter} found. Try another filter or upload new files.`}
            </Text>
          </ScrollView>
        ) : (
          <FlatList
          
            data={filteredFiles}
            renderItem={viewMode === "grid" ? renderGridItem : renderListItem}
            keyExtractor={(item, index) => item.publicId ? item.publicId.toString() : `index-${index}`}
            numColumns={viewMode === "grid" ? numColumns : 1}
            key={viewMode}
            contentContainerStyle={styles.listContent}
            columnWrapperStyle={viewMode === "grid" ? styles.gridColumnWrapper : null}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            extraData={selectedFiles} // Ensure re-render on selection change
          />
        )}
        {!isSelectionMode && (
          uploading ? (
            <FAB style={styles.fab} icon="loading" loading color="#ffffff" />
          ) : (
            <FAB style={styles.fab} icon="plus" onPress={handlePickAndUpload} color="#ffffff" />
          )
        )}
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
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
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    color: "#6b7280",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#9ca3af",
    textAlign: "center",
    marginTop: 8,
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    backgroundColor: '#fff',
  },
  filterChip: {
    marginRight: 8,
    backgroundColor: '#f3f4f6',
  },
  listContent: {
    padding: 8,
  },
  gridColumnWrapper: {
    // No change needed, space-between handled by item width/margin
  },
  gridItem: {
    width: (screenWidth - 32) / numColumns, // 8 padding on each side, 4 margin between
    height: (screenWidth - 32) / numColumns,
    margin: 4,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#f3f4f6",
    position: 'relative', // Needed for overlay and selection icon
  },
  gridImage: {
    width: "100%",
    height: "100%",
  },
  gridFile: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  gridFileType: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#7c3aed",
    marginTop: 4,
  },
  gridItemOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    padding: 6,
  },
  gridItemName: {
    color: "#ffffff",
    fontSize: 12,
  },
  selectionCircle: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
  },
  listItem: {
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    backgroundColor: '#fff', // Ensure background for selection color
  },
  selectedListItem: {
    backgroundColor: '#e0e7ff', // Light blue for selected list items
  },
  listItemContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  listSelectionIcon: {
    marginRight: 15,
  },
  listItemIcon: {
    marginRight: 12,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listItemThumb: {
    width: 40,
    height: 40,
    borderRadius: 4,
  },
  listItemInfo: {
    flex: 1,
  },
  listItemName: {
    fontSize: 16,
    color: '#1f2937',
  },
  listItemDetails: {
    fontSize: 12,
    color: "#6b7280",
  },
  authButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  authButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#7c3aed',
  },
});

export default GalleryScreen;