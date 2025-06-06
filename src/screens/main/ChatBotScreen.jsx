import { useNavigation } from "@react-navigation/native";
import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  FlatList,
  SafeAreaView,
  Alert,
} from "react-native";

import Icon from "react-native-vector-icons/Ionicons";
import { theme } from "../../theme";

const GEMINI_API_KEY = "############################################";

const ChatBotScreen = () => {
  const [msg, setMsg] = useState("");
  const [messages, setMessages] = useState([
    {
      text: "Hi! I'm CloudShare Assistant 🤖\nYou can ask me how to upload, share files, or manage your account.",
      sender: "gemini",
    },
  ]);

  const navigation = useNavigation();

  const contextPrompt = `
  You are a helpful assistant for the CloudShare app, designed to help users save phone storage by uploading and managing media files in the cloud.

  Here are the key features of the app:
  
  🔓 For Anonymous Users:
  - They can upload files (mostly images).
  - After uploading, they get a unique shareable link.
  - Shared files are accessible via the link until deleted.
  - They CANNOT:
    - Access a gallery of uploaded files
    - Edit images with AI tools
    - Log in or save any profile data
  
  🔐 For Logged-In Users:
  - Full access to their gallery of uploaded files.
  - Ability to delete uploaded files from their account.
  - Cloudinary(hidden backend) AI Editing Features:
    - Image enhancement
    - Background removal
    - Filters and resizing
  - Option to generate shareable links for any image.
  - Can log out or switch accounts.
  
  📱 App Interface:
  - Home: Upload and get a link (anonymous).
  - Login/Signup: Create or access an account.
  - Dashboard: View gallery, delete files, use AI tools.
  - Chatbot: Ask anything about using the app.
  
  🧠 Instructions to help users:
  - To upload and share, tap the upload button, select your image, and copy the generated link.
  - To access gallery and edit, sign in first using the "Login" button.
  - Use AI tools from the gallery by tapping an image and selecting "Edit".
  
  Your job is to answer any app-related questions, guide users with proper steps, and never give false or unrelated information. If a feature isn't available to a user (e.g., anonymous editing), let them know clearly and suggest logging in.
  `;

  const handleButtonClick = async () => {
    if (!msg.trim()) return;

    const userMessage = { text: msg, sender: "user" };

    const messagesForApi = [userMessage, ...messages];

    setMessages(messagesForApi);

    setMsg("");

    const reversedMessagesForApi = [...messagesForApi].reverse();

    const apiContents = reversedMessagesForApi.map((message) => ({
      role: message.sender === "user" ? "user" : "model",
      parts: [{ text: message.text }],
    }));

    let firstUserMessageIndex = -1;
    for (let i = 0; i < apiContents.length; i++) {
      if (apiContents[i].role === 'user') {
        firstUserMessageIndex = i;
        break;
      }
    }

    if (firstUserMessageIndex !== -1) {
      apiContents[firstUserMessageIndex].parts[0].text = contextPrompt + "\n\n" + apiContents[firstUserMessageIndex].parts[0].text;
    }
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: apiContents,
          }),
        }
      );

      const data = await response.json();
      console.log("Full API Response:", data);

      const reply =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        "I'm sorry, I didn't catch that."; // Default response if no valid content

      const geminiMessage = { text: reply, sender: "gemini" };
      setMessages((prev) => [geminiMessage, ...prev]);

    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) => [
        { text: "Something went wrong. Please try again later.", sender: "gemini" },
        ...prev,
      ]);
    }
  };

  const renderItem = ({ item }) => (
    <View
      style={[
        styles.message,
        item.sender === "user" ? styles.userMessage : styles.geminiMessage,
      ]}
    >
      <Text
        style={
          item.sender === "user"
            ? styles.userMessageText
            : styles.geminiMessageText
        }
      >
        {item.text}
      </Text>
    </View>
  );

  const handleClose = () => {
    Alert.alert(
      "Close Chat",
      "Your chat record may get deleted. Do you want to exit?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes",
          style: "destructive",
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chat Support</Text>
        <TouchableOpacity onPress={handleClose}>
          <Icon name="close" size={25} color="white" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={messages} 
        renderItem={renderItem} 
        keyExtractor={(_, index) => index.toString()} 
        contentContainerStyle={styles.messagesContainer} 
        inverted 
      />

      <View style={styles.inputView}>
        <TextInput
          style={styles.input}
          placeholder="Ask something..."
          value={msg}
          onChangeText={setMsg}
          placeholderTextColor="gray"
        />

        <TouchableOpacity style={styles.button} onPress={handleButtonClick}>
          <Text style={styles.buttonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff", 
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    backgroundColor: theme.colors.info, 
    borderBottomWidth: 1,
    borderBottomColor: "#ffffff",
    marginTop:40,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
  },
  messagesContainer: {
    padding: 10,
  },
  message: {
    maxWidth: "80%",
    padding: 10,
    borderRadius: 12,
    marginBottom: 10,
  },
  userMessage: {
    backgroundColor: "#DCE3F0", 
    alignSelf: "flex-end",
    borderColor: "#DCE3F0", 
  },
  geminiMessage: {
    backgroundColor: "#FFFFFF", 
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#DCE3F0", 
  },
  userMessageText: {
    color: "#000000", 
    fontSize: 15,
  },
  geminiMessageText: {
    color: "#1A3C74", 
    fontSize: 15,
  },
  inputView: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 15,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#ffffff",
  },
  input: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 15,
    marginRight: 10,
    color: "#1A3C74",
    borderWidth: 1,
    borderColor: "#C0D3F5",
  },
  button: {
    backgroundColor: "#4D9BFF",
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
});


export default ChatBotScreen;
