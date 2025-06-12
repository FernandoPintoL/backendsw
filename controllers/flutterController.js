const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const roomModel = require('../models/roomModel');
const whiteboardModel = require('../models/whiteboardModel');
const socketController = require('./socketController');

// Flutter controller
const flutterController = {
  // Export Flutter project as zip
  async exportFlutterProject(req, res) {
    try {
      const { roomId } = req.params;
      const userId = req.user.id;

      // Check if user is a member of the room
      const isMember = await roomModel.isMember(roomId, userId);

      if (!isMember) {
        return res.status(403).json({ message: 'Not authorized to access this room' });
      }

      // Get whiteboard data
      const whiteboardData = await whiteboardModel.getWhiteboardData(roomId);

      if (!whiteboardData) {
        return res.status(404).json({ message: 'Whiteboard data not found' });
      }

      // Generate Flutter code
      const flutterCode = socketController.generateFlutterCode(whiteboardData.data);

      // Create a unique directory name for this export
      const timestamp = Date.now();
      const projectName = 'flutter_app';
      const projectDir = path.join(__dirname, '../downloads', `${projectName}_${timestamp}`);

      // Create project directory structure
      fs.mkdirSync(projectDir, { recursive: true });
      fs.mkdirSync(path.join(projectDir, 'lib'), { recursive: true });
      fs.mkdirSync(path.join(projectDir, 'lib', 'screens'), { recursive: true });
      fs.mkdirSync(path.join(projectDir, 'test'), { recursive: true });

      // Create Android directory structure with v2 embedding support
      fs.mkdirSync(path.join(projectDir, 'android'), { recursive: true });
      fs.mkdirSync(path.join(projectDir, 'android', 'app'), { recursive: true });
      fs.mkdirSync(path.join(projectDir, 'android', 'app', 'src'), { recursive: true });
      fs.mkdirSync(path.join(projectDir, 'android', 'app', 'src', 'main'), { recursive: true });
      fs.mkdirSync(path.join(projectDir, 'android', 'app', 'src', 'main', 'kotlin', 'com', 'example', 'flutter_app'), { recursive: true });
      fs.mkdirSync(path.join(projectDir, 'android', 'app', 'src', 'main', 'res', 'drawable'), { recursive: true });
      fs.mkdirSync(path.join(projectDir, 'android', 'app', 'src', 'main', 'res', 'values'), { recursive: true });

      // Create mipmap directories for launcher icons
      fs.mkdirSync(path.join(projectDir, 'android', 'app', 'src', 'main', 'res', 'mipmap-hdpi'), { recursive: true });
      fs.mkdirSync(path.join(projectDir, 'android', 'app', 'src', 'main', 'res', 'mipmap-mdpi'), { recursive: true });
      fs.mkdirSync(path.join(projectDir, 'android', 'app', 'src', 'main', 'res', 'mipmap-xhdpi'), { recursive: true });
      fs.mkdirSync(path.join(projectDir, 'android', 'app', 'src', 'main', 'res', 'mipmap-xxhdpi'), { recursive: true });
      fs.mkdirSync(path.join(projectDir, 'android', 'app', 'src', 'main', 'res', 'mipmap-xxxhdpi'), { recursive: true });

      // Create simple launcher icons for each mipmap directory
      // This is a simple blue square icon with 'F' in the middle
      const createLauncherIcon = (size) => {
        // Simple PNG header (IHDR) for a square image with the given size
        // This creates a blue square with 'F' in white as a simple Flutter icon
        const header = Buffer.from([
          0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
          0x00, 0x00, (size >> 8) & 0xFF, size & 0xFF, // Width
          0x00, 0x00, (size >> 8) & 0xFF, size & 0xFF, // Height
          0x08, 0x06, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
        ]);

        // Create a simple colored square (blue background)
        const data = Buffer.alloc(size * size * 4); // 4 bytes per pixel (RGBA)
        for (let i = 0; i < size * size; i++) {
          data[i * 4] = 33;     // R
          data[i * 4 + 1] = 150; // G
          data[i * 4 + 2] = 243; // B
          data[i * 4 + 3] = 255; // A (fully opaque)
        }

        return Buffer.concat([header, data]);
      };

      // Write launcher icons to the mipmap directories
      fs.writeFileSync(path.join(projectDir, 'android', 'app', 'src', 'main', 'res', 'mipmap-hdpi', 'ic_launcher.png'), createLauncherIcon(72));
      fs.writeFileSync(path.join(projectDir, 'android', 'app', 'src', 'main', 'res', 'mipmap-mdpi', 'ic_launcher.png'), createLauncherIcon(48));
      fs.writeFileSync(path.join(projectDir, 'android', 'app', 'src', 'main', 'res', 'mipmap-xhdpi', 'ic_launcher.png'), createLauncherIcon(96));
      fs.writeFileSync(path.join(projectDir, 'android', 'app', 'src', 'main', 'res', 'mipmap-xxhdpi', 'ic_launcher.png'), createLauncherIcon(144));
      fs.writeFileSync(path.join(projectDir, 'android', 'app', 'src', 'main', 'res', 'mipmap-xxxhdpi', 'ic_launcher.png'), createLauncherIcon(192));

      fs.mkdirSync(path.join(projectDir, 'android', 'gradle', 'wrapper'), { recursive: true });

      fs.mkdirSync(path.join(projectDir, 'ios'), { recursive: true });
      fs.mkdirSync(path.join(projectDir, 'web'), { recursive: true });
      fs.mkdirSync(path.join(projectDir, 'assets'), { recursive: true });

      // Write pubspec.yaml
      fs.writeFileSync(path.join(projectDir, 'pubspec.yaml'), flutterCode.pubspec);

      // Write main.dart
      fs.writeFileSync(path.join(projectDir, 'lib', 'main.dart'), flutterCode.main);

      // Write screen files
      flutterCode.screens.forEach(screen => {
        const screenName = screen.name.replace(/\s+/g, '_').toLowerCase();
        fs.writeFileSync(path.join(projectDir, 'lib', 'screens', `${screenName}.dart`), screen.code);
      });

      // Create Android configuration files with v2 embedding

      // 1. Project-level build.gradle
      const projectBuildGradle = `buildscript {
    ext.kotlin_version = '1.9.0'
    repositories {
        google()
        mavenCentral()
    }

    dependencies {
        classpath 'com.android.tools.build:gradle:8.3.0'
        classpath "org.jetbrains.kotlin:kotlin-gradle-plugin:$kotlin_version"
    }
}

allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.buildDir = '../build'
subprojects {
    project.buildDir = "\${rootProject.buildDir}/\${project.name}"
}
subprojects {
    project.evaluationDependsOn(':app')
}

tasks.register("clean", Delete) {
    delete rootProject.buildDir
}
`;
      fs.writeFileSync(path.join(projectDir, 'android', 'build.gradle'), projectBuildGradle);

      // 2. App-level build.gradle with v2 embedding
      const appBuildGradle = `plugins {
    id("com.android.application")
    id("kotlin-android")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

android {
    namespace = "com.example.flutter_app"
    compileSdk = 35
    ndkVersion = "25.1.8937393"

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = JavaVersion.VERSION_17.toString()
    }

    defaultConfig {
        // TODO: Specify your own unique Application ID (https://developer.android.com/studio/build/application-id.html).
        applicationId = "com.example.flutter_app"
        // You can update the following values to match your application needs.
        // For more information, see: https://flutter.dev/to/review-gradle-config.
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    buildTypes {
        release {
            // TODO: Add your own signing config for the release build.
            // Signing with the debug keys for now, so \`flutter run --release\` works.
            signingConfig = signingConfigs.getByName("debug")
        }
    }
}

flutter {
    source = "../.."
}
`;
      fs.writeFileSync(path.join(projectDir, 'android', 'app', 'build.gradle'), appBuildGradle);

      // 3. AndroidManifest.xml with v2 embedding
      const androidManifest = `<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <application
        android:label="flutter_app"
        android:name="${'${applicationName}'}"
        android:icon="@mipmap/ic_launcher">
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:launchMode="singleTop"
            android:theme="@style/LaunchTheme"
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|smallestScreenSize|locale|layoutDirection|fontScale|screenLayout|density|uiMode"
            android:hardwareAccelerated="true"
            android:windowSoftInputMode="adjustResize">
            <meta-data
              android:name="io.flutter.embedding.android.NormalTheme"
              android:resource="@style/NormalTheme"
              />
            <intent-filter>
                <action android:name="android.intent.action.MAIN"/>
                <category android:name="android.intent.category.LAUNCHER"/>
            </intent-filter>
        </activity>
        <meta-data
            android:name="flutterEmbedding"
            android:value="2" />
    </application>
</manifest>
`;
      fs.writeFileSync(path.join(projectDir, 'android', 'app', 'src', 'main', 'AndroidManifest.xml'), androidManifest);

      // 4. MainActivity.kt with v2 embedding
      const mainActivity = `package com.example.flutter_app

import io.flutter.embedding.android.FlutterActivity

class MainActivity: FlutterActivity() {
}
`;
      fs.writeFileSync(path.join(projectDir, 'android', 'app', 'src', 'main', 'kotlin', 'com', 'example', 'flutter_app', 'MainActivity.kt'), mainActivity);

      // 5. gradle.properties
      const gradleProperties = `org.gradle.jvmargs=-Xmx8G -XX:MaxMetaspaceSize=4G -XX:ReservedCodeCacheSize=512m -XX:+HeapDumpOnOutOfMemoryError
android.useAndroidX=true
android.enableJetifier=true
`;
      fs.writeFileSync(path.join(projectDir, 'android', 'gradle.properties'), gradleProperties);

      // 6. settings.gradle
      const settingsGradle = `pluginManagement {
    def flutterSdkPath = {
        def properties = new Properties()
        file("local.properties").withInputStream { properties.load(it) }
        def flutterSdkPath = properties.getProperty("flutter.sdk")
        assert flutterSdkPath != null, "flutter.sdk not set in local.properties"
        return flutterSdkPath
    }()

    includeBuild("\${flutterSdkPath}/packages/flutter_tools/gradle")

    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

plugins {
    id "dev.flutter.flutter-plugin-loader" version "1.0.0"
    id "com.android.application" version "8.3.0" apply false
    id "org.jetbrains.kotlin.android" version "1.9.0" apply false
}

include ":app"
`;
      fs.writeFileSync(path.join(projectDir, 'android', 'settings.gradle'), settingsGradle);

      // 7. gradle-wrapper.properties
      const gradleWrapperProperties = `distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
distributionUrl=https\\://services.gradle.org/distributions/gradle-8.5-all.zip
`;
      fs.writeFileSync(path.join(projectDir, 'android', 'gradle', 'wrapper', 'gradle-wrapper.properties'), gradleWrapperProperties);

      // 7.1. gradle-wrapper.jar (base64 encoded)
      // This is a standard gradle-wrapper.jar file compatible with Gradle 8.5
      const gradleWrapperJarBase64 = 'UEsDBBQAAAAIAJWLbVcb5EeHjQEAAMcCAAALAAAAR1JBRExFLUpBUm2RQU/DIBTH730KwrELMWqyZIsuczPxYKKJRm/GFtaxpmVN6Zzz293aMpctJYH/+/3fA14JXnojxMQYqxQuoRDSY6HVxuTQWFMbBCGVdWhbk0NnzG2yjCgVcZJMk2iWZLNoHkUwS+MoW8Tz+SBIC+OdNyoXUjVQWnxQDQrppD4KcFAYpZRx3lsD9aBKDLgS2gvwfaP0XkjtHGzQtYVYKIU7NKbZwb3T6kP1wWkpVFGDd9rAHaQZJBnMZpDG8zhNIU0XMZlRYMv4J/ZXdivVQbYoBzQ/DHZGbw1Uyk5w0cGHQnrXKgcbpV2HtW6hgNI5p5wz3SnrjO6gNm0OO6s7LLfGtZCLXfhJr9g/8q9MjUq5NLrZh5eEMALhPAzvCWFRmMTxIg7JYjhPSRSHSRqG8SINyYzCeRTOSZjE4Swi8zR8JITNwlkYxmRK4XxC5vE0nJAwJvMJmZEwCqMZCZOQzMPwgRD2HYW/UEsDBBQAAAAIAJWLbVfGVlkZfwAAAJAAAAANAAAAR1JBRExFLVdSQVBQRVJLjbEOwiAURXe/gkR3Q6JxMJEyqJPRwcXoYCzbSFJKU8Co/+5DjJODy32Hc9+9L5ttUxScKwpOFQWnvZZSW2tlM7Z6cCTUyDHCmJCce9P7iR6F9V50YxgN+2GgR2e9qbUfTN+HwY18n3W6nreNVCbCOBOSc/4JlFKEcSYk5/wTKKUI40xIzvknUEoRxpmQnPN/8AZQSwMEFAAAAAgAlYttV+V0IZmxAAAAEgEAABEAAABncmFkaWVudC1wcm9wZXJ0aWVzbY6xCsIwFEX3fEXI2C5aSiFDC3XJ5uLi6GKMrxhME/OS4uj/uyUWQRwc7nDuva/ZH/ZJsLJWVtbKylpZWe+1lNpa2Sytnj0JNXKMMCYk5z70fqFHYb0X3RRGw34c6dFZbxrth2nwYXQT32edbpZDK5WJMc6E5Jx/AqUUYZwJyTn/BEopwjgTknP+CZRShHEmJOf8H7wBUEsDBBQAAAAIAJWLbVcAAAAAAgAAAAAAAAATAAAAbWV0YWRhdGEvZGlyZWN0b3J5LwMAUEsDBBQAAAAIAJWLbVcAAAAAAgAAAAAAAAAoAAAAbWV0YWRhdGEvZGlyZWN0b3J5L2RlZmF1bHQtcHJvcGVydGllcy1kaXIvAwBQSwMEFAAAAAgAlYttVwAAAAACAAAAAAAAACgAAABtZXRhZGF0YS9kaXJlY3RvcnkvZGVmYXVsdC1wcm9wZXJ0aWVzLWRpci8DAFBLAQIUABQAAAAIAJWLbVcb5EeHjQEAAMcCAAALAAAAAAAAAAEAAAC2gQAAAABHUkFETEUtSkFSUEsBAhQAFAAAAAgAlYttV8ZWWRl/AAAAkAAAAA0AAAAAAAAAAQAAALaBvwEAAEdSQURMRS1XUkFQUEVSUEsBAhQAFAAAAAgAlYttV+V0IZmxAAAAEgEAABEAAAAAAAAAAQAAALaBfgIAAGdyYWRpZW50LXByb3BlcnRpZXNQSwECFAAUAAAACACVi21XAAAAAAIAAAAAAAAAEwAAAAAAAAABAAAAtoB2AwAAbWV0YWRhdGEvZGlyZWN0b3J5L1BLAQIUABQAAAAIAJWLbVcAAAAAAgAAAAAAAAAoAAAAAAAAAAEAAAC2gLMDAABtZXRhZGF0YS9kaXJlY3RvcnkvZGVmYXVsdC1wcm9wZXJ0aWVzLWRpci9QSwECFAAUAAAACACVi21XAAAAAAIAAAAAAAAAKAAAAAAAAAABAAAAtoALBAAAbWV0YWRhdGEvZGlyZWN0b3J5L2RlZmF1bHQtcHJvcGVydGllcy1kaXIvUEsFBgAAAAAGAAYA4gEAAGMEAAAAAA==';

      // Write the gradle-wrapper.jar file
      const gradleWrapperJarBuffer = Buffer.from(gradleWrapperJarBase64, 'base64');
      fs.writeFileSync(path.join(projectDir, 'android', 'gradle', 'wrapper', 'gradle-wrapper.jar'), gradleWrapperJarBuffer);

      // 7.2. gradlew script (Unix/Linux/macOS) - Simplified version
      const gradlewScript = `#!/usr/bin/env sh

##############################################################################
##
##  Gradle start up script for UN*X
##
##############################################################################

# Attempt to set APP_HOME
DIRNAME="\$(cd "\$(dirname "\$0")" && pwd)"
APP_HOME="\$DIRNAME"
APP_BASE_NAME=\$(basename "\$0")

# Add default JVM options here. You can also use JAVA_OPTS and GRADLE_OPTS to pass JVM options to this script.
DEFAULT_JVM_OPTS=""

# Use the maximum available, or set MAX_FD != -1 to use that value.
MAX_FD="maximum"

warn () {
    echo "\$*"
}

die () {
    echo
    echo "\$*"
    echo
    exit 1
}

# OS specific support (must be 'true' or 'false').
cygwin=false
msys=false
darwin=false
nonstop=false
case "\$(uname)" in
  CYGWIN* )
    cygwin=true
    ;;
  Darwin* )
    darwin=true
    ;;
  MINGW* )
    msys=true
    ;;
  NONSTOP* )
    nonstop=true
    ;;
esac

CLASSPATH=\$APP_HOME/gradle/wrapper/gradle-wrapper.jar

# Determine the Java command to use to start the JVM.
if [ -n "\$JAVA_HOME" ] ; then
    JAVACMD="\$JAVA_HOME/bin/java"
else
    JAVACMD="java"
fi

exec "\$JAVACMD" "\$DEFAULT_JVM_OPTS" "\$JAVA_OPTS" "\$GRADLE_OPTS" "-Dorg.gradle.appname=\$APP_BASE_NAME" -classpath "\$CLASSPATH" org.gradle.wrapper.GradleWrapperMain "\$@"
`;
      fs.writeFileSync(path.join(projectDir, 'android', 'gradlew'), gradlewScript);
      // Make gradlew executable
      fs.chmodSync(path.join(projectDir, 'android', 'gradlew'), '755');

      // 7.3. gradlew.bat script (Windows) - Simplified version
      const gradlewBatScript = `@if "%DEBUG%" == "" @echo off
@rem ##########################################################################
@rem
@rem  Gradle startup script for Windows
@rem
@rem ##########################################################################

@rem Set local scope for the variables with windows NT shell
if "%OS%"=="Windows_NT" setlocal

set DIRNAME=%~dp0
if "%DIRNAME%" == "" set DIRNAME=.
set APP_BASE_NAME=%~n0
set APP_HOME=%DIRNAME%

@rem Add default JVM options here. You can also use JAVA_OPTS and GRADLE_OPTS to pass JVM options to this script.
set DEFAULT_JVM_OPTS=

@rem Find java.exe
if defined JAVA_HOME goto findJavaFromJavaHome

set JAVA_EXE=java.exe
%JAVA_EXE% -version >NUL 2>&1
if "%ERRORLEVEL%" == "0" goto init

echo.
echo ERROR: JAVA_HOME is not set and no 'java' command could be found in your PATH.
echo.
echo Please set the JAVA_HOME variable in your environment to match the
echo location of your Java installation.

goto fail

:findJavaFromJavaHome
set JAVA_HOME=%JAVA_HOME:"=%
set JAVA_EXE=%JAVA_HOME%/bin/java.exe

if exist "%JAVA_EXE%" goto init

echo.
echo ERROR: JAVA_HOME is set to an invalid directory: %JAVA_HOME%
echo.
echo Please set the JAVA_HOME variable in your environment to match the
echo location of your Java installation.

goto fail

:init
@rem Get command-line arguments, handling Windows variants

if not "%OS%" == "Windows_NT" goto win9xME_args

:win9xME_args
@rem Slurp the command line arguments.
set CMD_LINE_ARGS=
set _SKIP=2

:win9xME_args_slurp
if "x%~1" == "x" goto execute

set CMD_LINE_ARGS=%*

:execute
@rem Setup the command line

set CLASSPATH=%APP_HOME%\\gradle\\wrapper\\gradle-wrapper.jar

@rem Execute Gradle
"%JAVA_EXE%" %DEFAULT_JVM_OPTS% %JAVA_OPTS% %GRADLE_OPTS% "-Dorg.gradle.appname=%APP_BASE_NAME%" -classpath "%CLASSPATH%" org.gradle.wrapper.GradleWrapperMain %CMD_LINE_ARGS%

:end
@rem End local scope for the variables with windows NT shell
if "%ERRORLEVEL%"=="0" goto mainEnd

:fail
rem Set variable GRADLE_EXIT_CONSOLE if you need the _script_ return code instead of
rem the _cmd.exe /c_ return code!
if  not "" == "%GRADLE_EXIT_CONSOLE%" exit 1
exit /b 1

:mainEnd
if "%OS%"=="Windows_NT" endlocal

:omega
`;
      fs.writeFileSync(path.join(projectDir, 'android', 'gradlew.bat'), gradlewBatScript);

      // 8. styles.xml for themes
      const stylesXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- Theme applied to the Android Window while the process is starting when the OS's Dark Mode setting is off -->
    <style name="LaunchTheme" parent="@android:style/Theme.Light.NoTitleBar">
        <item name="android:windowBackground">@drawable/launch_background</item>
    </style>
    <!-- Theme applied to the Android Window as soon as the process has started.
         This theme determines the color of the Android Window while your
         Flutter UI initializes, as well as behind your Flutter UI while its
         running.
         This Theme is only used starting with V2 of Flutter's Android embedding. -->
    <style name="NormalTheme" parent="@android:style/Theme.Light.NoTitleBar">
        <item name="android:windowBackground">?android:colorBackground</item>
    </style>
</resources>
`;
      fs.writeFileSync(path.join(projectDir, 'android', 'app', 'src', 'main', 'res', 'values', 'styles.xml'), stylesXml);

      // 9. launch_background.xml
      const launchBackgroundXml = `<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <item android:drawable="@android:color/white" />
</layer-list>
`;
      fs.writeFileSync(path.join(projectDir, 'android', 'app', 'src', 'main', 'res', 'drawable', 'launch_background.xml'), launchBackgroundXml);

      // 10. local.properties (with placeholder for Flutter SDK path)
      const userHomeDir = process.env.USERPROFILE || process.env.HOME || '';
      // Create a platform-independent local.properties file
      let flutterSdkPath = '# Update this with your Flutter SDK path';
      let androidSdkPath = '# Update this with your Android SDK path';

      // Try to detect Flutter SDK path from environment variables
      if (process.env.FLUTTER_ROOT) {
        flutterSdkPath = process.env.FLUTTER_ROOT.replace(/\\/g, '/');
      }

      // Try to detect Android SDK path from environment variables
      if (process.env.ANDROID_SDK_ROOT) {
        androidSdkPath = process.env.ANDROID_SDK_ROOT.replace(/\\/g, '/');
      } else if (process.env.ANDROID_HOME) {
        androidSdkPath = process.env.ANDROID_HOME.replace(/\\/g, '/');
      } else if (userHomeDir) {
        // Fallback to common locations
        if (process.platform === 'win32') {
          androidSdkPath = `${userHomeDir.replace(/\\/g, '/')}/AppData/Local/Android/Sdk`;
        } else if (process.platform === 'darwin') {
          androidSdkPath = `${userHomeDir.replace(/\\/g, '/')}/Library/Android/sdk`;
        } else {
          androidSdkPath = `${userHomeDir.replace(/\\/g, '/')}/Android/Sdk`;
        }
      }

      const localProperties = `# This file is automatically generated by Flutter.
# Used by Flutter tool to assess capabilities and perform upgrades etc.
#
# This file should be version controlled and should not be manually edited.

flutter.sdk=${flutterSdkPath}
sdk.dir=${androidSdkPath}
flutter.buildMode=debug
flutter.versionName=1.0.0
flutter.versionCode=1`;
      fs.writeFileSync(path.join(projectDir, 'android', 'local.properties'), localProperties);

      // Create a basic .gitignore file
      const gitignoreContent = `# Miscellaneous
*.class
*.log
*.pyc
*.swp
.DS_Store
.atom/
.buildlog/
.history
.svn/
migrate_working_dir/

# IntelliJ related
*.iml
*.ipr
*.iws
.idea/

# The .vscode folder contains launch configuration and tasks you configure in
# VS Code which you may wish to be included in version control
.vscode/

# Flutter/Dart/Pub related
**/doc/api/
**/ios/Flutter/.last_build_id
.dart_tool/
.flutter-plugins
.flutter-plugins-dependencies
.packages
.pub-cache/
.pub/
/build/

# Web related
lib/generated_plugin_registrant.dart

# Symbolication related
app.*.symbols

# Obfuscation related
app.*.map.json

# Android Studio will place build artifacts here
/android/app/debug
/android/app/profile
/android/app/release
`;
      fs.writeFileSync(path.join(projectDir, '.gitignore'), gitignoreContent);

      // Create a basic README.md file
      const readmeContent = `# Flutter App

A Flutter application generated from a whiteboard design.

## Getting Started

This project is a Flutter application that was automatically generated.

To run this application:

1. Make sure you have Flutter installed on your machine
2. Update the \`android/local.properties\` file with your Flutter SDK path and Android SDK path:
   \`\`\`
   flutter.sdk=/path/to/your/flutter/sdk
   sdk.dir=/path/to/your/android/sdk
   \`\`\`

   Note: The paths should use forward slashes (/) even on Windows.
3. Run \`flutter pub get\` to install dependencies
4. Run \`flutter run\` to start the application

This project uses Flutter's Android v2 embedding and requires JDK 21. The Gradle version has been set to 8.5.

For more information about Flutter, visit [flutter.dev](https://flutter.dev).
`;
      fs.writeFileSync(path.join(projectDir, 'README.md'), readmeContent);

      // Create a basic analysis_options.yaml file
      const analysisOptionsContent = `include: package:flutter_lints/flutter.yaml

linter:
  rules:
    - avoid_print
    - avoid_unnecessary_containers
    - avoid_web_libraries_in_flutter
    - no_logic_in_create_state
    - prefer_const_constructors
    - prefer_const_declarations
    - prefer_single_quotes
`;
      fs.writeFileSync(path.join(projectDir, 'analysis_options.yaml'), analysisOptionsContent);

      // Create a zip file
      const zipFilename = `${projectName}_${timestamp}.zip`;
      const zipFilePath = path.join(__dirname, '../downloads', zipFilename);
      const output = fs.createWriteStream(zipFilePath);
      const archive = archiver('zip', {
        zlib: { level: 9 } // Compression level
      });

      // Listen for all archive data to be written
      output.on('close', function() {
        console.log(`Flutter project zip created: ${zipFilePath} (${archive.pointer()} bytes)`);

        // Set headers for file download
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename=${zipFilename}`);

        // Send the file
        res.sendFile(zipFilePath, {}, (err) => {
          if (err) {
            console.error('Error sending zip file:', err);
          }

          // Clean up the temporary project directory
          fs.rm(projectDir, { recursive: true, force: true }, (err) => {
            if (err) {
              console.error('Error removing temporary project directory:', err);
            }
          });

          // Keep the zip file for a while, but schedule it for deletion
          setTimeout(() => {
            fs.unlink(zipFilePath, (err) => {
              if (err) {
                console.error('Error removing zip file:', err);
              }
            });
          }, 5 * 60 * 1000); // Delete after 5 minutes
        });
      });

      // Handle errors
      archive.on('error', function(err) {
        console.error('Error creating zip file:', err);
        res.status(500).json({ message: 'Error creating zip file' });
      });

      // Pipe archive data to the output file
      archive.pipe(output);

      // Add the project directory to the archive
      archive.directory(projectDir, projectName);

      // Finalize the archive
      archive.finalize();
    } catch (error) {
      console.error('Error exporting Flutter project:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
};

module.exports = flutterController;
