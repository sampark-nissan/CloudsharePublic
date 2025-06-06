import React from "react"
import { View, StyleSheet, StatusBar } from "react-native"
import { Text, Appbar } from "react-native-paper"
import { SafeAreaView } from "react-native-safe-area-context"

const NotificationScreen = ({ navigation }) => {
  return (
    <>
      <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />
      <SafeAreaView style={styles.container} edges={["top"]}>
        <Appbar.Header style={styles.header}>
          <Appbar.BackAction onPress={() => navigation.goBack()} />
          <Appbar.Content
            title="Notifications"
            titleStyle={styles.headerTitle}
          />
        </Appbar.Header>

        <View style={styles.content}>
          <Text style={styles.text}>No notifications yet</Text>
        </View>
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
    backgroundColor: "#ffffff",
    elevation: 0,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#0f172a",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  text: {
    fontSize: 16,
    color: "#64748b",
  },
})

export default NotificationScreen
