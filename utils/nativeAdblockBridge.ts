/**
 * Native Module / TurboModule Scaffolding for brave/adblock-rust
 * Connects adblock-rust C-FFI / JNI on Android and WKContentRuleListStore on iOS.
 */

import { Platform } from 'react-native';

export interface NativeAdblockSpec {
  enableShields(): Promise<void>;
  disableShields(): Promise<void>;
  checkRequest(url: string, sourceUrl: string, resourceType: number): Promise<boolean>;
  compileContentRuleList?(rulesJson: string): Promise<boolean>;
  updateFilterLists(): Promise<{ success: boolean; rulesCount: number }>;
}

/**
 * Android JNI interface definition for adblock-rust (cargo-ndk)
 *
 * package com.daps.browser.adblock;
 *
 * public class AdblockJni {
 *     static {
 *         System.loadLibrary("adblock");
 *     }
 *     public static native boolean initEngine(String serializedState);
 *     public static native boolean checkNetworkRequest(String url, String sourceUrl, int resourceType);
 *     public static native String getCosmeticFilters(String domain);
 *     public static native byte[] serializeEngine();
 * }
 */
export const ANDROID_JNI_SPEC = `
// Android JNI C++ Bridge (adblock_jni.cpp)
#include <jni.h>
#include <string>
#include "adblock.h" // adblock-rust C headers

static Engine* g_engine = nullptr;

extern "C" JNIEXPORT jboolean JNICALL
Java_com_daps_browser_adblock_AdblockJni_checkNetworkRequest(
    JNIEnv* env, jclass clazz, jstring url, jstring sourceUrl, jint resourceType) {
    if (!g_engine) return JNI_FALSE;
    const char* nativeUrl = env->GetStringUTFChars(url, nullptr);
    const char* nativeSource = env->GetStringUTFChars(sourceUrl, nullptr);

    bool blocked = g_engine->check_network_urls(nativeUrl, nativeSource, resourceType);

    env->ReleaseStringUTFChars(url, nativeUrl);
    env->ReleaseStringUTFChars(sourceUrl, nativeSource);
    return blocked ? JNI_TRUE : JNI_FALSE;
}
`;

/**
 * iOS WebKit Content Blocker bridge definition
 * Uses adblock-rust --features content-blocking to compile rules into WKContentRuleListStore
 */
export const IOS_WEBKIT_SPEC = `
// iOS Swift Bridge (DapsContentBlocker.swift)
import WebKit

@objc public class DapsContentBlocker: NSObject {
    @objc public static func applyRules(to webView: WKWebView, rulesJson: String) {
        WKContentRuleListStore.default().compileContentRuleList(
            forIdentifier: "DapsShieldRules",
            encodedContentRuleList: rulesJson
        ) { (ruleList, error) in
            guard let ruleList = ruleList, error == nil else {
                print("Failed to compile rules: \\(String(describing: error))")
                return
            }
            webView.configuration.userContentController.add(ruleList)
        }
    }
}
`;
