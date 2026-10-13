import UIKit
import Capacitor
import AuthenticationServices
import CryptoKit
import UserNotifications

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = JBViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}

// La pantalla de la app (la web jonahbeast.com) con el puente propio de
// Jonah Beast Fuel: la web lo usa como window.Capacitor.registerPlugin('JBNativo').
class JBViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(JBNativoPlugin())
        JBAvisos.shared.pantalla = self
    }

    override open func viewDidLoad() {
        super.viewDidLoad()
        // La app se abrió tocando un aviso: va directo a su pantalla.
        if let url = JBAvisos.shared.urlPendiente {
            JBAvisos.shared.urlPendiente = nil
            abrir(url)
        }
    }

    func abrir(_ url: URL) {
        bridge?.webView?.load(URLRequest(url: url))
    }
}

// Avisos de la app (recordatorios de Beast, racha, pesaje…). Apple da un
// número del iPhone (token); la web lo guarda en push_subs y el servidor
// manda los avisos por Apple (api/_lib/enviar-aviso.js). Al tocar un
// aviso se abre la pantalla que trae (url), solo dentro de jonahbeast.com.
final class JBAvisos: NSObject, UNUserNotificationCenterDelegate {
    static let shared = JBAvisos()
    weak var pantalla: JBViewController?
    var urlPendiente: URL?
    private var esperando: [(String?, String?) -> Void] = []

    func pedirToken(_ listo: @escaping (String?, String?) -> Void) {
        DispatchQueue.main.async {
            self.esperando.append(listo)
            UIApplication.shared.registerForRemoteNotifications()
            DispatchQueue.main.asyncAfter(deadline: .now() + 20) {
                self.terminar(nil, "Apple no respondió")
            }
        }
    }

    func terminar(_ token: String?, _ error: String?) {
        DispatchQueue.main.async {
            let lista = self.esperando
            self.esperando = []
            lista.forEach { $0(token, error) }
        }
    }

    // Con la app abierta, el aviso también se muestra arriba.
    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification,
                                withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([.banner, .list, .sound])
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse,
                                withCompletionHandler completionHandler: @escaping () -> Void) {
        let ruta = response.notification.request.content.userInfo["url"] as? String ?? "/"
        if let base = URL(string: "https://jonahbeast.com"),
           let url = URL(string: ruta, relativeTo: base)?.absoluteURL,
           url.host == "jonahbeast.com" {
            DispatchQueue.main.async {
                if let pantalla = self.pantalla, pantalla.bridge?.webView != nil {
                    pantalla.abrir(url)
                } else {
                    self.urlPendiente = url
                }
            }
        }
        completionHandler()
    }
}

// Lo que la web no puede hacer sola dentro de la app de iPhone:
// - iniciarConApple: "Continuar con Apple" (Apple lo exige porque hay
//   "Continuar con Google"). Devuelve el token que Supabase verifica.
// - abrirWeb: abre el ingreso de Google en la hoja segura de Apple
//   (Google no deja entrar dentro de la app) y devuelve la dirección de
//   vuelta (com.jonahbeast.app://auth#...) con la sesión.
@objc(JBNativoPlugin)
public class JBNativoPlugin: CAPPlugin, CAPBridgedPlugin, ASAuthorizationControllerDelegate,
    ASAuthorizationControllerPresentationContextProviding, ASWebAuthenticationPresentationContextProviding {
    public let identifier = "JBNativoPlugin"
    public let jsName = "JBNativo"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "iniciarConApple", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "abrirWeb", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "estadoAvisos", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "activarAvisos", returnType: CAPPluginReturnPromise),
    ]

    private var llamadaApple: CAPPluginCall?
    private var nonceApple = ""
    private var sesionWeb: ASWebAuthenticationSession?

    private var ventana: ASPresentationAnchor {
        bridge?.webView?.window ?? UIApplication.shared.connectedScenes
            .compactMap { ($0 as? UIWindowScene)?.windows.first }.first ?? UIWindow()
    }

    // MARK: Continuar con Apple

    @objc func iniciarConApple(_ call: CAPPluginCall) {
        nonceApple = Self.nonceAleatorio()
        llamadaApple = call
        let pedido = ASAuthorizationAppleIDProvider().createRequest()
        pedido.requestedScopes = [.fullName, .email]
        pedido.nonce = Self.sha256(nonceApple)
        DispatchQueue.main.async {
            let controlador = ASAuthorizationController(authorizationRequests: [pedido])
            controlador.delegate = self
            controlador.presentationContextProvider = self
            controlador.performRequests()
        }
    }

    public func authorizationController(controller: ASAuthorizationController,
                                        didCompleteWithAuthorization authorization: ASAuthorization) {
        guard let call = llamadaApple else { return }
        llamadaApple = nil
        guard let credencial = authorization.credential as? ASAuthorizationAppleIDCredential,
              let datos = credencial.identityToken,
              let token = String(data: datos, encoding: .utf8) else {
            call.reject("Apple no devolvió el token", "SIN_TOKEN")
            return
        }
        call.resolve([
            "identityToken": token,
            "nonce": nonceApple,
            "givenName": credencial.fullName?.givenName ?? "",
            "familyName": credencial.fullName?.familyName ?? "",
            "email": credencial.email ?? "",
        ])
    }

    public func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        guard let call = llamadaApple else { return }
        llamadaApple = nil
        if let error = error as? ASAuthorizationError, error.code == .canceled {
            call.reject("Cancelado", "CANCELADO")
        } else {
            call.reject(error.localizedDescription, "ERROR")
        }
    }

    public func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        ventana
    }

    // MARK: Ingreso web (Google)

    @objc func abrirWeb(_ call: CAPPluginCall) {
        guard let texto = call.getString("url"), let url = URL(string: texto) else {
            call.reject("Falta la dirección", "SIN_URL")
            return
        }
        let esquema = call.getString("esquema") ?? "com.jonahbeast.app"
        DispatchQueue.main.async {
            let sesion = ASWebAuthenticationSession(url: url, callbackURLScheme: esquema) { [weak self] vuelta, error in
                self?.sesionWeb = nil
                if let vuelta = vuelta {
                    call.resolve(["url": vuelta.absoluteString])
                } else if let error = error as? ASWebAuthenticationSessionError, error.code == .canceledLogin {
                    call.reject("Cancelado", "CANCELADO")
                } else {
                    call.reject(error?.localizedDescription ?? "No se pudo entrar", "ERROR")
                }
            }
            sesion.presentationContextProvider = self
            self.sesionWeb = sesion
            if !sesion.start() {
                self.sesionWeb = nil
                call.reject("No se pudo abrir", "ERROR")
            }
        }
    }

    public func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        ventana
    }

    // MARK: Avisos

    // 'granted', 'denied' o 'notDetermined' (aún no se le preguntó).
    @objc func estadoAvisos(_ call: CAPPluginCall) {
        UNUserNotificationCenter.current().getNotificationSettings { ajustes in
            call.resolve(["estado": Self.textoPermiso(ajustes.authorizationStatus)])
        }
    }

    // Pide el permiso (si ya lo dio, no vuelve a preguntar) y devuelve el
    // número del iPhone para mandarle avisos.
    @objc func activarAvisos(_ call: CAPPluginCall) {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { permitido, _ in
            guard permitido else {
                call.resolve(["estado": "denied"])
                return
            }
            JBAvisos.shared.pedirToken { token, error in
                if let token = token {
                    call.resolve(["estado": "granted", "token": token])
                } else {
                    call.reject(error ?? "Sin número del iPhone", "SIN_TOKEN")
                }
            }
        }
    }

    static func textoPermiso(_ estado: UNAuthorizationStatus) -> String {
        switch estado {
        case .authorized, .provisional, .ephemeral: return "granted"
        case .denied: return "denied"
        default: return "notDetermined"
        }
    }

    // MARK: Ayudas

    // Número de un solo uso: Apple firma su huella y Supabase comprueba que
    // el token es de este ingreso y no uno copiado.
    static func nonceAleatorio(_ largo: Int = 32) -> String {
        let letras = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-._")
        var generador = SystemRandomNumberGenerator()
        return String((0..<largo).map { _ in letras.randomElement(using: &generador)! })
    }

    static func sha256(_ texto: String) -> String {
        SHA256.hash(data: Data(texto.utf8)).map { String(format: "%02x", $0) }.joined()
    }
}
