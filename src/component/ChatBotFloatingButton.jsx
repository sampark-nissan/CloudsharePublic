import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  PanResponder,
  View,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';

const { width, height } = Dimensions.get('window');
const BUTTON_SIZE = 40;

const ChatBotFloatingButton = () => {
  const navigation = useNavigation();

  const initialPos = useRef({
    x: width - BUTTON_SIZE - 10,
    y: height - 200,
  });

  const [position, setPosition] = useState(initialPos.current);

  const pan = useRef(position);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: () => {
        pan.current = { ...position };
      },

      onPanResponderMove: (e, gestureState) => {
        let newX = pan.current.x + gestureState.dx;
        let newY = pan.current.y + gestureState.dy;

        newX = Math.max(0, Math.min(newX, width - BUTTON_SIZE));
        newY = Math.max(0, Math.min(newY, height - BUTTON_SIZE - 100));

        setPosition({ x: newX, y: newY });
        initialPos.current = { x: newX, y: newY }; // 🔥 persist for same-session state
      },

      onPanResponderRelease: () => {
        const snapToX = position.x < width / 2 ? 10 : width - BUTTON_SIZE - 10;
        const finalPos = { x: snapToX, y: position.y };
        setPosition(finalPos);
        pan.current = finalPos;
        initialPos.current = finalPos; // 🔥 persist drag result
      },
    })
  ).current;

  return (
    <View
      style={[styles.floatingContainer, { left: position.x, top: position.y }]}
      {...panResponder.panHandlers}
    >
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => navigation.navigate('ChatBot')}
        activeOpacity={0.7}
      >
        <FontAwesome5 name="robot" size={18} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    zIndex: 999,
  },
  floatingButton: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: '#008AFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
  },
});

export default ChatBotFloatingButton;
