import Ionicons from 'react-native-vector-icons/Ionicons';
import { useState, useEffect, useRef, useCallback } from "react";
import { View, StyleSheet, Image, TouchableOpacity, Share, Alert, FlatList, Dimensions, Platform, LayoutAnimation, UIManager } from "react-native";
import { Text, Appbar, Button, Menu, Divider, Dialog, Portal, ActivityIndicator } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { deleteFile, createShareLink } from "../../services/firebaseService";
import { StatusBar } from 'react-native';
import RNFS from 'react-native-fs';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android') {
    UIManager.setLayoutAnimationEnabledExperimental && UIManager.setLayoutAnimationEnabledExperimental(true);
}

const FileDetailScreen = ({ route, navigation }) => {
    const { files: allFiles = [], currentIndex: initialIndex = 0 } = route.params;
    if (allFiles.length > 0 && initialIndex !== undefined && initialIndex >= 0 && initialIndex < allFiles.length) {
        console.log("  File expected to be displayed:", allFiles[initialIndex]);
    } else {
        console.log("  Initial file could not be determined from params.");
    }

    const [currentFile, setCurrentFile] = useState(null);
    const [currentIndex, setCurrentIndex] = useState(initialIndex); // Initialize currentIndex with initialIndex
    const [menuVisible, setMenuVisible] = useState(false);
    const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
    const [shareDialogVisible, setShareDialogVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isScreenLoading, setIsScreenLoading] = useState(true);
    const [showDetails, setShowDetails] = useState(false); // New state to control details visibility

    const flatListRef = useRef(null);
    const screen = Dimensions.get("window");

    // This useEffect will now focus on setting the initial currentFile and handling no files
    useEffect(() => {
        if (allFiles.length > 0) {
            // Ensure initialIndex is within bounds
            const validInitialIndex = Math.min(Math.max(0, initialIndex), allFiles.length - 1);
            setCurrentIndex(validInitialIndex); // Set currentIndex definitively
            setCurrentFile(allFiles[validInitialIndex]); // Set currentFile based on the valid initial index
            setIsScreenLoading(false);

            // Scroll to the initial item if the FlatList is ready
            // Use a timeout to ensure FlatList has rendered its items
            const timer = setTimeout(() => {
                if (flatListRef.current) {
                    flatListRef.current.scrollToIndex({ index: validInitialIndex, animated: false });
                }
            }, 100); // Small delay to allow FlatList to render
            return () => clearTimeout(timer);
        } else {
            // No files scenario
            if (!isScreenLoading) { // Only show alert if not already loading and no files
                Alert.alert("No Files", "No files available to display.", [
                    { text: "OK", onPress: () => navigation.goBack() }
                ]);
            }
            setIsScreenLoading(false); // Make sure loading state is off even if no files
        }
    }, [allFiles, initialIndex, navigation]); // Removed isScreenLoading from deps to prevent re-runs after initial load

    // This useEffect will update currentFile and appbar title when currentIndex changes (e.g., via FlatList scroll)
    useEffect(() => {
        if (allFiles.length > 0 && currentIndex >= 0 && currentIndex < allFiles.length) {
            const newFile = allFiles[currentIndex];
            setCurrentFile(newFile);
            navigation.setOptions({ title: newFile.name });
        }
    }, [currentIndex, allFiles, navigation]); // Removed flatListRef.current.scrollToIndex as it's handled on initial load and by onViewableItemsChanged indirectly

    // Function to toggle details visibility with animation
    const toggleDetails = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setShowDetails(!showDetails);
    };

    const handleDelete = async () => {
        setLoading(true);
        try {
            if (!currentFile || !currentFile.publicId) {
                Alert.alert("Error", "File information is incomplete for deletion.");
                return;
            }
            await deleteFile(currentFile.publicId);
            Alert.alert("Success", "File deleted successfully");
            navigation.navigate('Gallery', { refresh: true });
        } catch (error) {
            console.error("Error deleting file:", error);
            Alert.alert("Error", "Failed to delete file. Please try again.");
        } finally {
            setLoading(false);
            setDeleteDialogVisible(false);
        }
    };

    const handleShare = async () => {
        setLoading(true);
        try {
            if (!currentFile || !currentFile.id) {
                Alert.alert("Error", "File information is incomplete for sharing.");
                return;
            }
            const result = await createShareLink(currentFile.id, {
                expiration: "7d",
                accessType: "public",
                password: "",
            });
            const shareUrl = result?.link ?? '';
            const fileName = currentFile?.name ?? 'Shared File';

            const shareContent = {
                message: `Check out this file: ${shareUrl}`,
                title: fileName,
                ...(Platform.OS === 'ios' && shareUrl && { url: shareUrl }),
            };

            await Share.share(shareContent);
        } catch (error) {
            console.error("Error sharing file:", error);
            Alert.alert("Error", "Failed to share file.");
        } finally {
            setLoading(false);
            setShareDialogVisible(false);
        }
    };

    const formatBytes = (bytes, decimals = 2) => {
        if (!+bytes) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return "Unknown";
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString() + " " + date.toLocaleTimeString();
    };

    const getFileIcon = (fileType) => {
        if (fileType?.includes("image")) return "image-outline";
        if (fileType?.includes("video")) return "videocam-outline";
        if (fileType?.includes("pdf")) return "document-text-outline";
        if (fileType?.includes("audio")) return "musical-notes-outline";
        if (fileType?.includes("text")) return "document-text-outline";
        if (fileType?.includes("zip") || fileType?.includes("rar")) return "folder-zip-outline";
        return "document-outline";
    };

    const handleDownload = async () => {
        setLoading(true);
        try {
            if (!currentFile || !currentFile.url || !currentFile.name) {
                Alert.alert("Error", "File information is incomplete for download.");
                return;
            }

            const fileName = currentFile.name;
            const downloadDest = `${Platform.OS === 'android' ? RNFS.DownloadDirectoryPath : RNFS.DocumentDirectoryPath}/${fileName}`;

            Alert.alert("Downloading...", `Starting download for ${fileName}`);

            const { promise } = RNFS.downloadFile({
                fromUrl: currentFile.url,
                toFile: downloadDest,
            });

            const result = await promise;

            if (result.statusCode === 200) {
                Alert.alert("Download Complete", `File saved to:\n${downloadDest}`);
            } else {
                throw new Error(`Download failed with status code ${result.statusCode}`);
            }

        } catch (error) {
            console.error("Download error:", error);
            Alert.alert("Download Failed", "Could not download the file. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // This ensures currentFile is updated when the FlatList scrolls
    const onViewableItemsChanged = useCallback(({ viewableItems }) => {
        if (viewableItems.length > 0) {
            const firstVisibleItem = viewableItems[0].item;
            const firstVisibleIndex = viewableItems[0].index;

            if (firstVisibleItem && firstVisibleItem.publicId !== currentFile?.publicId) {
                setCurrentFile(firstVisibleItem);
                setCurrentIndex(firstVisibleIndex); // Also update currentIndex
                navigation.setOptions({ title: firstVisibleItem.name }); // Update app bar title immediately
            }
        }
    }, [currentFile, navigation]); // Add currentFile to dependencies to ensure it's up-to-date

    const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

    const renderFileItem = useCallback(({ item }) => {
        return (
            <View style={[styles.filePreviewContainer, { width: screen.width }]}>
                {item.type?.includes("image") ? (
                    <Image
                        source={{ uri: item.url }}
                        style={styles.previewImage}
                        key={item.publicId}
                        resizeMode="contain" // Add resizeMode to ensure image fits
                    />
                ) : (
                    <View style={styles.fileIconContainer}>
                        <Ionicons name={getFileIcon(item.type)} size={128} color="#7c3aed" />
                        <Text style={styles.fileTypeText}>{item.type?.split("/")[1]?.toUpperCase() || "FILE"}</Text>
                    </View>
                )}
            </View>
        );
    }, [screen.width]);

    if (isScreenLoading || !currentFile) {
        return (
            <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#7c3aed" />
                <Text style={{ marginTop: 10 }}>Loading file details...</Text>
            </SafeAreaView>
        );
    }

    const isImageFile = currentFile?.type?.includes("image");

    return (
        <>
            <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />
            <SafeAreaView style={[styles.container, { backgroundColor: isImageFile ? 'transparent' : '#ffffff' }]} edges={["top", "bottom"]}>
                {isImageFile && (
                    <Image
                        source={{ uri: currentFile.url }}
                        style={styles.backgroundImage}
                        blurRadius={10} // Adjust blur as needed
                    />
                )}

                <Appbar.Header style={styles.appbar}>
                    <Appbar.BackAction onPress={() => navigation.goBack()} />
                    <Appbar.Content title={currentFile?.name || "File Details"} titleStyle={styles.appbarTitle} numberOfLines={1} />
                    <Menu
                        visible={menuVisible}
                        onDismiss={() => setMenuVisible(false)}
                        anchor={<Appbar.Action icon="dots-vertical" onPress={() => setMenuVisible(true)} />}
                    >
                        <Menu.Item title="Share" leadingIcon="share-variant" onPress={() => { setMenuVisible(false); setShareDialogVisible(true); }} />
                        <Menu.Item
                            title="Edit"
                            leadingIcon="pencil"
                            onPress={() => {
                                setMenuVisible(false);
                                if (currentFile.type?.includes("image")) {
                                    navigation.navigate("EditImage", { file: currentFile });
                                } else {
                                    Alert.alert("Not Supported", "Editing is only available for images.");
                                }
                            }}
                        />
                        <Menu.Item title="Download" leadingIcon="download" onPress={() => { setMenuVisible(false); handleDownload(); }} />
                        <Divider />
                        <Menu.Item title="Delete" leadingIcon="delete" onPress={() => { setMenuVisible(false); setDeleteDialogVisible(true); }} titleStyle={{ color: '#ef4444' }}/>
                    </Menu>
                </Appbar.Header>

                <View style={styles.flatListContainer}>
                    { allFiles.length > 0 ? (
                        <FlatList
                            ref={flatListRef}
                            data={allFiles}
                            renderItem={renderFileItem}
                            keyExtractor={(item) => item.publicId}
                            horizontal
                            pagingEnabled
                            showsHorizontalScrollIndicator={false}
                            // initialScrollIndex={initialIndex} // Removed this, handled by useEffect and setTimeout
                            onViewableItemsChanged={onViewableItemsChanged}
                            viewabilityConfig={viewabilityConfig}
                            getItemLayout={(data, index) => ({
                                length: screen.width,
                                offset: screen.width * index,
                                index,
                            })}
                            scrollEnabled={true}
                            extraData={currentFile} // Add currentFile here to re-render FlatList when currentFile changes
                        />
                    ) : (
                        <View style={styles.filePreviewContainer}><Text style={styles.fileTypeText}>No files to display.</Text></View>
                    ) }
                </View>

                {/* Bottom section with expandable details and fixed actions */}
                <View style={styles.bottomSection}>
                    {showDetails && (
                        <View style={styles.fileDetailsExpanded}>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Size</Text>
                                <Text style={styles.detailValue}>{formatBytes(currentFile.size)}</Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Type</Text>
                                <Text style={styles.detailValue}>{currentFile.type || "Unknown"}</Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Uploaded</Text>
                                <Text style={styles.detailValue}>{formatDate(currentFile.createdAt)}</Text>
                            </View>
                        </View>
                    )}

                    {/* All actions and toggle button in one row */}
                    <View style={styles.fileActionsUnified}>
                        <TouchableOpacity style={styles.actionButton} onPress={() => setShareDialogVisible(true)}>
                            <View style={styles.actionIconContainer}>
                                <Ionicons name="share-social-outline" size={24} color="#7c3aed" />
                            </View>
                            <Text style={styles.actionText}>Share</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionButton} onPress={handleDownload} disabled={loading}>
                            <View style={styles.actionIconContainer}>
                                <Ionicons name="download-outline" size={24} color="#7c3aed" />
                            </View>
                            <Text style={styles.actionText}>Download</Text>
                        </TouchableOpacity>

                        {currentFile.type?.includes("image") && (
                            <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate("EditImage", { file: currentFile })}>
                                <View style={styles.actionIconContainer}>
                                    <Ionicons name="color-wand-outline" size={24} color="#7c3aed" />
                                </View>
                                <Text style={styles.actionText}>Edit</Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity style={styles.actionButton} onPress={() => setDeleteDialogVisible(true)}>
                            <View style={[styles.actionIconContainer, styles.deleteIconContainer]}>
                                <Ionicons name="trash-outline" size={24} color="#ef4444" />
                            </View>
                            <Text style={styles.deleteActionText}>Delete</Text>
                        </TouchableOpacity>

                        {/* Toggle Button within the action row */}
                        <TouchableOpacity style={styles.actionButton} onPress={toggleDetails}>
                            <View style={styles.actionIconContainer}>
                                <Ionicons
                                    name={showDetails ? "chevron-down-circle-outline" : "chevron-up-circle-outline"}
                                    size={24} // Smaller size to fit with others
                                    color="#7c3aed"
                                />
                            </View>
                            <Text style={styles.actionText}>
                                {showDetails ? "Hide" : "Details"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <Portal>
                    <Dialog visible={deleteDialogVisible} onDismiss={() => setDeleteDialogVisible(false)}>
                        <Dialog.Title>Delete File</Dialog.Title>
                        <Dialog.Content>
                            <Text>Are you sure you want to delete "{currentFile?.name}"? This action cannot be undone.</Text>
                        </Dialog.Content>
                        <Dialog.Actions>
                            <Button onPress={() => setDeleteDialogVisible(false)}>Cancel</Button>
                            <Button onPress={handleDelete} loading={loading} disabled={loading} textColor="#ef4444">
                                Delete
                            </Button>
                        </Dialog.Actions>
                    </Dialog>
                </Portal>

                <Portal>
                    <Dialog visible={shareDialogVisible} onDismiss={() => setShareDialogVisible(false)}>
                        <Dialog.Title>Share File</Dialog.Title>
                        <Dialog.Content>
                            {loading ? (
                                <ActivityIndicator style={styles.shareLoader} size="large" color="#7c3aed" />
                            ) : (
                                <Text style={styles.shareDialogText}>
                                    A share link will be generated and opened.
                                </Text>
                            )}
                        </Dialog.Content>
                        <Dialog.Actions>
                            <Button onPress={() => setShareDialogVisible(false)} disabled={loading}>Cancel</Button>
                            <Button onPress={handleShare} loading={loading} disabled={loading}>
                                Share Now
                            </Button>
                        </Dialog.Actions>
                    </Dialog>
                </Portal>
            </SafeAreaView>
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff', // Default background for non-image files
    },
    appbar: {
        backgroundColor: 'rgba(255, 255, 255, 0.8)', // Semi-transparent for overlay
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10, // Ensure it's above the image
        elevation: 0, // Remove shadow
    },
    appbarTitle: {
        color: '#333',
        fontSize: 18,
    },
   backgroundImage: {
  ...StyleSheet.absoluteFillObject,
  opacity: 0.15, // Very subtle blur background
  resizeMode: "cover",
},
    flatListContainer: {
  flex: 1,
  backgroundColor: "#000", // Unified dark background
},
   filePreviewContainer: {
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: '#f9f9f9',
},
   previewImage: {
  width: "100%",
  height: "100%",
  resizeMode: "contain",
  borderRadius: 10,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.3,
  shadowRadius: 4,
  elevation: 5,
  backgroundColor: '#f0f0f0',
},
    fileIconContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    fileTypeText: {
        marginTop: 10,
        fontSize: 18,
        fontWeight: 'bold',
        color: '#7c3aed',
    },
    bottomSection: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)', // Semi-transparent background
        paddingVertical: 15,
        paddingHorizontal: 10,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        elevation: 5, // Add shadow for a raised effect
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    fileDetailsExpanded: {
        paddingHorizontal: 10,
        paddingBottom: 15,
        marginBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 5,
    },
    detailLabel: {
        fontSize: 14,
        color: '#555',
    },
    detailValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
    },
    fileActionsUnified: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    actionButton: {
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 5,
    },
    actionIconContainer: {
        backgroundColor: '#eee',
        borderRadius: 25,
        padding: 10,
        marginBottom: 5,
    },
    deleteIconContainer: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)', // Light red background for delete icon
    },
    actionText: {
        fontSize: 12,
        color: '#555',
    },
    deleteActionText: {
        fontSize: 12,
        color: '#ef4444',
    },
    shareDialogText: {
        textAlign: 'center',
        marginVertical: 10,
        fontSize: 16,
    },
    shareLoader: {
        marginVertical: 20,
    }
});

export default FileDetailScreen;
