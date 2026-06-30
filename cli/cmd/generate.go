package cmd

import (
	"flag"
	"fmt"
	"math/rand/v2"
	"strings"
)

type GenerateOptions struct {
	Length           int
	Uppercase        bool
	Lowercase        bool
	Digits           bool
	Symbols          bool
	ExcludeAmbiguous bool
}

const (
	charsUppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
	charsLowercase = "abcdefghijklmnopqrstuvwxyz"
	charsDigits    = "0123456789"
	charsSymbols   = "!@#$%^&*()_+-=[]{}|;:,.<>?"
	charsAmbiguous = "il1Lo0O"
)

func generatePassword(opts GenerateOptions) string {
	var chars []byte
	if opts.Uppercase {
		chars = append(chars, []byte(charsUppercase)...)
	}
	if opts.Lowercase {
		chars = append(chars, []byte(charsLowercase)...)
	}
	if opts.Digits {
		chars = append(chars, []byte(charsDigits)...)
	}
	if opts.Symbols {
		chars = append(chars, []byte(charsSymbols)...)
	}
	if opts.ExcludeAmbiguous {
		var filtered []byte
		for _, c := range chars {
			if !strings.ContainsRune(charsAmbiguous, rune(c)) {
				filtered = append(filtered, c)
			}
		}
		chars = filtered
	}
	if len(chars) == 0 {
		return ""
	}
	var result []byte
	if opts.Uppercase {
		result = append(result, charsUppercase[rand.IntN(len(charsUppercase))])
	}
	if opts.Lowercase {
		result = append(result, charsLowercase[rand.IntN(len(charsLowercase))])
	}
	if opts.Digits {
		result = append(result, charsDigits[rand.IntN(len(charsDigits))])
	}
	if opts.Symbols {
		result = append(result, charsSymbols[rand.IntN(len(charsSymbols))])
	}
	for i := len(result); i < opts.Length; i++ {
		result = append(result, chars[rand.IntN(len(chars))])
	}
	rand.Shuffle(len(result), func(i, j int) {
		result[i], result[j] = result[j], result[i]
	})
	return string(result)
}

func runGenerate(args []string) error {
	fs := flag.NewFlagSet("generate", flag.ContinueOnError)
	length := fs.Int("length", 24, "Password length")
	noUpper := fs.Bool("no-uppercase", false, "Exclude uppercase letters")
	noLower := fs.Bool("no-lowercase", false, "Exclude lowercase letters")
	noDigits := fs.Bool("no-digits", false, "Exclude digits")
	noSymbols := fs.Bool("no-symbols", false, "Exclude symbols")
	noAmbig := fs.Bool("no-ambig", false, "Exclude ambiguous characters (il1Lo0O)")
	fs.SetOutput(flag.CommandLine.Output())

	for _, a := range args {
		if a == "--help" || a == "-h" {
			fmt.Println("Usage: vault generate [flags]")
			fmt.Println()
			fmt.Println("Generate a random password.")
			fmt.Println()
			fmt.Println("Flags:")
			fmt.Println("  --length <n>         Password length (default 24)")
			fmt.Println("  --no-uppercase       Exclude uppercase letters")
			fmt.Println("  --no-lowercase       Exclude lowercase letters")
			fmt.Println("  --no-digits          Exclude digits")
			fmt.Println("  --no-symbols         Exclude symbols")
			fmt.Println("  --no-ambig           Exclude ambiguous characters (il1Lo0O)")
			return nil
		}
	}

	if err := fs.Parse(args); err != nil {
		return err
	}

	if *length < 1 {
		return fmt.Errorf("length must be at least 1")
	}
	if !*noUpper && !*noLower && !*noDigits && !*noSymbols {
		// Use default character set
	}

	pass := generatePassword(GenerateOptions{
		Length:           *length,
		Uppercase:        !*noUpper,
		Lowercase:        !*noLower,
		Digits:           !*noDigits,
		Symbols:          !*noSymbols,
		ExcludeAmbiguous: *noAmbig,
	})
	fmt.Println(pass)
	return nil
}
