/**
 * ============================================================
 *  SECURITY GUARD SDK - DEVICE INTEGRITY LAYER
 * ============================================================
 *
 *  Creator / Owner: Eddie Joe Corum Jr
 *  DOB: 07-11-1992
 *
 *  Purpose:
 *  - Detect Jailbreak (iOS)
 *  - Detect Root (Android)
 *  - Detect Emulator / Debugging
 *  - Block execution of sensitive app functions
 *
 *  NOTE:
 *  This is an application-level security layer only.
 *  It does NOT modify or control the operating system.
 * ============================================================
 */

import { Alert } from "react-native";

/**
 * -----------------------------
 * DEVICE SECURITY CHECK ENGINE
 * -----------------------------
 */
export const DeviceSecurityCheck = async () => {
  const fs = require("react-native-fs");
  const DeviceInfo = require("react-native-device-info");

  const result = {
    isJailbroken: false,
    isRooted: false,
    isEmulator: false,
    isDebugging: false,
  };

  /**
   * iOS Jailbreak Indicators
   */
  const iosPaths = [
    "/Applications/Cydia.app",
    "/Library/MobileSubstrate/MobileSubstrate.dylib",
    "/bin/bash",
    "/usr/sbin/sshd",
    "/etc/apt",
  ];

  for (const path of iosPaths) {
    try {
      if (await fs.exists(path)) {
        result.isJailbroken = true;
        break;
      }
    } catch (e) {}
  }

  /**
   * Android Root Indicators
   */
  const androidPaths = [
    "/system/app/Superuser.apk",
    "/system/xbin/su",
    "/system/bin/su",
    "/sbin/su",
    "/data/local/xbin/su",
    "/data/local/bin/su",
  ];

  for (const path of androidPaths) {
    try {
      if (await fs.exists(path)) {
        result.isRooted = true;
        break;
      }
    } catch (e) {}
  }

  /**
   * Emulator Detection
   */
  try {
    const brand = await DeviceInfo.getBrand();
    const model = await DeviceInfo.getModel();

    if (
      model?.toLowerCase().includes("sdk") ||
      model?.toLowerCase().includes("emulator") ||
      brand?.toLowerCase().includes("generic")
    ) {
      result.isEmulator = true;
    }
  } catch (e) {}

  /**
   * Debug Mode Detection
   */
  result.isDebugging = __DEV__ === true;

  return result;
};

/**
 * -----------------------------
 * SECURITY ENFORCEMENT LAYER
 * -----------------------------
 * This is where access is rejected.
 */
export const enforceSecurityLock = async (onFailCallback) => {
  const status = await DeviceSecurityCheck();

  const compromised =
    status.isJailbroken ||
    status.isRooted ||
    status.isEmulator;

  if (compromised) {
    Alert.alert(
      "Security Access Denied",
      "This device failed integrity verification and cannot run this application.",
      [{ text: "Exit" }]
    );

    if (onFailCallback) {
      onFailCallback(status);
    }

    return false;
  }

  return true;
};

/**
 * -----------------------------
 * OPTIONAL: SECURITY LOGGER
 * -----------------------------
 * Send events to backend audit system
 */
export const logSecurityEvent = async (eventType, payload) => {
  try {
    // Replace with your API endpoint
    await fetch("https://your-secure-api.com/security-log", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        eventType,
        payload,
        timestamp: Date.now(),
      }),
    });
  } catch (e) {
    // Fail silently to avoid app crash
  }
};

/**
 * -----------------------------
 * MASTER SECURITY WRAPPER
 * -----------------------------
 * Call this at app startup
 */
export const initializeSecurityGuard = async () => {
  const ok = await enforceSecurityLock((status) => {
    logSecurityEvent("COMPROMISED_DEVICE_BLOCKED", status);
  });

  return ok;
};