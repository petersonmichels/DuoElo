import { useVideoPlayer, VideoView } from "expo-video";
import React, { useEffect } from "react";
import { StatusBar, StyleSheet, View } from "react-native";

interface AppSplashScreenProps {
  onAnimationFinish?: () => void;
}

const introVideo = require("../assets/intro_video.mp4");

export const AppSplashScreen: React.FC<AppSplashScreenProps> = ({
  onAnimationFinish,
}) => {
  const player = useVideoPlayer(introVideo, (player) => {
    player.loop = false;
    player.play();
  });

  useEffect(() => {
    const subscription = player.addListener("playToEnd", () => {
      if (onAnimationFinish) {
        onAnimationFinish();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [player, onAnimationFinish]);

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <VideoView
        player={player}
        style={styles.video}
        contentFit="contain"
        nativeControls={false}
      />
    </View>
  );
};

export default AppSplashScreen;

const styles = StyleSheet.create({
  container: {
      ...StyleSheet.absoluteFill,    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999999,
  },
  video: {
    width: "100%",
    height: "100%",
  },
});