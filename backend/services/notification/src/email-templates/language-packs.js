export const	languagePacks =
{
    en: {
        title: "42 Authentication Code",
        greeting: "Hello, Student! 👨‍💻",
        message: "You've requested access to your ft_transcendence account. To complete the authentication process, please use the following One-Time Password (OTP) code:",
        otpLabel: "Authentication Code",
        expiryText: "⏰ Expires in {{EXPIRY_MINUTES}} minutes",
        securityTitle: "Security Notice",
        securityPoints: [
            "This code is valid for {{EXPIRY_MINUTES}} minutes only",
            "Never share this code with anyone",
            "If you didn't request this code, please ignore this email",
            "For security reasons, clear this email after use"
        ],
        footerMessage: "This is an automated message from the 42 authentication system. Please do not reply to this email.",
        footerText: "42 School - ft_transcendence Project",
        subject: "🔐 Your 42 Authentication Code",
        plainText: "Your 42 Authentication Code is: {{OTP_CODE}}\nThis code will expire in {{EXPIRY_MINUTES}} minutes."
    },
    fr: {
        title: "Code d'Authentification 42",
        greeting: "Salut, Étudiant ! 👨‍💻",
        message: "Vous avez demandé l'accès à votre compte ft_transcendence. Pour terminer le processus d'authentification, veuillez utiliser le code à usage unique (OTP) suivant :",
        otpLabel: "Code d'Authentification",
        expiryText: "⏰ Expire dans {{EXPIRY_MINUTES}} minutes",
        securityTitle: "Avis de Sécurité",
        securityPoints: [
            "Ce code n'est valide que pendant {{EXPIRY_MINUTES}} minutes",
            "Ne partagez jamais ce code avec qui que ce soit",
            "Si vous n'avez pas demandé ce code, veuillez ignorer cet email",
            "Pour des raisons de sécurité, supprimez cet email après utilisation"
        ],
        footerMessage: "Ceci est un message automatique du système d'authentification 42. Veuillez ne pas répondre à cet email.",
        footerText: "École 42 - Projet ft_transcendence",
        subject: "🔐 Votre code d'authentification 42",
        plainText: "Votre code d'authentification 42 est : {{OTP_CODE}}\nCe code expirera dans {{EXPIRY_MINUTES}} minutes."
    },
    it: {
        title: "Codice di Autenticazione 42",
        greeting: "Ciao, Studente! 👨‍💻",
        message: "Hai richiesto l'accesso al tuo account ft_transcendence. Per completare il processo di autenticazione, utilizza il seguente codice OTP (One-Time Password):",
        otpLabel: "Codice di Autenticazione",
        expiryText: "⏰ Scade tra {{EXPIRY_MINUTES}} minuti",
        securityTitle: "Avviso di Sicurezza",
        securityPoints: [
            "Questo codice è valido solo per {{EXPIRY_MINUTES}} minuti",
            "Non condividere mai questo codice con nessuno",
            "Se non hai richiesto questo codice, ignora questa email",
            "Per motivi di sicurezza, cancella questa email dopo l'uso"
        ],
        footerMessage: "Questo è un messaggio automatico dal sistema di autenticazione 42. Non rispondere a questa email.",
        footerText: "Scuola 42 - Progetto ft_transcendence",
        subject: "🔐 Il tuo codice di autenticazione 42",
        plainText: "Il tuo codice di autenticazione 42 è: {{OTP_CODE}}\nQuesto codice scadrà tra {{EXPIRY_MINUTES}} minuti."
    }
};

export function	getLanguagePack(language)
{
	return (languagePacks[language] || languagePacks.en);
}