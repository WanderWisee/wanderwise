import 'dart:convert';
import 'package:http/http.dart' as http;
import 'auth_service.dart';

class TripException implements Exception {
  final String message;
  TripException(this.message);
  @override
  String toString() => message;
}

class TripService {
  static const String baseUrl = 'http://localhost:3001/api';
  final _authService = AuthService();

  Future<Map<String, String>> _authHeaders() async {
    final token = await _authService.getToken();
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  // GET /api/trips
  Future<List<Map<String, dynamic>>> fetchTrips() async {
    final res = await http.get(
      Uri.parse('$baseUrl/trips'),
      headers: await _authHeaders(),
    );
    _throwIfError(res);
    final decoded = jsonDecode(res.body) as List;
    return decoded.cast<Map<String, dynamic>>();
  }

  // POST /api/trips
  Future<Map<String, dynamic>> createTrip(Map<String, dynamic> tripData) async {
    final res = await http.post(
      Uri.parse('$baseUrl/trips'),
      headers: await _authHeaders(),
      body: jsonEncode(tripData),
    );
    _throwIfError(res);
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  // PUT /api/trips/:id
  Future<Map<String, dynamic>> updateTrip(String tripId, Map<String, dynamic> updates) async {
    final res = await http.put(
      Uri.parse('$baseUrl/trips/$tripId'),
      headers: await _authHeaders(),
      body: jsonEncode(updates),
    );
    _throwIfError(res);
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  // DELETE /api/trips/:id
  Future<void> deleteTrip(String tripId) async {
    final res = await http.delete(
      Uri.parse('$baseUrl/trips/$tripId'),
      headers: await _authHeaders(),
    );
    _throwIfError(res);
  }

  void _throwIfError(http.Response res) {
    if (res.statusCode >= 200 && res.statusCode < 300) return;
    String message = 'Something went wrong (${res.statusCode}).';
    try {
      final body = jsonDecode(res.body) as Map<String, dynamic>;
      if (body['error'] is String) message = body['error'] as String;
    } catch (_) {}
    throw TripException(message);
  }
}