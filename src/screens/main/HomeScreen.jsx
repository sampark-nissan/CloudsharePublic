"use client"

import { useState, useEffect } from "react"
import { View, StyleSheet, ScrollView, TouchableOpacity, Image, RefreshControl } from "react-native"
import { Text } from "react-native-paper"
import { SafeAreaView } from "react-native-safe-area-context"
import { useAuth } from "../../context/AuthContext"
import { getUserFiles, getActualStorageStats } from "../../services/firebaseService"
import { StatusBar } from "react-native"
import { theme } from "../../theme"
import FontAwesome5 from "react-native-vector-icons/FontAwesome5"
import Ionicons from 'react-native-vector-icons/Ionicons';
import EvilIcons from 'react-native-vector-icons/EvilIcons';
import Feather from 'react-native-vector-icons/Feather';

const HomeScreen = ({ navigation, route }) => {
    const { user } = useAuth()
    const [files, setFiles] = useState([])
    const [stats, setStats] = useState({
        totalFiles: 0,
        totalStorage: 0,
        storageLimit: 1 * 1024 * 1024 * 1024, // 1 GB
    })
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)

    const handleGalleryPress = () => {
        navigation.navigate("Gallery", { upload: true })
    }

    const loadData = async () => {
        try {
            setLoading(true)
            const [filesData, statsData] = await Promise.all([getUserFiles(), getActualStorageStats()])

            setFiles(filesData.slice(0, 5))
            setStats(statsData)
        } catch (error) {
            console.error("Error loading home data:", error)
        } finally {
            setLoading(false)
        }
    }

    const onRefresh = async () => {
        setRefreshing(true)
        await loadData()
        setRefreshing(false)
    }

    useEffect(() => {
        loadData()
    }, [])

    const formatBytes = (bytes, decimals = 2) => {
        if (bytes === 0) return "0 Bytes"

        const k = 1024
        const dm = decimals < 0 ? 0 : decimals
        const sizes = ["Bytes", "KB", "MB", "GB", "TB"]

        const i = Math.floor(Math.log(bytes) / Math.log(k))

        return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i]
    }

    const getFileIcon = (fileType) => {
        if (fileType.includes("image")) {
            return "image-outline"
        } else if (fileType.includes("video")) {
            return "videocam-outline"
        } else if (fileType.includes("pdf")) {
            return "document-text-outline"
        } else {
            return "document-outline"
        }
    }

    const getStoragePercentage = () => {

        if (!stats.storageLimit || stats.storageLimit === 0) return 0

        return Math.min((stats.totalStorage / stats.storageLimit) * 100, 100)

    }


    return (
        <>
            <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />
            <SafeAreaView style={styles.container} edges={["top"]}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>CloudShare</Text>
                    <View style={styles.headerIcons}>
                        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate("Notification")}>
                            <FontAwesome5 name="bell" size={20} color="#333" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.profileButton} onPress={() => navigation.navigate("Profile")}>
                            <Text style={styles.profileButtonText}>S</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.divider} />

                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0ea5e9"]} />}
                    showsVerticalScrollIndicator={false}
                    showsHorizontalScrollIndicator={false}
                >
                    <View style={styles.welcomeSection}>
                        <Text style={styles.welcomeHeading}>Welcome back, {user?.name || "sam"}</Text>
                        <Text style={styles.welcomeSubtext}>Your files are ready</Text>
                    </View>

                    <View style={styles.statsContainer}>
                        <View style={styles.statsCard}>
                            <Text style={styles.statsLabel}>Storage Used</Text>
                            <View style={styles.storageInfo}>
                                <Text style={styles.storageValue}>{formatBytes(stats.totalStorage).split(" ")[0]}</Text>
                                <Text style={styles.storageUnit}>
                                    {formatBytes(stats.totalStorage).includes(" ") ? " " + formatBytes(stats.totalStorage).split(" ")[1]
                                        : ""}</Text>
                                <Text style={styles.storageLimit}>/ {formatBytes(stats.storageLimit)}</Text>
                            </View>
                            <View style={styles.progressBarContainer}>
                                <View style={[styles.progressBar,{ width: `${getStoragePercentage()}%`,
                                 backgroundColor: getStoragePercentage() >= 90 ? theme.colors.error : "#0ea5e9", },
                                    ]}
                                />
                            </View>
                        </View>

                        <View style={styles.statsCard}>
                            <Text style={styles.statsLabel}>Items</Text>
                            <View style={styles.filesInfo}>
                            <Text style={styles.filesCount}>{stats.totalFiles}</Text>
                            <Text style={styles.filesLabel}>items</Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.quickActionsSection}>
                        <Text style={styles.sectionTitle}>Quick Actions</Text>

                        <View style={styles.quickActions}>
                            <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate("Share")}>
                                <View style={[styles.actionIconContainer, { backgroundColor: "#eef6ff" }]}>
                                    <Feather name="share" size={22} color="#666" />
                                </View>
                                <Text style={styles.actionText}>Share</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.actionButton} onPress={handleGalleryPress}>
                                <View style={[styles.actionIconContainer, { backgroundColor: "#f5f0ff" }]}>
                                    <Ionicons name="cloud-upload-outline" size={26} color="#666" />
                                </View>
                                <Text style={styles.actionText}>Upload</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate("Gallery")}>
                                <View style={[styles.actionIconContainer, { backgroundColor: "#f0fff4" }]}>
                                    <FontAwesome5 name="images" size={21} color="#666" />
                                </View>
                                <Text style={styles.actionText}>Gallery</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate("AI Tools")}>
                                <View style={[styles.actionIconContainer, { backgroundColor: "#fff7f0" }]}>
                                    <FontAwesome5 name="magic" size={20} color="#666" />
                                </View>
                                <Text style={styles.actionText}>Edit</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.recentFilesSection}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Recent Files</Text>
                            <TouchableOpacity onPress={() => navigation.navigate("Gallery")}>
                                <Text style={styles.viewAllText}>View all</Text>
                            </TouchableOpacity>
                        </View>

                        {loading ? (
                            <View style={styles.loaderContainer} />
                        ) : files.length === 0 ? (
                            <View style={styles.emptyContainer}>
                                <View style={styles.emptyIconContainer}>
                                    <FontAwesome5 name="cloud-upload-alt" size={24} color="#ccc" />
                                </View>
                                <Text style={styles.emptyText}>No recent files</Text>
                            </View>
                        ) : (
                            files.map((file) => (
                                <TouchableOpacity key={file.id} onPress={() => navigation.navigate("FileDetail", { file })}>
                                    <View style={styles.fileCard}>
                                        <View style={styles.fileIconContainer}>
                                            {file.type?.includes("image") ? (
                                                <Image source={{ uri: file.url }} style={styles.fileThumb} resizeMode="cover" />
                                            ) : (
                                                <FontAwesome5 name={getFileIcon(file.type || "")} size={24} color="#0ea5e9" />
                                            )}
                                        </View>
                                        <View style={styles.fileInfo}>
                                            <Text style={styles.fileName} numberOfLines={1}>
                                                {file.name}
                                            </Text>
                                            <Text style={styles.fileDetails}>
                                                {formatBytes(file.size)} • {new Date(file.createdAt?.toDate()).toLocaleDateString()}
                                            </Text>
                                        </View>
                                        <TouchableOpacity>
                                            <FontAwesome5 name="ellipsis-v" size={16} color="#999" />
                                        </TouchableOpacity>
                                    </View>
                                </TouchableOpacity>
                            ))
                        )}
                    </View>
                </ScrollView>
            </SafeAreaView>
        </>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#ffffff",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: "#ffffff",
    },
    headerTitle: {
        color: "#0ea5e9",
        fontWeight: "bold",
        fontSize: 28,
    },
    headerIcons: {
        flexDirection: "row",
        alignItems: "center",
    },
    iconButton: {
        marginRight: 16,
    },
    profileButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#0ea5e9",
        justifyContent: "center",
        alignItems: "center",
    },
    profileButtonText: {
        color: "#ffffff",
        fontWeight: "bold",
        fontSize: 18,
    },
    divider: {
        height: 1,
        backgroundColor: "#f0f0f0",
        width: "100%",
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 80,
    },
    welcomeSection: {
        marginBottom: 24,
    },
    welcomeHeading: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#333",
        marginBottom: 4,
    },
    welcomeSubtext: {
        fontSize: 16,
        color: "#666",
    },
    statsContainer: {
        flexDirection: "row",
        marginBottom: 32,
        gap: 16,
    },
    statsCard: {
        flex: 1,
        borderRadius: 12,
        backgroundColor: "#f8f8f8",
        padding: 16,
    },
    statsLabel: {
        fontSize: 16,
        color: "#666",
        marginBottom: 8,
        fontWeight: "500",
    },
    storageInfo: {
        flexDirection: "row",
        alignItems: "baseline",
        marginBottom: 12,
    },
    storageValue: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#333",
    },
    storageUnit: {
        fontSize: 14,
        color: "#666",
    },
    progressBarContainer: {
        height: 5,
        backgroundColor: "#e0e0e0",
        borderRadius: 3,
    },
    progressBar: {
        height: 5,
        borderRadius: 3,
    },
    filesInfo: {
        flexDirection: "row",
        alignItems: "baseline",
        marginBottom: 12,
    },
    filesCount: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#333",
    },
    filesLabel: {
        fontSize: 14,
        color: "#666",
    },
    quickActionsSection: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#333",
        marginBottom: 16,
    },
    quickActions: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    actionButton: {
        alignItems: "center",
        width: "22%",
    },
    actionIconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 8,
    },
    actionText: {
        fontSize: 14,
        fontWeight: "500",
        color: "#666",
    },
    recentFilesSection: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    viewAllText: {
        fontSize: 14,
        color: "#0ea5e9",
        fontWeight: "500",
    },
    loaderContainer: {
        height: 100,
    },
    emptyContainer: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 40,
    },
    emptyIconContainer: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: "#f5f5f5",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 16,
    },
    emptyText: {
        color: "#999",
        fontSize: 16,
    },
    fileCard: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        backgroundColor: "#ffffff",
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#f0f0f0",
    },
    fileIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 8,
        backgroundColor: "#f5f5f5",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 16,
        overflow: "hidden",
    },
    fileThumb: {
        width: 48,
        height: 48,
    },
    fileInfo: {
        flex: 1,
    },
    fileName: {
        fontSize: 16,
        fontWeight: "600",
        color: "#333",
        marginBottom: 4,
    },
    fileDetails: {
        fontSize: 14,
        color: "#999",
    },
})

export default HomeScreen
