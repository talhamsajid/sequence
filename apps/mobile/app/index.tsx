import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, SafeAreaView } from "react-native";
import { useRouter } from "expo-router";
import { colors, spacing, borderRadius } from "../src/constants/theme";

export default function HomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo area */}
        <View style={styles.hero}>
          <Text style={styles.title}>SEQUENCE</Text>
          <Text style={styles.subtitle}>The Strategy Card Game</Text>
        </View>

        {/* Menu */}
        <View style={styles.menu}>
          <Pressable
            style={styles.primaryButton}
            onPress={() => router.push("/local-setup")}
          >
            <Text style={styles.primaryButtonText}>Play Local</Text>
            <Text style={styles.buttonHint}>Pass & play on this device</Text>
          </Pressable>

          <Pressable
            style={[styles.secondaryButton, styles.disabledButton]}
            disabled
          >
            <Text style={[styles.secondaryButtonText, styles.disabledText]}>Play Online</Text>
            <Text style={[styles.buttonHint, styles.disabledText]}>Coming soon</Text>
          </Pressable>
        </View>

        {/* Version */}
        <Text style={styles.version}>v1.0.0</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },
  hero: {
    alignItems: "center",
    marginBottom: spacing.xxl * 2,
  },
  title: {
    color: colors.gold,
    fontSize: 48,
    fontWeight: "900",
    letterSpacing: 8,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "500",
    letterSpacing: 2,
    marginTop: spacing.xs,
    textTransform: "uppercase",
  },
  menu: {
    width: "100%",
    gap: spacing.md,
  },
  primaryButton: {
    backgroundColor: colors.gold,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: "center",
  },
  primaryButtonText: {
    color: colors.background,
    fontSize: 18,
    fontWeight: "800",
  },
  secondaryButton: {
    borderWidth: 1.5,
    borderColor: colors.muted,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: colors.heading,
    fontSize: 18,
    fontWeight: "700",
  },
  disabledButton: {
    opacity: 0.4,
  },
  disabledText: {
    color: colors.muted,
  },
  buttonHint: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  version: {
    color: colors.muted,
    fontSize: 11,
    marginTop: spacing.xxl,
  },
});
