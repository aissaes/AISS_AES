abstract class AuthRepository {
  Future<void> login(String email, String password);
  Future<void> logout();
  bool isLoggedIn();
  Future<String?> getToken();
  String? getUserName();
  Future<void> changePassword(String oldPassword, String newPassword);
  Future<void> forgotPassword(String email);
  Future<void> resetForgottenPassword(String email, String otp, String newPassword);
}
