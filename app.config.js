module.exports = {
  expo: {
    name: "DuoElo",
    slug: "duelo",
    scheme: "duoelo",
    version: "1.0.1",
    orientation: "portrait",
    icon: "./src/assets/icon.png",
    userInterfaceStyle: "dark",
    
    // 🎨 Ajustes de UI/Design para Android
    androidNavigationBar: {
      barStyle: "light-content",
      backgroundColor: "#0F0F12",
    },
    
    ios: {
      supportsTablet: false,
      usesAppleSignIn: true,
      bundleIdentifier: "lu.barnx.duoelo",
      buildNumber: "13",
      googleServicesFile:
        process.env.GOOGLE_SERVICES_INFO_PLIST || "./GoogleService-Info.plist",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSFaceIDUsageDescription:
          "O DuoElo utiliza o Face ID para desbloquear sua chave mestre e proteger seu Diário do Casal com criptografia de ponta a ponta.",
        NSCameraUsageDescription:
          "Permite capturar fotos de perfil e personalizar o diário do casal.",
        NSPhotoLibraryUsageDescription:
          "Permite selecionar imagens para personalizar o perfil do casal.",
        LSApplicationQueriesSchemes: [
          "whatsapp",
          "mailto",
          "instagram",
          "tiktok",
          "https",
          "http",
        ],
        CFBundleURLTypes: [
          {
            CFBundleURLSchemes: [
              "com.googleusercontent.apps.504286284116-akoj0ufb3q6rrfb2b3gpskbjaatgeqle",
            ],
          },
        ],
      },
    },
    android: {
      versionCode: 13,
      package: "lu.barnx.duoelo",
      googleServicesFile:
        process.env.GOOGLE_SERVICES_JSON || "./google-services.json",
      allowBackup: false,
      statusBar: {
        barStyle: "light-content",
        backgroundColor: "#0F0F12",
        translucent: true,
      },
      adaptiveIcon: {
        foregroundImage: "./src/assets/icon.png",
        backgroundColor: "#0F0F12",
      },
      permissions: [
        "android.permission.USE_BIOMETRIC",
        "android.permission.USE_FINGERPRINT",
        "android.permission.POST_NOTIFICATIONS",
      ],
    },
    web: {
      favicon: "./src/assets/favicon.png",
    },
    plugins: [
      "expo-apple-authentication",
      [
        "expo-notifications",
        {
          icon: "./src/assets/icon.png",
          color: "#0F0F12",
          sounds: [],
        },
      ],
      [
        "expo-local-authentication",
        {
          faceIDPermission:
            "O DuoElo utiliza o Face ID para desbloquear sua chave mestre e proteger seu Diário do Casal.",
        },
      ],
      [
        "expo-splash-screen",
        {
          image: "./src/assets/icon.png",
          resizeMode: "contain",
          backgroundColor: "#0F0F12",
        },
      ],
      [
        "expo-secure-store",
        {
          faceIDPermission:
            "Permite autenticar você em segurança para desbloquear seus dados encriptados.",
        },
      ],
    ],
    extra: {
      eas: {
        projectId: "b6c6d761-02e8-4028-a22d-4bbc774023d6",
      },
    },
    owner: "petersonmichels",
  },
};