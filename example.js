import React, { useState, useEffect, useRef } from "react";
import { View, Text, Button, Alert, Animated, StyleSheet, FlatList, TouchableOpacity } from "react-native";
import { Audio } from "expo-av";

const BlowGameScreen = () => {
  const [isListening, setIsListening] = useState(false);
  const [progress, setProgress] = useState(0);
  const [timeProgress, setTimeProgress] = useState(0);
  const [recordings, setRecordings] = useState([]);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const timeProgressAnim = useRef(new Animated.Value(0)).current;
  const recordingRef = useRef(null);
  const blowThreshold = 5000; // Adjust based on testing
  const progressIncrease = 10; // How much progress increases per detected blow
  const maxTime = 5000; // 5 seconds

  useEffect(() => {
    requestMicrophonePermission();
  }, []);

  const requestMicrophonePermission = async () => {
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Microphone access is needed to detect blowing.");
    }
  };

  const startListening = async () => {
    try {
      setIsListening(true);
      setProgress(0);
      setTimeProgress(0);
      Animated.timing(progressAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: false,
      }).start();
      Animated.timing(timeProgressAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: false,
      }).start();

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      recordingRef.current = new Audio.Recording();
      await recordingRef.current.prepareToRecordAsync(Audio.RecordingOptionsPresets.LOW_QUALITY);
      await recordingRef.current.startAsync();

      analyzeBlow();
      startTimer();
    } catch (error) {
      console.error("Error starting recording:", error);
    }
  };

  const stopListening = async () => {
    setIsListening(false);
    if (recordingRef.current) {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      saveRecording(uri);
      recordingRef.current = null;
    }
    Alert.alert("Time Up!", "The recording has stopped automatically after 5 seconds.");
  };

  const analyzeBlow = async () => {
    const interval = setInterval(async () => {
      if (!isListening) {
        clearInterval(interval);
        return;
      }

      const uri = recordingRef.current.getURI();
      if (!uri) return;

      const response = await fetch(uri);
      const audioSize = response.headers.get("content-length");

      console.log("Audio Size (Loudness):", audioSize);

      if (audioSize > blowThreshold) {
        increaseProgress();
      }
    }, 500); // Check every 500ms
  };

  const startTimer = () => {
    const interval = setInterval(() => {
      setTimeProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          stopListening();
          return 100;
        }
        const newTimeProgress = prev + 20;
        Animated.timing(timeProgressAnim, {
          toValue: newTimeProgress,
          duration: 500,
          useNativeDriver: false,
        }).start();
        return newTimeProgress;
      });
    }, maxTime / 5); // Divide maxTime into equal parts
  };

  const increaseProgress = () => {
    if (progress < 100) {
      const newProgress = progress + progressIncrease;
      setProgress(newProgress > 100 ? 100 : newProgress);

      Animated.timing(progressAnim, {
        toValue: newProgress > 100 ? 100 : newProgress,
        duration: 500,
        useNativeDriver: false,
      }).start();

      if (newProgress >= 100) {
        stopListening();
        Alert.alert("Task Completed!", "You have successfully completed the challenge!");
      }
    }
  };

  const saveRecording = async (uri) => {
    if (uri) {
      setRecordings([...recordings, { uri }]);
    }
  };

  const playRecording = async (uri) => {
    const { sound } = await Audio.Sound.createAsync({ uri });
    await sound.playAsync();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Blow into the mic.</Text>

      {/* Blow Detection Progress Bar */}
      <Text style={styles.progressLabel}>Blow Detection Progress:</Text>
      <View style={styles.progressBarContainer}>
        <Animated.View
          style={[
            styles.progressBar,
            {
              width: progressAnim.interpolate({
                inputRange: [0, 100],
                outputRange: ["0%", "100%"],
              }),
            },
          ]}
        />
      </View>

      {/* Timer Progress Bar */}
      <Text style={styles.progressLabel}>Time Remaining (5 sec max):</Text>
      <View style={styles.progressBarContainer}>
        <Animated.View
          style={[
            styles.timeProgressBar,
            {
              width: timeProgressAnim.interpolate({
                inputRange: [0, 100],
                outputRange: ["0%", "100%"],
              }),
            },
          ]}
        />
      </View>

      <Button title={isListening ? "Listening..." : "Start Listening"} onPress={startListening} disabled={isListening} />

      {/* Recorded Audios List */}
      <Text style={styles.recordingsHeader}>Recorded Sounds:</Text>
      <FlatList
        data={recordings}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.recordingItem} onPress={() => playRecording(item.uri)}>
            <Text style={styles.recordingText}>🎵 Play Recording</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  progressLabel: {
    fontSize: 16,
    marginTop: 10,
  },
  progressBarContainer: {
    width: "80%",
    height: 20,
    backgroundColor: "#ddd",
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 20,
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#3498db",
  },
  timeProgressBar: {
    height: "100%",
    backgroundColor: "#e74c3c",
  },
  recordingsHeader: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 20,
  },
  recordingItem: {
    backgroundColor: "#ddd",
    padding: 10,
    borderRadius: 10,
    marginTop: 5,
    width: "80%",
    alignItems: "center",
  },
  recordingText: {
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default BlowGameScreen;