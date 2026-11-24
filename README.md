# ✦ Il est le Cadeau · Noël à Aboisso (24 Décembre 2026)

Site local d'invitation et d'inscription pour la célébration de Noël du **District d'Aboisso** (Église de Jésus-Christ des Saints des Derniers Jours). *Ce site est une initiative locale et n'est pas un site officiel de l'Église.*

- 📅 **Date :** Jeudi **24 décembre 2026**, de **10h00 à 15h00**
- 📍 **Lieu :** Salle des fêtes de la mairie d'**Aboisso**, Côte d'Ivoire
- 🤝 **Entrée :** Entrée gratuite et ouverte à tous — venez seul, en famille ou avec un proche invité.

---

## ✨ Fonctionnalités principales

1. **Design Ultra-Soft & Éditorial (Jour Ivoire / Nuit de Bethléem)**
   - Enveloppe d'accueil nominative (`?pour=Koffi&de=Hermann`) avec ouverture fluide et accès direct au formulaire.
   - Compte à rebours intelligent qui bascule automatiquement sur *« 🎄 C'est aujourd'hui ! »* le 24 décembre, puis *« Merci d'être venus ! »* après l'événement.
2. **Inscription en 1 seul écran (30 secondes) & Billet QR Hors-Ligne**
   - Choix immédiat de participation (*« Je serai présent »* ou *« Je ne pourrai pas venir »* qui masque automatiquement la section invités).
   - Ouvert à tous (invité encouragé mais facultatif), comptage du nombre d'enfants pour les attentions de Noël, demande optionnelle d'info transport par branche et découverte de l'Église / Livre de Mormon.
   - Aperçu du billet en temps réel pendant la saisie + génération du **Billet PNG HD avec QR Code sécurisé** fonctionnant hors connexion (`Service Worker` PWA).
   - Bouton de **Rappel WhatsApp personnel** et liens d'invitation personnalisés en 1 clic pour chaque invité déclaré.
   - Validation complète côté client et côté serveur (numéro ivoirien à 10 chiffres ou `+225`, détection des doublons d'inscription, capacité maximale de la salle).
3. **Cinémathèque de Noël (720p `faststart`, `preload="none"`) & Galerie HD Animée**
   - 5 films officiels de la Nativité optimisés pour les connexions mobiles (aucun téléchargement avant le clic) + lien vers la Bibliothèque d'Évangile.
   - Diaporama cinématographique HD avec effet *Ken Burns*.
4. **Mur Photo « Je serai là ! » & Livre d'or avec Pré-Modération**
   - Cases de consentement obligatoires (incluant l'autorisation parentale pour les enfants), limite à 5 Mo (JPG/PNG/WebP), filtre anti-mots interdits, **validation préalable par les responsables du district** avant publication, et bouton public **« 🚩 Signaler »**.
5. **Back-Office Responsive, Récapitulatif par Branche & Mode « Pointage Jour J (Scanner QR Code) » (`/admin.html`)**
   - Vue tableau sans défilement horizontal sur ordinateur + vue cartes et tiroir latéral (*Drawer*) sur mobile.
   - Récapitulatif en direct par branche (inscrits, personnes, enfants, arrivées Jour J) et suivi des contenus en attente de validation.
   - Scanner QR Code par caméra pour pointer les arrivées en direct le jeudi 24 décembre à l'entrée de la mairie d'Aboisso.
   - Export CSV/Excel protégé contre les injections de formules.

---

## 🚀 Démarrage & Configuration

### Lancer en local
```bash
node server.js
```
- **Site public :** `http://localhost:3000`
- **Back-office :** `http://localhost:3000/admin.html`
- **Vérification de santé (Keep-Alive UptimeRobot) :** `http://localhost:3000/api/health`

### Variables d'environnement sur Render (Production)
Dans l'onglet **Environment** de votre service Render (`https://invitation-noel-aboisso.onrender.com`), définissez :

| Variable | Description |
|---|---|
| `ADMIN_PASSWORD` | **(Obligatoire en production)** Choisissez un mot de passe administrateur fort et confidentiel pour protéger `/admin.html`. |
| `DATABASE_URL` | **(Recommandé)** Chaîne de connexion PostgreSQL **Neon** (`postgresql://...`) pour que les inscriptions, photos et vœux soient conservés de façon permanente à chaque redéploiement. |
| `RSVP_MAX_CAPACITY` | *(Optionnel)* Capacité maximale de la salle (par défaut `350` personnes). |
| `GOOGLE_SHEETS_WEBHOOK_URL` | *(Optionnel)* URL d'un Google Apps Script / Webhook pour copier chaque inscription en direct dans Google Sheets. |

---

## 🔒 Sécurité & Confidentialité
- Le dossier `data/` est inscrit dans `.gitignore` afin qu'aucune donnée personnelle (noms, téléphones, photos) ne soit publiée sur GitHub.
- Les routes d'administration (`/api/admin/*`) sont protégées par authentification `Bearer` à comparaison en temps constant (`crypto.timingSafeEqual`) et limitation de débit (*Rate-Limiting*) anti-bruteforce.

---

## 📜 Crédits & Mentions légales
Initiative locale non commerciale du **District d'Aboisso** pour l'organisation de sa célébration de Noël.
Films, cantiques et visuels de la Nativité : **© Intellectual Reserve, Inc.** Tous droits réservés — utilisés dans le cadre autorisé des activités de l'Église.
