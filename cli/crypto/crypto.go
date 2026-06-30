package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"

	"golang.org/x/crypto/pbkdf2"
)

const (
	SaltLen    = 32
	NonceLen   = 12
	TagLen     = 16
	KeyLen     = 32
	Iterations = 600000
)

type encryptedData struct {
	Salt       string `json:"salt"`
	Nonce      string `json:"nonce"`
	Ciphertext string `json:"ciphertext"`
	Tag        string `json:"tag"`
	Iterations int    `json:"iterations"`
}

func Encrypt(plaintext []byte, password string) ([]byte, error) {
	salt := make([]byte, SaltLen)
	if _, err := rand.Read(salt); err != nil {
		return nil, err
	}
	nonce := make([]byte, NonceLen)
	if _, err := rand.Read(nonce); err != nil {
		return nil, err
	}
	key := pbkdf2.Key([]byte(password), salt, Iterations, KeyLen, sha256.New)
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}
	aead, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	encrypted := aead.Seal(nil, nonce, plaintext, nil)
	tag := encrypted[len(encrypted)-TagLen:]
	ciphertext := encrypted[:len(encrypted)-TagLen]
	data := encryptedData{
		Salt:       base64.StdEncoding.EncodeToString(salt),
		Nonce:      base64.StdEncoding.EncodeToString(nonce),
		Ciphertext: base64.StdEncoding.EncodeToString(ciphertext),
		Tag:        base64.StdEncoding.EncodeToString(tag),
		Iterations: Iterations,
	}
	return json.Marshal(data)
}

func Decrypt(ciphertext []byte, password string) ([]byte, error) {
	var data encryptedData
	if err := json.Unmarshal(ciphertext, &data); err != nil {
		return nil, err
	}
	salt, err := base64.StdEncoding.DecodeString(data.Salt)
	if err != nil {
		return nil, err
	}
	nonce, err := base64.StdEncoding.DecodeString(data.Nonce)
	if err != nil {
		return nil, err
	}
	ct, err := base64.StdEncoding.DecodeString(data.Ciphertext)
	if err != nil {
		return nil, err
	}
	tag, err := base64.StdEncoding.DecodeString(data.Tag)
	if err != nil {
		return nil, err
	}
	combined := append(ct, tag...)
	key := pbkdf2.Key([]byte(password), salt, Iterations, KeyLen, sha256.New)
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}
	aead, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	return aead.Open(nil, nonce, combined, nil)
}
