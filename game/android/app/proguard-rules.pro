# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Números de línea en los cierres que enseña Play (los traduce con el archivo de desofuscación).
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Capacitor (desde la 8.6.0), AdMob, AndroidX y el SDK de anuncios traen sus propias reglas.
# Una regla nueva aquí solo tras un fallo real: con la clase concreta y el porqué, nunca un paquete entero.
