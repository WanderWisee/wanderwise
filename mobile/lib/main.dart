import 'package:flutter/material.dart';
import 'theme.dart';
import 'screens/landing_screen.dart';

void main() {
  runApp(const WanderWiseApp());
}

class WanderWiseApp extends StatelessWidget {
  const WanderWiseApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'WanderWise',
      debugShowCheckedModeBanner: false,
      theme: buildAppTheme(),
      home: const LandingScreen(),
    );
  }
}
