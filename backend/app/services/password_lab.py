"""Password security lab — strength analysis, hash crack simulation."""
import hashlib
import re
import math
import string


COMMON_PASSWORDS = {
    "password", "123456", "12345678", "qwerty", "abc123", "password1",
    "admin", "letmein", "welcome", "monkey", "1234567890", "iloveyou",
    "sunshine", "princess", "dragon", "master", "shadow", "baseball",
    "football", "111111", "654321", "superman", "michael", "trustno1",
    "starwars", "passw0rd", "p@ssw0rd", "qwerty123", "111222", "000000",
}


def calculate_entropy(password: str) -> float:
    pool = 0
    if re.search(r"[a-z]", password): pool += 26
    if re.search(r"[A-Z]", password): pool += 26
    if re.search(r"[0-9]", password): pool += 10
    if re.search(r"[^a-zA-Z0-9]", password): pool += 32
    if pool == 0:
        return 0.0
    return round(len(password) * math.log2(pool), 2)


def estimate_crack_time(entropy: float) -> str:
    # Assume 10 billion guesses/sec (modern GPU on weak hash)
    guesses = 2 ** entropy
    seconds = guesses / 1e10
    if seconds < 1:
        return "instant"
    if seconds < 60:
        return f"{seconds:.1f} seconds"
    if seconds < 3600:
        return f"{seconds/60:.1f} minutes"
    if seconds < 86400:
        return f"{seconds/3600:.1f} hours"
    if seconds < 86400 * 365:
        return f"{seconds/86400:.1f} days"
    years = seconds / (86400 * 365)
    if years > 1e9:
        return f"{years:.2e} years (effectively forever)"
    return f"{years:.1f} years"


def analyze_password(password: str) -> dict:
    issues = []
    score = 0
    length = len(password)

    if length < 8:
        issues.append({"severity": "critical", "msg": "Too short (< 8 chars)"})
    elif length >= 12:
        score += 25
    elif length >= 16:
        score += 35

    has_lower = bool(re.search(r"[a-z]", password))
    has_upper = bool(re.search(r"[A-Z]", password))
    has_digit = bool(re.search(r"[0-9]", password))
    has_special = bool(re.search(r"[^a-zA-Z0-9]", password))
    char_classes = sum([has_lower, has_upper, has_digit, has_special])
    score += char_classes * 12

    if not has_upper: issues.append({"severity": "medium", "msg": "No uppercase letters"})
    if not has_digit: issues.append({"severity": "medium", "msg": "No digits"})
    if not has_special: issues.append({"severity": "high", "msg": "No special characters"})

    if password.lower() in COMMON_PASSWORDS:
        issues.append({"severity": "critical", "msg": "Found in common password list — instantly cracked"})
        score = max(score - 60, 0)

    if re.search(r"(.)\1{2,}", password):
        issues.append({"severity": "medium", "msg": "Repeated characters detected"})
        score -= 5
    if re.search(r"(012|123|234|345|456|567|678|789|890|abc|qwe|asd|zxc)", password.lower()):
        issues.append({"severity": "medium", "msg": "Sequential pattern detected"})
        score -= 8

    score = max(0, min(100, score))
    entropy = calculate_entropy(password)

    if score >= 85: rating = "EXCELLENT"
    elif score >= 65: rating = "STRONG"
    elif score >= 45: rating = "MODERATE"
    elif score >= 25: rating = "WEAK"
    else: rating = "CRITICAL"

    return {
        "length": length,
        "entropy_bits": entropy,
        "estimated_crack_time": estimate_crack_time(entropy),
        "score": score,
        "rating": rating,
        "issues": issues,
        "char_classes": {
            "lowercase": has_lower, "uppercase": has_upper,
            "digits": has_digit, "special": has_special,
        },
    }


def crack_hash(hash_value: str, hash_type: str = "md5", wordlist: list = None) -> dict:
    """Try to crack a hash against a built-in wordlist (educational)."""
    if wordlist is None:
        wordlist = list(COMMON_PASSWORDS) + [
            "letmein123", "Password1!", "Welcome123",
            "admin123", "root", "toor", "secret",
            "changeme", "default", "guest", "test",
        ]
    hash_value = hash_value.lower().strip()
    func = {
        "md5": hashlib.md5, "sha1": hashlib.sha1,
        "sha256": hashlib.sha256, "sha512": hashlib.sha512,
    }.get(hash_type.lower())
    if not func:
        return {"cracked": False, "error": f"Unsupported hash type: {hash_type}"}

    attempts = 0
    for word in wordlist:
        attempts += 1
        if func(word.encode()).hexdigest() == hash_value:
            return {
                "cracked": True, "plaintext": word,
                "hash_type": hash_type, "attempts": attempts,
                "wordlist_size": len(wordlist),
            }
    return {
        "cracked": False, "hash_type": hash_type,
        "attempts": attempts, "wordlist_size": len(wordlist),
        "message": "Not found in wordlist — likely a strong password.",
    }
