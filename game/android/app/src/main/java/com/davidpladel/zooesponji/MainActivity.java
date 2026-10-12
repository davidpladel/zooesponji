package com.davidpladel.zooesponji;

import android.app.Activity;
import android.app.Application;
import android.os.Bundle;
import android.view.Window;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        hideSystemBars();
        getApplication().registerActivityLifecycleCallbacks(new AdBarsHider());
    }

    /** Android restaura las barras al volver a la app o al cerrar un diálogo: se esconden otra vez. */
    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemBars();
    }

    /**
     * Modo inmersivo: sin barra de estado ni de navegación mientras se juega, para no tocarlas
     * sin querer al andar. Reaparecen un momento al deslizar desde el borde.
     */
    private void hideSystemBars() {
        hideSystemBars(getWindow());
    }

    private static void hideSystemBars(Window window) {
        WindowCompat.setDecorFitsSystemWindows(window, false);
        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, window.getDecorView());
        controller.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        controller.hide(WindowInsetsCompat.Type.systemBars());
    }

    /**
     * El anuncio es una pantalla de Google, no del juego, y no hereda el modo inmersivo: sin esto la barra
     * de navegación sale encima y tapa su botón de cerrar.
     */
    private static final class AdBarsHider implements Application.ActivityLifecycleCallbacks {
        @Override
        public void onActivityResumed(Activity activity) {
            if ("com.google.android.gms.ads.AdActivity".equals(activity.getClass().getName())) hideSystemBars(activity.getWindow());
        }

        @Override public void onActivityCreated(Activity activity, Bundle state) {}
        @Override public void onActivityStarted(Activity activity) {}
        @Override public void onActivityPaused(Activity activity) {}
        @Override public void onActivityStopped(Activity activity) {}
        @Override public void onActivitySaveInstanceState(Activity activity, Bundle state) {}
        @Override public void onActivityDestroyed(Activity activity) {}
    }
}
