plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.depthlogistics.scoreboard"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.depthlogistics.scoreboard"
        minSdk = 21          // Android 5.0 — covers virtually every Android TV / TV box
        targetSdk = 34
        versionCode = 1
        versionName = "1.0"

        // The scoreboard web app the TV displays. Change this one line to point
        // the app somewhere else (e.g. a LAN dev server while testing).
        buildConfigField("String", "SCOREBOARD_URL", "\"https://scoreboard.depthintranet.com/\"")
    }

    buildFeatures {
        buildConfig = true
    }

    buildTypes {
        debug {
            isMinifyEnabled = false
        }
        release {
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_1_8
        targetCompatibility = JavaVersion.VERSION_1_8
    }
    kotlinOptions {
        jvmTarget = "1.8"
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
}
