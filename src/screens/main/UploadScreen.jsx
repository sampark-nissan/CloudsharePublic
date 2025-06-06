"use client"

import Ionicons from 'react-native-vector-icons/Ionicons'
import { useState, useEffect } from "react"
import { View, StyleSheet, ScrollView, TouchableOpacity, Image, Platform, Alert } from "react-native"
import { Text, Appbar, Button, ProgressBar, List, RadioButton } from "react-native-paper"
import { SafeAreaView } from "react-native-safe-area-context"
import { PermissionsAndroid } from 'react-native';
import { launchImageLibrary } from "react-native-image-picker"
import { uploadToCloudinary } from "../../services/cloudinaryService"
import { saveFileMetadata } from "../../services/firebaseService"
import { StatusBar } from 'react-native'
import { Timestamp } from '@react-native-firebase/firestore'

const UploadScreen = ({ navigation }) => {
    const [selectedFiles, setSelectedFiles] = useState([])
    const [uploading, setUploading] = useState(false)
    const [progress, setProgress] = useState(0)
    const [expiration, setExpiration] = useState()

    const requestMediaPermission = async () => {
        if (Platform.OS === 'android') {
            const version = parseInt(Platform.Version, 10)
            let permissions = []

            if (version >= 33) {
                permissions = [
                    PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
                    PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
                ]
            } else {
                permissions = [PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE]
            }

            const granted = await PermissionsAndroid.requestMultiple(permissions)
            return Object.values(granted).every(result => result === PermissionsAndroid.RESULTS.GRANTED)
        }
        return true
    }

    // useEffect(() => {
    // if (file) {
    //     uploadFiles(file);
    // }
    // }, [file]); 


    const pickImage = async () => {
        const hasPermission = await requestMediaPermission()
        if (!hasPermission) {
            Alert.alert("Permission required", "Please allow access to media to select files.")
            return
        }

        const result = await launchImageLibrary({
            mediaType: "photo",
            selectionLimit: 0, // 0 for unlimited
        });

        if (result.didCancel) return;

        if (result.assets) {
            const files = result.assets.map((asset) => ({
                uri: asset.uri,
                type: asset.type,
                name: asset.fileName,
                size: asset.fileSize,
            }));
            setSelectedFiles([...selectedFiles, ...files]);
        }
    }


    const pickDocument = async () => {
        try {
            const results = await DocumentPicker.pick({
                type: [DocumentPicker.types.allFiles],
                allowMultiSelection: true,
            })

            const newFiles = results.map((result) => ({
                uri: result.uri,
                type: result.type || "application/octet-stream",
                name: result.name || `file-${Date.now()}`,
                size: result.size || 0,
            }))

            setSelectedFiles([...selectedFiles, ...newFiles])
        } catch (error) {
            if (DocumentPicker.isCancel(error)) {
            } else {
                console.error("Error picking document:", error)
                Alert.alert("Error", "Failed to pick document. Please try again.")
            }
        }
    }

    const removeFile = (index) => {
        const newFiles = [...selectedFiles]
        newFiles.splice(index, 1)
        setSelectedFiles(newFiles)
    }

    const uploadFiles = async () => {
        if (selectedFiles.length === 0) {
            Alert.alert("No Files", "Please select files to upload.")
            return
        }

        if (!expiration) {
            Alert.alert("Select Expiration", "Please select a link expiration time.");
            return;
        }

        setUploading(true)
        setProgress(0)

        try {
            const hoursToExpire = expiration;
            const currentTime = new Date();
            const expirationDate = new Date(currentTime.getTime() + hoursToExpire * 60 * 60 * 1000);
            const expirationAt = Timestamp.fromDate(expirationDate);

            const totalFiles = selectedFiles.length
            const uploadedFiles = []

            for (let i = 0; i < totalFiles; i++) {
                const file = selectedFiles[i]
                try {

                    const uploadResult = await uploadToCloudinary(file.uri, file.type)

                    const fileData = {
                        name: file.name,
                        type: file.type,
                        size: uploadResult.bytes,
                        url: uploadResult.secure_url,
                        publicId: uploadResult.public_id,
                        format: uploadResult.format,
                        resourceType: uploadResult.resource_type,
                        expiry: expirationAt,
                    }

                    const fileId = await saveFileMetadata(fileData)

                    uploadedFiles.push({
                        id: fileId,
                        ...fileData,
                    })

                    setProgress((i + 1) / totalFiles)
                } catch (error) {
                    console.warn(`Failed to upload file ${file.name}`, error);
                    continue;
                }
            }

            Alert.alert("Upload Complete", `Successfully uploaded ${totalFiles} file${totalFiles > 1 ? "s" : ""}.`, [
                {
                    text: "OK",
                    onPress: () => navigation.goBack(),
                },
            ])
        } catch (error) {
            console.error("Error uploading files:", error)
            Alert.alert("Upload Failed", "There was an error uploading your files. Please try again.")
        } finally {
            setUploading(false)
        }
    }

    const getFileIcon = (fileType) => {
        if (fileType.includes("image")) {
            return "image-outline"
        } else if (fileType.includes("video")) {
            return "videocam-outline"
        } else if (fileType.includes("pdf")) {
            return "document-text-outline"
        } else if (fileType.includes("word")) {
            return "document-outline"
        } else if (fileType.includes("sheet") || fileType.includes("excel")) {
            return "grid-outline"
        } else {
            return "document-outline"
        }
    }

    const formatBytes = (bytes, decimals = 2) => {
        if (bytes === 0) return "0 Bytes"

        const k = 1024
        const dm = decimals < 0 ? 0 : decimals
        const sizes = ["Bytes", "KB", "MB", "GB", "TB"]

        const i = Math.floor(Math.log(bytes) / Math.log(k))

        return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i]
    }

    return (
        <>
            <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />
            <SafeAreaView style={styles.container} edges={["top"]}>
                <Appbar.Header style={{ backgroundColor: "#ffffff", height: 35, elevation: 0 }}>
                    <Appbar.BackAction onPress={() => navigation.goBack()} />
                    <Appbar.Content title="Share files" titleStyle={{ textAlignVertical: "center" }} />
                </Appbar.Header>

                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
                    <TouchableOpacity style={styles.uploadArea} onPress={pickImage} disabled={uploading}>
                        <View style={styles.uploadIconContainer}>
                            <Ionicons name="cloud-upload-outline" size={48} color="#7c3aed" />
                        </View>
                        <Text style={styles.uploadTitle}>Tap to upload files</Text>
                        <Text style={styles.uploadSubtitle}>Supports images, videos, documents, and more</Text>

                        <View style={styles.uploadActions}>
                            <Button mode="contained" onPress={pickImage} style={styles.uploadButton} disabled={uploading}>
                                Choose Photos
                            </Button>
                            <Button mode="outlined" onPress={pickDocument} style={styles.uploadButton} disabled={uploading}>
                                Choose Files
                            </Button>
                        </View>
                    </TouchableOpacity>

                    {selectedFiles.length > 0 && (
                        <View style={styles.selectedFilesContainer}>
                            <Text style={styles.sectionTitle}>Selected Files ({selectedFiles.length})</Text>

                            {selectedFiles.map((file, index) => (
                                <View key={index} style={styles.fileItem}>
                                    <View style={styles.fileItemContent}>
                                        <View style={styles.fileIconContainer}>
                                            {file.type.includes("image") ? (
                                                <Image source={{ uri: file.uri }} style={styles.fileThumb} />
                                            ) : (
                                                <Ionicons name={getFileIcon(file.type)} size={24} color="#7c3aed" />
                                            )}
                                        </View>
                                        <View style={styles.fileInfo}>
                                            <Text style={styles.fileName} numberOfLines={1}>
                                                {file.name}
                                            </Text>
                                            <Text style={styles.fileSize}>{formatBytes(file.size)}</Text>
                                        </View>
                                        <TouchableOpacity onPress={() => removeFile(index)} disabled={uploading}>
                                            <Ionicons name="close-circle" size={24} color="#9ca3af" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}

                            {uploading && (
                                <View style={styles.progressContainer}>
                                    <View style={styles.progressInfo}>
                                        <Text style={styles.progressText}>Uploading...</Text>
                                        <Text style={styles.progressPercentage}>{Math.round(progress * 100)}%</Text>
                                    </View>
                                    <ProgressBar progress={progress} color="#7c3aed" style={styles.progressBar} />
                                </View>
                            )}
                        </View>
                    )}

                    <View style={styles.shareSettingsContainer}>
                        <Text style={styles.sectionTitle}>Share Settings</Text>

                        <List.Section>
                            <List.Accordion
                                title="Link Expiration"
                                description={
                                    expiration
                                        ? `${expiration} hour${expiration === "1" ? "" : "s"}`
                                        : "No selection"
                                }
                                left={(props) => <List.Icon {...props} icon="clock-outline" />}
                            >
                                <RadioButton.Group onValueChange={(value) => setExpiration(value)} value={expiration}>
                                    <RadioButton.Item label="1 hour" value="1" />
                                    <RadioButton.Item label="3 hours" value="3" />
                                    <RadioButton.Item label="7 hours" value="7" />
                                    <RadioButton.Item label="12 hours" value="12" />
                                    <RadioButton.Item label="18 hours" value="18" />
                                    <RadioButton.Item label="24 hours" value="24" />
                                </RadioButton.Group>
                            </List.Accordion>
                        </List.Section>

                    </View>
                </ScrollView>

                <View style={styles.bottomBar}>
                    <Button
                        mode="contained"
                        onPress={uploadFiles}
                        disabled={selectedFiles.length === 0 || uploading}
                        loading={uploading}
                        style={styles.uploadFilesButton}
                        contentStyle={styles.uploadFilesButtonContent}
                    >
                        {uploading ? "Uploading..." : "Upload Files"}
                    </Button>
                </View>
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
        paddingBottom: 80,
    },
    uploadArea: {
        backgroundColor: "#fff",
        borderRadius: 12,
        borderWidth: 2,
        borderColor: "#e5e7eb",
        borderStyle: "dashed",
        padding: 24,
        alignItems: "center",
        marginBottom: 24,
    },
    uploadIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: "#f3f0ff",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 16,
    },
    uploadTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#1f2937",
        marginBottom: 8,
    },
    uploadSubtitle: {
        fontSize: 14,
        color: "#6b7280",
        textAlign: "center",
        marginBottom: 24,
    },
    uploadActions: {
        flexDirection: "row",
        justifyContent: "center",
        width: "100%",
    },
    uploadButton: {
        marginHorizontal: 8,
    },
    selectedFilesContainer: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#1f2937",
        marginBottom: 16,
    },
    fileItem: {
        marginBottom: 12,
        backgroundColor: "#f9fafb",
        borderRadius: 8,
        overflow: "hidden",
    },
    fileItemContent: {
        flexDirection: "row",
        alignItems: "center",
        padding: 12,
    },
    fileIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 4,
        backgroundColor: "#f3f0ff",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
        overflow: "hidden",
    },
    fileThumb: {
        width: 40,
        height: 40,
    },
    fileInfo: {
        flex: 1,
    },
    fileName: {
        fontSize: 14,
        fontWeight: "500",
        color: "#1f2937",
    },
    fileSize: {
        fontSize: 12,
        color: "#9ca3af",
    },
    progressContainer: {
        marginTop: 16,
    },
    progressInfo: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 8,
    },
    progressText: {
        fontSize: 14,
        color: "#4b5563",
    },
    progressPercentage: {
        fontSize: 14,
        fontWeight: "500",
        color: "#7c3aed",
    },
    progressBar: {
        height: 6,
        borderRadius: 3,
    },
    shareSettingsContainer: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 16,
    },
    passwordContainer: {
        padding: 16,
    },
    bottomBar: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "#fff",
        borderTopWidth: 1,
        borderTopColor: "#e5e7eb",
        padding: 16,
    },
    uploadFilesButton: {
        width: "100%",
    },
    uploadFilesButtonContent: {
        height: 48,
    },
})

export default UploadScreen
