# App de Android (Play Store)

La app de Play Store (`com.jonahbeast.twa`) es una TWA: abre jonahbeast.com a
pantalla completa. Se genera con Bubblewrap a partir de `twa-manifest.json`.

- Versión actual: 1.1.1 (versionCode 11), con el cobro de Google Play
  activado (`features.playBilling`) y minSdk 24 (Google Play lo exige desde la 1.1.1).
- La llave de firma (`signing.keystore`) y sus contraseñas
  (`signing-key-info.txt`) NO van en GitHub: están en el Google Drive de
  jonahbeastcorp@gmail.com, carpeta "APP JONAHBEAST FUEL".
- Para una versión nueva: subir `appVersionCode` y `appVersionName`,
  regenerar el proyecto con Bubblewrap, compilar `bundleRelease` y firmar el
  .aab con la llave.
- Compilar con `./gradlew bundleRelease` y firmar el .aab con `jarsigner`
  (alias `my-key-alias`).
