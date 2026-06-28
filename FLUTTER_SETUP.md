# ModularFlow Flutter Mobile App Setup

This guide walks through setting up Flutter apps for iOS and Android with ModularFlow backend integration.

## Prerequisites

- [Flutter SDK](https://flutter.dev/docs/get-started/install) (3.22+)
- Xcode (for iOS development)
- Android Studio (for Android development)
- Stripe CLI (for local testing)

## Project Structure

```
mobile/
├── lib/
│   ├── main.dart
│   ├── config/
│   │   ├── app_config.dart
│   │   └── api_config.dart
│   ├── screens/
│   │   ├── auth/
│   │   │   ├── login_screen.dart
│   │   │   └── onboarding_screen.dart
│   │   ├── home/
│   │   │   └── home_screen.dart
│   │   ├── cv/
│   │   │   ├── submit_job_screen.dart
│   │   │   ├── processing_screen.dart
│   │   │   └── results_screen.dart
│   │   └── account/
│   │       ├── profile_screen.dart
│   │       └── subscription_screen.dart
│   ├── models/
│   │   ├── user.dart
│   │   ├── cv_job.dart
│   │   └── subscription.dart
│   ├── services/
│   │   ├── api_service.dart
│   │   ├── auth_service.dart
│   │   └── payment_service.dart
│   ├── widgets/
│   │   ├── payment_sheet.dart
│   │   └── loading_overlay.dart
│   └── providers/
│       ├── auth_provider.dart
│       └── subscription_provider.dart
├── ios/
│   ├── Runner/
│   └── Podfile
├── android/
│   ├── app/
│   └── build.gradle
├── pubspec.yaml
└── README.md
```

## Setup Steps

### 1. Create Flutter Project

```bash
flutter create modularflow_mobile
cd modularflow_mobile
```

### 2. Update pubspec.yaml

```yaml
name: modularflow_mobile
description: AI-powered CV tailoring mobile app
publish_to: 'none'

version: 1.0.0+1

environment:
  sdk: '>=3.0.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter

  # Clerk Authentication
  clerk_flutter: ^0.15.0

  # HTTP & API
  http: ^1.1.0
  dio: ^5.4.0

  # State Management
  provider: ^6.1.0
  riverpod: ^2.4.0

  # Payments
  flutter_stripe: ^10.0.0

  # UI & Navigation
  go_router: ^13.0.0
  flutter_riverpod: ^2.4.0

  # Data
  sqflite: ^2.3.0+5
  shared_preferences: ^2.2.2
  json_serializable: ^6.7.0

  # PDF Viewing
  pdf: ^3.10.0
  native_pdf_view: ^6.1.0

  # Utilities
  intl: ^0.19.0
  freezed_annotation: ^2.4.1
  uuid: ^4.0.0

  # Analytics
  firebase_core: ^25.0.0
  firebase_analytics: ^10.0.0

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.0
  build_runner: ^2.4.0
  json_serializable: ^6.7.0
  freezed: ^2.4.0
```

### 3. Configure iOS

```bash
cd ios
pod install
cd ..
```

Update `ios/Podfile`:
```ruby
post_install do |installer|
  installer.pods_project.targets.each do |target|
    flutter_additional_ios_build_settings(target)
    target.build_configurations.each do |config|
      config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] ||= [
        '$(inherited)',
        'PERMISSION_PHOTOS=1',
      ]
    end
  end
end
```

### 4. Configure Android

Update `android/app/build.gradle`:
```gradle
dependencies {
    implementation 'com.stripe:stripe-android:20.40.0'
    implementation 'com.google.android.material:material:1.11.0'
}
```

Update `android/app/src/main/AndroidManifest.xml`:
```xml
<manifest ...>
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
    
    <application ...>
        <activity
            android:name=".MainActivity"
            ...
        />
    </application>
</manifest>
```

### 5. Create API Service

Create `lib/services/api_service.dart`:

```dart
import 'package:http/http.dart' as http;
import 'dart:convert';

class ApiService {
  static const String baseUrl = 'https://api.modularflow.com';
  
  final String? authToken;
  
  ApiService({this.authToken});
  
  Map<String, String> get headers => {
    'Content-Type': 'application/json',
    if (authToken != null) 'Authorization': 'Bearer $authToken',
  };
  
  Future<Map<String, dynamic>> submitCV({
    required String jobUrl,
    required String cvText,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/cv/process'),
      headers: headers,
      body: jsonEncode({
        'jobUrl': jobUrl,
        'cvText': cvText,
      }),
    );
    
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to process CV: ${response.body}');
    }
  }
  
  Future<Map<String, dynamic>> getProcessingStatus(String jobId) async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/cv/$jobId/status'),
      headers: headers,
    );
    
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to get status');
    }
  }
  
  Future<String> getDownloadUrl(String jobId, String documentType) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/documents/$jobId/download-url'),
      headers: headers,
      body: jsonEncode({'type': documentType}),
    );
    
    if (response.statusCode == 200) {
      return jsonDecode(response.body)['url'];
    } else {
      throw Exception('Failed to get download URL');
    }
  }
}
```

### 6. Setup Authentication

Create `lib/services/auth_service.dart`:

```dart
import 'package:clerk_flutter/clerk_flutter.dart';

class AuthService {
  Future<void> signInWithOAuth(String strategy) async {
    await Clerk.instance.signInWithOAuth(
      strategy: OAuthStrategy.google,
      redirectUrl: 'modularflow://oauth-callback',
    );
  }
  
  Future<void> signOut() async {
    await Clerk.instance.signOut();
  }
  
  Future<String?> getToken() async {
    return await Clerk.instance.session?.getToken();
  }
  
  bool isSignedIn() {
    return Clerk.instance.user != null;
  }
}
```

### 7. Setup Payments

Create `lib/services/payment_service.dart`:

```dart
import 'package:flutter_stripe/flutter_stripe.dart';

class PaymentService {
  static const String publishableKey = 'pk_live_xxx';
  
  PaymentService() {
    Stripe.publishableKey = publishableKey;
  }
  
  Future<bool> createSubscription({
    required String tier,
    required String clientSecret,
  }) async {
    try {
      await Stripe.instance.initPaymentSheet(
        paymentSheetParameters: SetupPaymentSheetParameters(
          merchantDisplayName: 'ModularFlow',
          clientSecret: clientSecret,
          style: ThemeMode.system,
        ),
      );
      
      await Stripe.instance.presentPaymentSheet();
      return true;
    } catch (e) {
      print('Payment error: $e');
      return false;
    }
  }
}
```

### 8. Build & Deploy

**iOS:**
```bash
flutter build ios --release
# Opens Xcode for final setup and App Store submission
```

**Android:**
```bash
flutter build appbundle --release
# Upload to Google Play Console
```

## App Store Configuration

### iOS App Store

1. Create App ID in Apple Developer
2. Create provisioning profiles
3. Update bundle identifier in `ios/Runner.pbxproj`
4. Create App Store Connect listing
5. Build and upload via Xcode or Fastlane

### Google Play Store

1. Create Firebase project
2. Create app in Google Play Console
3. Generate signing key:
   ```bash
   keytool -genkey -v -keystore ~/key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias key
   ```
4. Create `android/key.properties`:
   ```properties
   storePassword=your_password
   keyPassword=your_password
   keyAlias=key
   storeFile=../key.jks
   ```
5. Update `android/app/build.gradle`
6. Build and upload

## Environment Variables

Create `.env.mobile`:
```
API_URL=https://api.modularflow.com
CLERK_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxx
```

## Testing

```bash
# Run tests
flutter test

# Run on emulator
flutter run -d emulator-5554

# Run on physical device
flutter run
```

## Performance Targets

- **App Size**: < 100MB (iOS), < 150MB (Android)
- **Launch Time**: < 2 seconds
- **Frame Rate**: 60 FPS
- **Memory**: < 200MB on average

## Troubleshooting

### Pod install fails
```bash
cd ios
pod cache clean --all
pod install
```

### Gradle issues
```bash
./gradlew clean
flutter clean
flutter pub get
```

### Stripe integration errors
- Verify publishable key is for production
- Check Stripe webhook configuration
- Ensure package name matches Firebase setup
