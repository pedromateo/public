# Keep CastOptionsProvider referenced in AndroidManifest.xml
-keep class com.iptvisor.app.player.CastOptionsProvider { *; }

# Room
-keep class * extends androidx.room.RoomDatabase
-keep @androidx.room.Entity class *
-dontwarn androidx.room.paging.**

# Gson
-keepattributes Signature
-keepattributes *Annotation*
-keep class com.google.gson.** { *; }
-keep class com.iptvisor.app.data.remote.** { *; }
-keep class com.iptvisor.app.data.model.** { *; }

# OkHttp
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn javax.annotation.**

# Media3 / Cast
-keep class androidx.media3.cast.** { *; }
-keep class com.google.android.gms.cast.framework.** { *; }
