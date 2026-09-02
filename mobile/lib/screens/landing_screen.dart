import 'package:flutter/material.dart';
import '../theme.dart';
import 'login_screen.dart';
import 'signup_screen.dart';

class LandingScreen extends StatelessWidget {
  const LandingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Stack(
          children: [
            // Soft layered horizon curves — decorative only, shared across screens.
            const Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              child: AppBackdrop(height: 220),
            ),
            Column(
              children: [
                _Header(),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 30),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        _HeroBadge(),
                        const SizedBox(height: 26),
                        Text(
                          "Tourism students, welcome to your travel companion",
                          textAlign: TextAlign.center,
                          style: AppTextStyles.heading,
                        ),
                        const SizedBox(height: 14),
                        Text(
                          "Plan smarter, explore further, and create trips "
                          "you'll never forget. Your next adventure starts here.",
                          textAlign: TextAlign.center,
                          style: AppTextStyles.subtitle,
                        ),
                        const SizedBox(height: 34),
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            style: AppButtons.primary,
                            onPressed: () => Navigator.push(
                              context,
                              MaterialPageRoute(builder: (_) => const SignupScreen()),
                            ),
                            child: const Text('Sign up'),
                          ),
                        ),
                        const SizedBox(height: 12),
                        SizedBox(
                          width: double.infinity,
                          child: OutlinedButton(
                            style: AppButtons.outline,
                            onPressed: () => Navigator.push(
                              context,
                              MaterialPageRoute(builder: (_) => const LoginScreen()),
                            ),
                            child: const Text('Log in'),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.only(bottom: 26, top: 18),
                  child: Column(
                    children: [
                      Container(width: 36, height: 1.4, color: AppColors.line),
                      const SizedBox(height: 14),
                      TextButton(
                        onPressed: () {
                          // TODO: wire to an About Us screen or dialog.
                        },
                        child: Text(
                          'About us',
                          style: AppTextStyles.label.copyWith(
                            decoration: TextDecoration.underline,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 26, 24, 10),
      child: Row(
        children: [
          Container(
            width: 34,
            height: 34,
            decoration: BoxDecoration(
              color: AppColors.cream2,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AppColors.line),
            ),
            alignment: Alignment.center,
            child: const Text('🧭', style: TextStyle(fontSize: 16)),
          ),
          const SizedBox(width: 10),
          Text.rich(
            TextSpan(
              text: 'Wander',
              style: AppTextStyles.wordmark,
              children: [
                TextSpan(
                  text: 'Wise',
                  style: AppTextStyles.wordmark.copyWith(
                    color: AppColors.brown600,
                    fontWeight: FontWeight.w400,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _HeroBadge extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      width: 84,
      height: 84,
      decoration: BoxDecoration(
        color: AppColors.cream2,
        shape: BoxShape.circle,
        border: Border.all(color: AppColors.line),
      ),
      alignment: Alignment.center,
      child: Icon(Icons.flight, size: 38, color: AppColors.brown900),
    );
  }
}

