package cmd

import (
	"fmt"
	"image"
	_ "image/jpeg"
	_ "image/png"
	"os"
	"strings"

	"github.com/makiuchi-d/gozxing"
	"github.com/makiuchi-d/gozxing/qrcode"
)

func init() {
	commands = append(commands, &Command{
		Name: "qrscan",
		Desc: "Scan a TOTP QR code image and extract the secret",
		Run:  runQRScan,
	})
}

func runQRScan(args []string) error {
	if len(args) != 1 {
		return fmt.Errorf("usage: vault qrscan <image-file>")
	}
	filePath := args[0]

	f, err := os.Open(filePath)
	if err != nil {
		return fmt.Errorf("open image: %w", err)
	}
	defer f.Close()

	img, _, err := image.Decode(f)
	if err != nil {
		return fmt.Errorf("decode image: %w", err)
	}

	bmp, err := gozxing.NewBinaryBitmapFromImage(img)
	if err != nil {
		return fmt.Errorf("prepare bitmap: %w", err)
	}

	reader := qrcode.NewQRCodeReader()
	result, err := reader.Decode(bmp, nil)
	if err != nil {
		return fmt.Errorf("decode QR: %w", err)
	}

	text := result.GetText()
	secret, label, issuer := parseOTPAuth(text)
	if secret == "" {
		return fmt.Errorf("not a valid TOTP QR code (expected otpauth://totp/...)")
	}

	fmt.Println("Secret:", secret)
	if label != "" {
		fmt.Println("Label:", label)
	}
	if issuer != "" {
		fmt.Println("Issuer:", issuer)
	}
	return nil
}

func parseOTPAuth(uri string) (secret, label, issuer string) {
	if !strings.HasPrefix(uri, "otpauth://totp/") {
		return "", "", ""
	}
	u := strings.TrimPrefix(uri, "otpauth://totp/")
	parts := strings.SplitN(u, "?", 2)
	if len(parts) < 2 {
		return "", "", ""
	}
	label = strings.ReplaceAll(parts[0], "%20", " ")
	params := strings.Split(parts[1], "&")
	for _, p := range params {
		kv := strings.SplitN(p, "=", 2)
		if len(kv) != 2 {
			continue
		}
		switch kv[0] {
		case "secret":
			secret = strings.ReplaceAll(kv[1], " ", "")
		case "issuer":
			issuer = strings.ReplaceAll(kv[1], "%20", " ")
		}
	}
	return secret, label, issuer
}