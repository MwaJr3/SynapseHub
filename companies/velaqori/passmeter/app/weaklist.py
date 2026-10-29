"""A deliberately small bundled weak-password list.

This is a convenience heuristic only. It CANNOT establish whether a password
appears in any real breach corpus; that requires an external, privacy-sensitive
service this tool does not use.
"""
WEAK_LIST = {
    "password", "password1", "passw0rd", "123456", "12345678", "123456789", "qwerty",
    "qwerty123", "letmein", "welcome", "welcome1", "admin", "admin123", "iloveyou",
    "monkey", "dragon", "football", "baseball", "sunshine", "princess", "trustno1",
    "abc123", "111111", "000000", "password!", "changeme", "secret", "master",
}
