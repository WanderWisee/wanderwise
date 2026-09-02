import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Central palette + type scale, matching the WanderWise prototype
/// (cream background, dark brown accents, mint button text).
class AppColors {
  static const cream = Color(0xFFF6F1DC);
  static const cream2 = Color(0xFFEFE8CC);
  static const brown900 = Color(0xFF2E1B0E);
  static const brown800 = Color(0xFF3A2311);
  static const brown600 = Color(0xFF6B4A2C);
  static const mint = Color(0xFF3FA98A);
  static const line = Color(0x242E1B0E); // brown900 @ ~14% alpha
  static const error = Color(0xFFB3261E);

  // The one added complementary accent for the whole app's background
  // enhancement — derived from the existing mint (not a new hue), used
  // only as a very soft wash/glow behind cards, maps, and badges.
  static const mintTint = Color(0x1A3FA98A); // mint @ ~10% alpha
  static const mintTintStrong = Color(0x333FA98A); // mint @ ~20% alpha
}

/// Reusable layered-curve background, same motif as the landing screen,
/// so every screen shares one visual signature. Uses only existing
/// cream tones plus the mintTint accent — never overrides them.
class AppBackdrop extends StatelessWidget {
  final double height;
  final bool withMintGlow;
  const AppBackdrop({super.key, this.height = 220, this.withMintGlow = false});

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: CustomPaint(
        size: Size(double.infinity, height),
        painter: _BackdropPainter(withMintGlow: withMintGlow),
      ),
    );
  }
}

class _BackdropPainter extends CustomPainter {
  final bool withMintGlow;
  _BackdropPainter({required this.withMintGlow});

  @override
  void paint(Canvas canvas, Size size) {
    final back = Paint()..color = AppColors.cream2.withOpacity(0.9);
    final front = Paint()..color = const Color(0xFFE7DEBC).withOpacity(0.7);

    final backPath = Path()
      ..moveTo(0, size.height * 0.4)
      ..cubicTo(size.width * 0.24, size.height * 0.18, size.width * 0.48,
          size.height * 0.63, size.width, size.height * 0.32)
      ..lineTo(size.width, size.height)
      ..lineTo(0, size.height)
      ..close();

    final frontPath = Path()
      ..moveTo(0, size.height * 0.64)
      ..cubicTo(size.width * 0.3, size.height * 0.5, size.width * 0.66,
          size.height * 0.86, size.width, size.height * 0.55)
      ..lineTo(size.width, size.height)
      ..lineTo(0, size.height)
      ..close();

    canvas.drawPath(backPath, back);
    canvas.drawPath(frontPath, front);

    if (withMintGlow) {
      final glow = Paint()
        ..color = AppColors.mintTint
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 40);
      canvas.drawCircle(
        Offset(size.width * 0.78, size.height * 0.22),
        60,
        glow,
      );
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class AppTextStyles {
  static TextStyle heading = GoogleFonts.lora(
    fontSize: 26,
    height: 1.32,
    fontWeight: FontWeight.w600,
    color: AppColors.brown900,
  );

  static TextStyle subtitle = GoogleFonts.lora(
    fontSize: 14.5,
    height: 1.6,
    color: AppColors.brown600,
  );

  static TextStyle body = GoogleFonts.lora(
    fontSize: 15,
    color: AppColors.brown900,
  );

  static TextStyle button = GoogleFonts.lora(
    fontSize: 15.5,
    fontWeight: FontWeight.w600,
  );

  static TextStyle label = GoogleFonts.lora(
    fontSize: 13,
    color: AppColors.brown600,
  );

  static TextStyle wordmark = GoogleFonts.lora(
    fontSize: 19,
    fontWeight: FontWeight.w600,
    color: AppColors.brown900,
  );
}

ThemeData buildAppTheme() {
  return ThemeData(
    scaffoldBackgroundColor: AppColors.cream,
    fontFamily: GoogleFonts.lora().fontFamily,
    colorScheme: ColorScheme.fromSeed(
      seedColor: AppColors.brown900,
      background: AppColors.cream,
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: AppColors.cream2,
      contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: AppColors.line),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: AppColors.line),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: AppColors.brown900, width: 1.4),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: AppColors.error),
      ),
      labelStyle: AppTextStyles.label,
    ),
  );
}

/// Primary (filled) and secondary (outline) button styles used across
/// the auth flow, matching the landing-page mockup.
class AppButtons {
  static ButtonStyle primary = ElevatedButton.styleFrom(
    backgroundColor: AppColors.brown900,
    foregroundColor: AppColors.mint,
    minimumSize: const Size.fromHeight(50),
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
    textStyle: AppTextStyles.button,
    elevation: 0,
  );

  static ButtonStyle outline = OutlinedButton.styleFrom(
    foregroundColor: AppColors.brown900,
    side: const BorderSide(color: AppColors.brown900, width: 1.4),
    minimumSize: const Size.fromHeight(50),
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
    textStyle: AppTextStyles.button,
  );
}
