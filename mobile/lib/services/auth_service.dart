import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Thrown when the API returns a non-2xx response, carrying the
/// server's message so screens can show it directly.
class ApiException implements Exception {
  final String message;
  ApiException(this.message);
  @override
  String toString() => message;
}

class AuthService {
  // TODO: point this at your Railway-hosted Express API.
  // Use 10.0.2.2 instead of localhost when testing against a local
  // backend from the Android emulator.
  static const String baseUrl = 'http://localhost:3001/api';

  static const _storage = FlutterSecureStorage();
  static const _tokenKey = 'jwt_token';

  Future<void> register({
    required String name,
    required String email,
    required String password,
  }) async {
    final res = await http.post(
      Uri.parse('$baseUrl/auth/register'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'name': name, 'email': email, 'password': password}),
    );
    _throwIfError(res);
  }

  /// Logs in and persists the JWT securely on success.
  Future<void> login({required String email, required String password}) async {
    final res = await http.post(
      Uri.parse('$baseUrl/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'password': password}),
    );
    _throwIfError(res);

    final data = jsonDecode(res.body) as Map<String, dynamic>;
    final token = data['token'] as String?;
    if (token == null) {
      throw ApiException('Login succeeded but no token was returned.');
    }
    await _storage.write(key: _tokenKey, value: token);
  }

  Future<void> logout() async {
    await _storage.delete(key: _tokenKey);
  }

  Future<String?> getToken() => _storage.read(key: _tokenKey);

  Future<bool> isLoggedIn() async => (await getToken()) != null;

  void _throwIfError(http.Response res) {
    if (res.statusCode >= 200 && res.statusCode < 300) return;
    String message = 'Something went wrong (${res.statusCode}).';
    try {
      final body = jsonDecode(res.body) as Map<String, dynamic>;
      if (body['error'] is String) message = body['error'] as String;
    } catch (_) {
      // response wasn't JSON — keep the generic message
    }
    throw ApiException(message);
  }
}
