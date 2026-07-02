import Foundation
import Security

/// Stores JSON blobs in the iOS Keychain, mirroring the encrypted-at-rest
/// guarantee that EncryptedSharedPreferences provides on Android.
enum SecureStore {
    static func save(_ data: Data, key: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key
        ]
        SecItemDelete(query as CFDictionary)

        let attributes: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlock
        ]
        SecItemAdd(attributes as CFDictionary, nil)
    }

    static func load(key: String) -> Data? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        guard status == errSecSuccess else { return nil }
        return result as? Data
    }
}

enum PersistedStore<T: Codable> {
    static func load(key: String, default defaultValue: T) -> T {
        guard let data = SecureStore.load(key: key) else { return defaultValue }
        return (try? JSONDecoder().decode(T.self, from: data)) ?? defaultValue
    }

    static func save(_ value: T, key: String) {
        guard let data = try? JSONEncoder().encode(value) else { return }
        SecureStore.save(data, key: key)
    }
}
