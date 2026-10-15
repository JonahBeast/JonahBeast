import UIKit
import Capacitor
import AuthenticationServices
import CryptoKit
import StoreKit
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
        CAPPluginMethod(name: "productos", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "comprar", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "comprobantes", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restaurar", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "gestionarSuscripcion", returnType: CAPPluginReturnPromise),
    ]

    private var llamadaApple: CAPPluginCall?
    private var nonceApple = ""
    private var sesionWeb: ASWebAuthenticationSession?
    private var escuchaCompras: Task<Void, Never>?

    // Compras que llegan fuera de la pantalla de pago (renovaciones,
    // compras aprobadas después, "Pedir permiso para comprar"): se cierran
    // aquí. El servidor ya las recibe directo de Apple
    // (api/apple/notificaciones.js) y al abrir Planes se vuelven a revisar.
    override public func load() {
        escuchaCompras = Task.detached {
            for await resultado in Transaction.updates {
                if case .verified(let compra) = resultado {
                    await compra.finish()
                }
            }
        }
    }

    deinit {
        escuchaCompras?.cancel()
    }

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

    // MARK: Compras con Apple (Premium)

    // Los planes tal como están en App Store Connect, con el precio y el
    // nombre que muestra Apple en el país del alumno.
    @objc func productos(_ call: CAPPluginCall) {
        let ids = call.getArray("ids", String.self) ?? []
        Task {
            do {
                let lista = try await Product.products(for: ids)
                call.resolve(["productos": lista.map { producto -> [String: Any] in
                    [
                        "id": producto.id,
                        "nombre": producto.displayName,
                        "precio": producto.displayPrice,
                        "valor": NSDecimalNumber(decimal: producto.price).doubleValue,
                        "moneda": producto.priceFormatStyle.currencyCode,
                    ]
                }])
            } catch {
                call.reject(error.localizedDescription, "ERROR")
            }
        }
    }

    // Abre la ventana de pago de Apple. "cuenta" es el id de la cuenta del
    // alumno en Jonah Beast Fuel: Apple lo guarda en la compra y lo devuelve
    // en cada renovación, así el servidor sabe de quién es.
    // Devuelve estado 'ok' (con la compra firmada por Apple), 'cancelado' o
    // 'pendiente' (por ejemplo, espera que un padre la apruebe).
    @objc func comprar(_ call: CAPPluginCall) {
        guard let id = call.getString("id") else {
            call.reject("Falta el plan", "SIN_PLAN")
            return
        }
        let cuenta = call.getString("cuenta").flatMap { UUID(uuidString: $0) }
        Task {
            do {
                guard let producto = try await Product.products(for: [id]).first else {
                    call.reject("Apple no encontró este plan", "SIN_PRODUCTO")
                    return
                }
                var opciones: Set<Product.PurchaseOption> = []
                if let cuenta = cuenta { opciones.insert(.appAccountToken(cuenta)) }
                let resultado = try await producto.purchase(options: opciones)
                switch resultado {
                case .success(let verificacion):
                    guard case .verified(let compra) = verificacion else {
                        call.reject("Apple no pudo confirmar la compra", "NO_VERIFICADA")
                        return
                    }
                    await compra.finish()
                    call.resolve(["estado": "ok", "compra": verificacion.jwsRepresentation])
                case .userCancelled:
                    call.resolve(["estado": "cancelado"])
                case .pending:
                    call.resolve(["estado": "pendiente"])
                @unknown default:
                    call.resolve(["estado": "pendiente"])
                }
            } catch {
                call.reject(error.localizedDescription, "ERROR")
            }
        }
    }

    // Las suscripciones vigentes de este iPhone, firmadas por Apple, para
    // que el servidor active lo que falte.
    @objc func comprobantes(_ call: CAPPluginCall) {
        Task {
            call.resolve(["compras": await Self.comprasVigentes()])
        }
    }

    // "Restaurar compras": le pide a Apple las compras de este Apple ID
    // (puede pedir la contraseña) y las devuelve como comprobantes.
    @objc func restaurar(_ call: CAPPluginCall) {
        Task {
            do {
                try await AppStore.sync()
            } catch StoreKitError.userCancelled {
                call.resolve(["estado": "cancelado", "compras": []])
                return
            } catch {
                // Si no se pudo sincronizar, igual se mandan las que ya conoce.
            }
            call.resolve(["estado": "ok", "compras": await Self.comprasVigentes()])
        }
    }

    // Abre la pantalla de Apple para cambiar de plan o cancelar.
    @objc func gestionarSuscripcion(_ call: CAPPluginCall) {
        Task { @MainActor in
            guard let escena = self.bridge?.webView?.window?.windowScene else {
                call.reject("Sin pantalla", "ERROR")
                return
            }
            do {
                try await AppStore.showManageSubscriptions(in: escena)
                call.resolve()
            } catch {
                call.reject(error.localizedDescription, "ERROR")
            }
        }
    }

    static func comprasVigentes() async -> [String] {
        var compras: [String] = []
        for await resultado in Transaction.currentEntitlements {
            if case .verified = resultado {
                compras.append(resultado.jwsRepresentation)
            }
        }
        return compras
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
