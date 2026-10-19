using System.Collections.Concurrent;
using System.Text.RegularExpressions;

namespace WanderWiseApi.Controllers;

// Server-side checks for sign-up and log in. The web and mobile forms check
// the same rules first, but these run no matter what is sent to the API.
public static class InputRules
{
    // Letters (including ñ and accents), spaces, period, apostrophe, dash.
    private static readonly Regex NameRegex = new(
        @"^[\p{L}][\p{L} .'\-]{0,49}$", RegexOptions.Compiled);

    private static readonly Regex EmailRegex = new(
        @"^[^\s@]+@[^\s@]+\.[^\s@]{2,}$", RegexOptions.Compiled);

    // Philippine mobile number: 09XXXXXXXXX (also accepts +639... / 639...).
    private static readonly Regex PhoneRegex = new(@"^09\d{9}$", RegexOptions.Compiled);

    // Employee IDs are an exact length (keep in sync with EMPLOYEE_ID_LENGTH
    // in web/src/utils/validation.js).
    public const int EmployeeIdLength = 10;
    private static readonly Regex EmployeeIdRegex = new(@"^[A-Z0-9\-]{10}$", RegexOptions.Compiled);
    private static readonly Regex TermRegex = new(@"^(\d{4})-(\d{4})$", RegexOptions.Compiled);

    public static string CleanName(string? raw) => Regex.Replace((raw ?? "").Trim(), @"\s{2,}", " ");

    public static string? NameError(string name, string label) =>
        NameRegex.IsMatch(name) ? null : $"{label} can only have letters, spaces, periods, apostrophes and dashes.";

    public static bool IsEmail(string? email) =>
        !string.IsNullOrWhiteSpace(email) && email.Length <= 150 && EmailRegex.IsMatch(email);

    public static bool IsEmployeeId(string id) => EmployeeIdRegex.IsMatch(id);

    // School term like "2026-2027": the second year must be the next year.
    // Empty is fine (the term is optional).
    public static bool IsTerm(string? term)
    {
        if (string.IsNullOrWhiteSpace(term)) return true;
        var m = TermRegex.Match(term.Trim());
        if (!m.Success) return false;
        var a = int.Parse(m.Groups[1].Value);
        var b = int.Parse(m.Groups[2].Value);
        return a >= 2000 && a <= 2099 && b == a + 1;
    }

    // Returns the number as 09XXXXXXXXX, or null when it isn't a valid PH mobile number.
    public static string? NormalizePhone(string? raw)
    {
        var digits = Regex.Replace(raw ?? "", @"[\s\-()]", "");
        if (digits.StartsWith("+63")) digits = "0" + digits[3..];
        else if (digits.StartsWith("63") && digits.Length == 12) digits = "0" + digits[2..];
        return PhoneRegex.IsMatch(digits) ? digits : null;
    }

    public static string? PasswordError(string? password)
    {
        if (string.IsNullOrEmpty(password) || password.Length < 8) return "Password must be at least 8 characters.";
        if (password.Length > 100) return "Password is too long (100 characters max).";
        if (!password.Any(char.IsLetter) || !password.Any(char.IsDigit))
            return "Password must have at least one letter and one number.";
        return null;
    }

    public static string? DobError(DateOnly dob)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(8)); // Philippine date
        if (dob > today) return "Date of birth can't be in the future.";
        if (dob < new DateOnly(1920, 1, 1)) return "Please enter a valid date of birth.";
        if (dob > today.AddYears(-13)) return "You must be at least 13 years old.";
        return null;
    }

    // Checks the fields shared by the student and teacher sign-up.
    // Returns an error message, or null when everything is fine.
    public static string? PersonError(string firstName, string lastName, string schoolEmail, string recoveryEmail, string? cellphone, string? password, out string phone)
    {
        phone = "";
        if (firstName.Length == 0 || lastName.Length == 0) return "Please enter your first and last name.";
        var nameError = NameError(firstName, "First name") ?? NameError(lastName, "Last name");
        if (nameError != null) return nameError;
        if (!IsEmail(recoveryEmail)) return "Please enter a valid personal/recovery email.";
        if (string.Equals(recoveryEmail, schoolEmail, StringComparison.OrdinalIgnoreCase))
            return "Use a personal email that is different from your school email.";
        var normalized = NormalizePhone(cellphone);
        if (normalized is null) return "Enter an 11-digit mobile number that starts with 09.";
        phone = normalized;
        return PasswordError(password);
    }
}

// Slows down password and code guessing. Kept in memory (resets when the
// backend restarts), which is enough for one server.
public static class AttemptGuard
{
    private record Window(int Count, DateTime Start);

    private static readonly ConcurrentDictionary<string, Window> Failures = new();

    // True when this key had `max` failures within the last `minutes`.
    public static bool IsLocked(string key, int max, int minutes)
    {
        if (!Failures.TryGetValue(key, out var w)) return false;
        if (DateTime.UtcNow - w.Start > TimeSpan.FromMinutes(minutes))
        {
            Failures.TryRemove(key, out _);
            return false;
        }
        return w.Count >= max;
    }

    public static void Fail(string key, int minutes)
    {
        Failures.AddOrUpdate(key,
            _ => new Window(1, DateTime.UtcNow),
            (_, w) => DateTime.UtcNow - w.Start > TimeSpan.FromMinutes(minutes)
                ? new Window(1, DateTime.UtcNow)
                : w with { Count = w.Count + 1 });
    }

    public static void Reset(string key) => Failures.TryRemove(key, out _);
}
