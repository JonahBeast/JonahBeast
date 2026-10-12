# App de Android (Play Store)

La app de Play Store (`com.jonahbeast.twa`) es una TWA: abre jonahbeast.com a
pantalla completa. Se genera con Bubblewrap a partir de `twa-manifest.json`.

- Versión actual: 1.1.1 (versionCode 11), con el cobro de Google Play
  activado (`features.playBilling`) y minSdk 23.
- La llave de firma (`signing.keystore`) y sus contraseñas
  (`signing-key-info.txt`) NO van en GitHub: están en el Google Drive de
  jonahbeastcorp@gmail.com, carpeta "APP JONAHBEAST FUEL".
- Para una versión nueva: subir `appVersionCode` y `appVersionName`,
  regenerar el proyecto con Bubblewrap, compilar `bundleRelease` y firmar el
  .aab con la llave.
- Bubblewrap reciente pone `androidbrowserhelper:2.7.4`, que pide minSdk 24.
  Para no dejar fuera a Android 6, en `app/build.gradle` se fija
  `androidbrowserhelper:2.6.2` antes de compilar (`./gradlew bundleRelease`)
  y luego se firma el .aab con `jarsigner` (alias `my-key-alias`).
