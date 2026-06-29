# javax.annotation classes referenced by Tink (via security-crypto) are not
# present at compile time — suppress the missing-class error.
-dontwarn javax.annotation.**
-dontwarn javax.annotation.concurrent.**
