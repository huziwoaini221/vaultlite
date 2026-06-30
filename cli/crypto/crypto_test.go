package crypto

import (
	"bytes"
	"testing"
)

func TestEncryptDecrypt(t *testing.T) {
	password := "test-master-password-123!"
	plaintext := []byte(`{"entries":[{"id":"abc","title":"GitHub","username":"user@test.com","password":"secret123"}]}`)

	encrypted, err := Encrypt(plaintext, password)
	if err != nil {
		t.Fatalf("Encrypt failed: %v", err)
	}

	decrypted, err := Decrypt(encrypted, password)
	if err != nil {
		t.Fatalf("Decrypt failed: %v", err)
	}

	if !bytes.Equal(plaintext, decrypted) {
		t.Fatalf("Decrypted text does not match original.\nGot:  %s\nWant: %s", decrypted, plaintext)
	}
}

func TestDecryptWrongPassword(t *testing.T) {
	password := "correct-password"
	wrongPassword := "wrong-password"
	plaintext := []byte(`{"entries":[]}`)

	encrypted, err := Encrypt(plaintext, password)
	if err != nil {
		t.Fatalf("Encrypt failed: %v", err)
	}

	_, err = Decrypt(encrypted, wrongPassword)
	if err == nil {
		t.Fatal("Expected error when decrypting with wrong password, got nil")
	}
}

func TestEncryptEmptyData(t *testing.T) {
	password := "test-password"
	plaintext := []byte{}

	encrypted, err := Encrypt(plaintext, password)
	if err != nil {
		t.Fatalf("Encrypt empty data failed: %v", err)
	}

	decrypted, err := Decrypt(encrypted, password)
	if err != nil {
		t.Fatalf("Decrypt empty data failed: %v", err)
	}

	if !bytes.Equal(plaintext, decrypted) {
		t.Fatal("Empty data round-trip failed")
	}
}

func TestUniqueCiphertext(t *testing.T) {
	password := "test-password"
	plaintext := []byte(`{"entries":[{"id":"test"}]}`)

	enc1, _ := Encrypt(plaintext, password)
	enc2, _ := Encrypt(plaintext, password)

	if bytes.Equal(enc1, enc2) {
		t.Fatal("Two encryptions of same data produced same ciphertext (no salt/nonce randomness)")
	}
}

func TestEncryptLargeData(t *testing.T) {
	password := "test-password"
	plaintext := make([]byte, 100000)
	for i := range plaintext {
		plaintext[i] = byte(i % 256)
	}

	encrypted, err := Encrypt(plaintext, password)
	if err != nil {
		t.Fatalf("Encrypt large data failed: %v", err)
	}

	decrypted, err := Decrypt(encrypted, password)
	if err != nil {
		t.Fatalf("Decrypt large data failed: %v", err)
	}

	if !bytes.Equal(plaintext, decrypted) {
		t.Fatal("Large data round-trip failed")
	}
}

func TestInvalidCiphertext(t *testing.T) {
	password := "test-password"
	_, err := Decrypt([]byte("invalid-data"), password)
	if err == nil {
		t.Fatal("Expected error when decrypting invalid data, got nil")
	}
}
