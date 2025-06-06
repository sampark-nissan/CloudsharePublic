"use client"

import { PermissionsAndroid } from 'react-native';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import RNFS from 'react-native-fs';
import Ionicons from 'react-native-vector-icons/Ionicons'
import { useState, useEffect } from "react"
import {
  View,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  Modal,
  KeyboardAvoidingView, 
  Platform, 
} from "react-native"
import { Text, Appbar, Button, ActivityIndicator } from "react-native-paper"
import { SafeAreaView } from "react-native-safe-area-context"
import {
  removeBackground,
  autoEnhance,
  applyArtisticFilter,
  autoCrop,
  generativeFill,
  generativeRemove,
  generativeReplace,
  generativeRecolor,
  generativeContent
} from "../../services/cloudinaryService"
import { StatusBar } from 'react-native'

const EditImageScreen = ({ route, navigation }) => {
  const { file, tool } = route.params
  const [selectedImage, setSelectedImage] = useState(file ? file : null)
  const [processedImage, setProcessedImage] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [selectedEffect, setSelectedEffect] = useState(tool ? tool.id : null)

  const [showPromptInput, setShowPromptInput] = useState(false);
  const [currentAIEffect, setCurrentAIEffect] = useState(null); 
  const [promptText, setPromptText] = useState("");
  const [secondaryPromptText, setSecondaryPromptText] = useState("");

  const effects = [
    {
      id: "background-removal",
      name: "Background Removal",
      icon: "cut-outline",
      processor: removeBackground,
      isGenerativeAI: false,
    },
    {
      id: "auto-enhance",
      name: "Auto Enhance",
      icon: "color-wand-outline",
      processor: autoEnhance,
      isGenerativeAI: false,
    },
    // {
    //   id: "artistic-filter",
    //   name: "Artistic Filter",
    //   icon: "brush-outline",
    //   processor: (publicId) => applyArtisticFilter(publicId, "primavera"), // Example filter
    //   isGenerativeAI: false,
    // },
    
    // Add Generative AI effects
    {
      id: "auto-crop",
      name: "Auto Crop",
      icon: "crop-outline",
      processor: (publicId, promptText, secondaryPromptText ) => autoCrop(publicId, promptText, secondaryPromptText), // Example aspect ratio
      promptLabel: "Enter height(340-940):",
      secondaryPromptLabel: "Enter image width(340-940):",
      isGenerativeAI: true,
    },
    {
        id: "gen-remove",
        name: "AI Remove",
        icon: "remove-circle-outline", 
        processor: generativeRemove,
        isGenerativeAI: true,
        promptLabel: "Object to remove:",
    },
     {
        id: "gen-fill-16-9", 
        name: "AI Fill (16:9)",
        icon: "expand-outline",
        processor: (publicId, prompt) => generativeFill(publicId, "16:9", prompt),
        isGenerativeAI: true,
        promptLabel: "Describe new content (optional):",
        isOptionalPrompt: true, 
    },
     {
        id: "gen-fill-1-1", 
        name: "AI Fill (1:1)",
        icon: "square-outline", 
        processor: (publicId, prompt) => generativeFill(publicId, "1:1", prompt),
        isGenerativeAI: true,
        promptLabel: "Describe new content (optional):",
        isOptionalPrompt: true, 
    },
     {
        id: "gen-replace",
        name: "AI Replace",
        icon: "swap-horizontal-outline", 
        processor: generativeReplace,
        isGenerativeAI: true,
        promptLabel: "Object to replace:",
        secondaryPromptLabel: "Replace with:", 
    },
     {
        id: "gen-recolor",
        name: "AI Recolor",
        icon: "color-fill-outline", 
        processor: generativeRecolor,
        isGenerativeAI: true,
        promptLabel: "Object to recolor:",
        secondaryPromptLabel: "Target color:", 
    },
     {
        id: "gen-extract",
        name: "AI Extract",
        icon: "extract-outline", // Or a suitable icon
        processor: generativeContent,
        isGenerativeAI: true,
        promptLabel: "Object to extract:",
    },
    // Add other AI effects as needed
  ];

  useEffect(() => {
    if (tool && selectedImage) {
      // Find the effect triggered by route params
      const initialEffect = effects.find((e) => e.id === tool.id);
      if (initialEffect) {
         // If it's a generative AI effect, show prompt input
         if (initialEffect.isGenerativeAI) {
            setCurrentAIEffect(initialEffect);
            setShowPromptInput(true);
         } else {
            // Otherwise, process immediately
            processImage(initialEffect.id);
         }
      }
    }
  }, [tool, selectedImage]); // Depend on tool and selectedImage


  // Modified processImage function
  const processImage = async (effectId) => {
    if (!selectedImage) {
      Alert.alert("No Image", "Please select an image first.");
      return;
    }

    const effect = effects.find((e) => e.id === effectId);
    if (!effect) {
       Alert.alert("Error", "Invalid effect selected.");
       return;
    }

    // Get the publicId - your existing logic seems fine
    let publicId = selectedImage.publicId;
    if (!publicId && (selectedImage.url || selectedImage.uri)) {
      console.warn("Image missing publicId, attempting fallback extraction from URL.");
      publicId = extractPublicIdFromUrl(selectedImage.url || selectedImage.uri);
    }

    if (!publicId) {
      Alert.alert("Processing Error", "Could not determine the image Public ID. The file metadata might be incomplete.");
      setProcessing(false);
      return;
    }

    // If it's a generative AI effect, show prompt input and wait
    if (effect.isGenerativeAI) {
        setCurrentAIEffect(effect);
        setPromptText(""); // Clear previous prompt
        setSecondaryPromptText(""); // Clear secondary prompt
        setShowPromptInput(true);
        setSelectedEffect(effectId); // Highlight the selected effect immediately
        return; // Stop here, wait for user prompt input
    }

    // For non-AI effects, proceed directly
    setProcessing(true);
    setSelectedEffect(effectId);

    try {
      const transformedUrl = effect.processor(publicId); // Standard effects only need publicId
      setProcessedImage({ uri: transformedUrl });
    } catch (error) {
      console.error("Error processing image:", error);
      Alert.alert("Processing Failed", "There was an error processing your image. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  // New function to handle applying the AI effect after prompt input
  const applyAIEffect = async () => {
      if (!selectedImage || !currentAIEffect) {
          Alert.alert("Error", "No image or effect selected.");
          return;
      }

      // Get the publicId
      let publicId = selectedImage.publicId;
      if (!publicId && (selectedImage.url || selectedImage.uri)) {
        publicId = extractPublicIdFromUrl(selectedImage.url || selectedImage.uri);
      }

      if (!publicId) {
        Alert.alert("Processing Error", "Could not determine the image Public ID.");
        setShowPromptInput(false); // Hide prompt input
        return;
      }

      // Validate prompt if required
      if (!currentAIEffect.isOptionalPrompt && !promptText.trim()) {
           Alert.alert("Input Required", `${currentAIEffect.promptLabel} cannot be empty.`);
           return;
      }
      if (currentAIEffect.secondaryPromptLabel && !secondaryPromptText.trim()) {
           Alert.alert("Input Required", `${currentAIEffect.secondaryPromptLabel} cannot be empty.`);
           return;
      }


      setProcessing(true);
      setShowPromptInput(false); // Hide prompt input while processing
      // selectedEffect is already set when the effect button was pressed

      console.log(`Prompt: ${promptText}`);
      if (currentAIEffect.secondaryPromptLabel) {
         console.log(`Secondary Prompt: ${secondaryPromptText}`);
      }


      try {
          let transformedUrl;

          if (currentAIEffect.secondaryPromptLabel) {
            transformedUrl = currentAIEffect.processor(publicId, promptText, secondaryPromptText);
          } else {
               transformedUrl = currentAIEffect.processor(publicId, promptText);
          }


          console.log("Generated transformation URL:", transformedUrl);
          setProcessedImage({ uri: transformedUrl });
      } catch (error) {
          console.error("Error applying AI effect:", error);
          Alert.alert("Processing Failed", "There was an error applying the AI effect. Please try again.");
          // Optionally, show the prompt input again on error
          // setShowPromptInput(true);
      } finally {
          setProcessing(false);
          setCurrentAIEffect(null); // Reset current AI effect
          setPromptText(""); // Clear prompts
          setSecondaryPromptText("");
      }
  };

  const requestMediaPermission = async () => {
    if (Platform.OS === 'android') {
      const version = parseInt(Platform.Version, 10);
      let permissions = [];
  
      // For Android 13+ (API level 33 and above)
      if (version >= 33) {
        permissions = [
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
        ];
      } else {
        // For Android 10-12 (API levels 29-32)
        permissions = [PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE];
      }
  
      const granted = await PermissionsAndroid.requestMultiple(permissions);
      return Object.values(granted).every(result => result === PermissionsAndroid.RESULTS.GRANTED);
    }
    return true;  // For iOS or other platforms
  };
  
  // Save image function
  const saveImage = async () => {
    if (!processedImage?.uri) return;
  
    try {
      // Request permissions before proceeding
      const hasPermission = await requestMediaPermission();
      if (!hasPermission) {
        Alert.alert('Permission Denied', 'Cannot save image without permission.');
        return;
      }
  
      // Proceed with saving the image after permissions are granted
      const imageUrl = processedImage.uri;
      const fileName = `cloudshare_${Date.now()}.jpg`;
      const downloadDest = `${RNFS.CachesDirectoryPath}/${fileName}`;
  
      const res = await RNFS.downloadFile({
        fromUrl: imageUrl,
        toFile: downloadDest,
      }).promise;
  
      await CameraRoll.save(downloadDest, { type: 'photo' });
      Alert.alert('Success', 'Image saved to Storage!');
    } catch (error) {
      console.error('Save image error:', error);
      Alert.alert('Error', 'Failed to save image.');
    }
  };

  const cancelAIEffect = () => {
      setShowPromptInput(false);
      setPromptText("");
      setSecondaryPromptText("");
      setCurrentAIEffect(null);
      // Reset selected effect if no image is processed yet, or revert to the last processed image effect
      if (!processedImage) {
         setSelectedEffect(null);
      } else {
         // If there was a processed image before showing the AI prompt,
         // you might want to revert the selectedEffect state.
         // This requires tracking the effect of the *currently displayed* processed image.
         // For simplicity, we'll just keep the AI effect button highlighted for now.
         // A more robust solution might track processed image state more thoroughly.
      }
  };


  // Your existing extractPublicIdFromUrl function
  const extractPublicIdFromUrl = (url) => {
    try {
      const urlParts = url.split("/upload/")[1];
      if (!urlParts) return null;
      const publicId = urlParts.split("/").slice(1).join("/").replace(/\.[^/.]+$/, "");
      return publicId;
    } catch (error) {
      console.error("Error extracting publicId:", error);
      return null;
    }
  };


  return (
    <>
      <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />
      <SafeAreaView style={styles.container} edges={["top"]}>
        <Appbar.Header style={{ backgroundColor: "#ffffff", height: 35, elevation: 0 }}>
          <Appbar.BackAction onPress={() => navigation.goBack()} />
          <Appbar.Content title="Edit Image" titleStyle={{ textAlignVertical: "center" }} />
        </Appbar.Header>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
          <View style={styles.imageContainers}>
            <View style={styles.imageContainer}>
              <Text style={styles.imageTitle}>Original</Text>
              <View style={styles.imagePlaceholder}>
                {selectedImage ? (
                  <Image source={{ uri: selectedImage.url || selectedImage.uri }} style={styles.image} />
                ) : (
                  <View style={styles.placeholderContent}>
                    <Ionicons name="image-outline" size={48} color="#d1d5db" />
                    <Text style={styles.placeholderText}>No image selected</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.imageContainer}>
              <Text style={styles.imageTitle}>Processed</Text>
              <View style={styles.imagePlaceholder}>
                {processing ? (
                  <View style={styles.placeholderContent}>
                    <ActivityIndicator size="large" color="#7c3aed" />
                    <Text style={styles.processingText}>Processing image...</Text>
                  </View>
                ) : processedImage ? (
                  <Image source={{ uri: processedImage.url || processedImage.uri }} style={styles.image} />
                ) : (
                  <View style={styles.placeholderContent}>
                    <Ionicons name="sparkles-outline" size={48} color="#d1d5db" />
                    <Text style={styles.placeholderText}>{selectedImage ? "Apply an effect" : "No image selected"}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

           {/* Prompt Input Modal/View */}
           {showPromptInput && currentAIEffect && (
               <Modal
                   animationType="slide"
                   transparent={true}
                   visible={showPromptInput}
                   onRequestClose={cancelAIEffect}
               >
                   <KeyboardAvoidingView
                       behavior={Platform.OS === "ios" ? "padding" : "height"}
                       style={styles.modalBackground}
                   >
                       <View style={styles.promptInputContainer}>
                           <Text style={styles.promptTitle}>{currentAIEffect.name}</Text>
                           <Text style={styles.promptLabel}>{currentAIEffect.promptLabel}</Text>
                           <TextInput
                               style={styles.promptInput}
                               onChangeText={setPromptText}
                               value={promptText}
                               placeholder="Enter text prompt..."
                               multiline
                           />
                           {currentAIEffect.secondaryPromptLabel && (
                               <>
                                   <Text style={styles.promptLabel}>{currentAIEffect.secondaryPromptLabel}</Text>
                                   <TextInput
                                       style={styles.promptInput}
                                       onChangeText={setSecondaryPromptText}
                                       value={secondaryPromptText}
                                       placeholder="Enter secondary prompt..."
                                       multiline
                                   />
                               </>
                           )}


                           <View style={styles.promptButtons}>
                               <Button mode="outlined" onPress={cancelAIEffect} style={styles.promptButton}>
                                   Cancel
                               </Button>
                               <Button
                                   mode="contained"
                                   onPress={applyAIEffect}
                                   disabled={processing || (!currentAIEffect.isOptionalPrompt && !promptText.trim()) || (currentAIEffect.secondaryPromptLabel && !secondaryPromptText.trim())}
                                   loading={processing}
                                   style={styles.promptButton}
                               >
                                   Apply AI Effect
                               </Button>
                           </View>
                       </View>
                   </KeyboardAvoidingView>
               </Modal>
           )}


          <View style={styles.effectsContainer}>
            <Text style={styles.sectionTitle}>Effects</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.effectsScroll}>
              {effects.map((effect) => (
                <TouchableOpacity
                  key={effect.id}
                  style={[styles.effectButton, selectedEffect === effect.id && styles.selectedEffectButton]}
                  onPress={() => processImage(effect.id)} // This now might show the prompt input
                  disabled={processing || !selectedImage || showPromptInput} // Disable if currently processing or showing prompt
                >
                  <View
                    style={[
                      styles.effectIconContainer,
                      selectedEffect === effect.id && styles.selectedEffectIconContainer,
                    ]}
                  >
                    {/* Use different icon colors/styles if generative AI */}
                    <Ionicons
                       name={effect.icon}
                       size={24}
                       color={
                           selectedEffect === effect.id
                               ? "#fff" // White for selected
                               : effect.isGenerativeAI
                                    ? "#ff9800" // Example: Orange for AI effects
                                    : "#7c3aed" // Example: Purple for standard effects
                       }
                     />
                  </View>
                  <Text
                    style={[
                      styles.effectButtonText,
                      selectedEffect === effect.id && styles.selectedEffectButtonText,
                       effect.isGenerativeAI && styles.aiEffectButtonText // Apply AI specific text style
                    ]}
                  >
                    {effect.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.actionsContainer}>
            <Button
              mode="contained"
              onPress={saveImage} // Implement your save logic here
              disabled={!processedImage || processing || showPromptInput} // Disable if showing prompt
              loading={processing}
              style={styles.saveButton}
            >
              Download Image
            </Button>
            <Button mode="outlined" onPress={() => navigation.goBack()} style={styles.cancelButton} disabled={showPromptInput}>
              Cancel
            </Button>
          </View>
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
    paddingBottom: 100, // Add padding at the bottom to avoid cutting off content with modal
  },
  imageContainers: {
    flexDirection: "row",
    marginBottom: 24,
  },
  imageContainer: {
    flex: 1,
    marginHorizontal: 4,
  },
  imageTitle: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
    textAlign: "center",
  },
  imagePlaceholder: {
    aspectRatio: 1,
    backgroundColor: "#fff",
    borderRadius: 8,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "contain",
  },
  placeholderContent: {
    alignItems: "center",
    padding: 16,
  },
  placeholderText: {
    marginTop: 8,
    fontSize: 14,
    color: "#9ca3af",
    textAlign: "center",
  },
  processingText: {
    marginTop: 16,
    fontSize: 14,
    color: "#6b7280",
  },
  effectsContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 12,
  },
  effectsScroll: {
    flexDirection: "row",
  },
  effectButton: {
    alignItems: "center",
    marginRight: 16,
    width: 80, // Fixed width for consistent layout
  },
  selectedEffectButton: {
    // Keep the selected style as is
    // opacity: 1, // This line might be redundant if other styles handle selection
  },
  effectIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#f3f0ff", // Default background
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  selectedEffectIconContainer: {
     backgroundColor: "#7c3aed", // Selected background
  },
   // Optional: Add AI specific icon container style if desired
   aiEffectIconContainer: {
       backgroundColor: "#fff3e0", // Example: Lighter orange background for AI
   },
   selectedAiEffectIconContainer: {
       backgroundColor: "#ff9800", // Example: Orange background when selected
   },
  effectButtonText: {
    fontSize: 12,
    color: "#4b5563",
    textAlign: "center",
  },
  selectedEffectButtonText: {
    color: "#7c3aed", // Selected text color
    fontWeight: "500",
  },
  // Optional: Add AI specific text style
  aiEffectButtonText: {
     color: "#ff9800", // Example: Orange text for AI effects
  },
  actionsContainer: {
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

  // Styles for Prompt Input Modal
  modalBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent background
  },
  promptInputContainer: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    elevation: 10, // Shadow for Android
    shadowColor: '#000', // Shadow for iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  promptTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
   promptLabel: {
       fontSize: 14,
       fontWeight: '500',
       marginBottom: 5,
       alignSelf: 'flex-start', // Align label to the left
   },
  promptInput: {
    width: '100%',
    height: 80, // Adjustable height
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 15,
    textAlignVertical: 'top', // Align text to top in multiline
  },
  promptButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  promptButton: {
      flex: 1,
      marginHorizontal: 5, // Add some spacing between buttons
  }
});

export default EditImageScreen;