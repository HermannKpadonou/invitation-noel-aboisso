# 🎄 Invitation — Éclairer le Monde · Noël à Aboisso

Site d'invitation pour le **Grand Noël des Enfants & Familles**
📅 Samedi **24 décembre 2026**, 10h00 – 15h00
📍 Salle des fêtes de la mairie d'**Aboisso**, Côte d'Ivoire

## Ouvrir le site
Double-cliquez simplement sur **`index.html`** — aucune installation n'est nécessaire
(une connexion Internet est utile pour les polices ; le site fonctionne aussi sans).

## Modifier les informations
Tout est centralisé en haut du fichier **`script.js`** (bloc `CONFIG`) :

```js
const CONFIG = {
  eventStart: "2026-12-24T10:00:00+00:00",  // date et heure de début
  eventEnd:   "2026-12-24T15:00:00+00:00",  // heure de fin
  rsvpDeadline: "2026-12-12",               // date limite de réponse
  contactPhone: "2250700000000",            // ⚠️ à remplacer par votre vrai numéro WhatsApp
  ...
};
```

- **Numéro de contact** : remplacer `2250700000000` par le vrai numéro (format international sans `+`).
- **Programme, activités, textes** : modifiables directement dans `index.html`.
- **Couleurs** : variables `--red`, `--gold`, etc. en haut de `styles.css`.
- **Logo / photo** : remplacer les fichiers dans `assets/`.

## Fonctionnalités
- 💌 Écran d'ouverture animé (enveloppe + confettis)
- ⏳ Compte à rebours en temps réel + ajout à Google Agenda / fichier `.ics`
- 🎭 Programme complet de la journée (chronologie animée)
- 📍 Lieu avec boutons Google Maps / Waze / copie d'adresse
- 🎟️ RSVP avec **billet téléchargeable en PNG** (numéroté) + confirmation WhatsApp
- ⛪ RSVP enrichi : statut **membre ou ami·e**, branche & localité pour les membres,
  et proposition d'inviter un·e **ami·e** et/ou un·e **membre inactif·ve**
  à la fête de Noël du District d'Aboisso
- ✍️ **« Mes vœux pour cette fête de Noël »** (livre d'or, sauvegardés sur le
  serveur ou l'appareil du visiteur)
- 📸 Mur photo « Je serai là ! » : photo prise **directement avec la caméra**
  (ou galerie / glisser-déposer) et **téléchargement avec le cadre décoratif
  « Éclairer le Monde »** (PNG : bordure rouge, liseré or, titre, date et
  #ÉclairerLeMonde)
- 💬 Bouton de partage WhatsApp
- ❄️ Neige, étoiles scintillantes et animations au défilement
- 🎨 **Motion design** : titres avec révélation masquée, compte à rebours à
  effet flip 3D, ligne du programme qui se dessine au scroll, cartes à
  effet de profondeur 3D au survol, parallaxe sur la photo, halo « lanterne »
  qui suit la souris, barre de progression de lecture, navigation flottante,
  bandeau défilant, boutons avec reflet balayant, confettis à la confirmation
- 🎶 **Lecteur de cantiques** : musique au démarrage (chant aléatoire),
  bouton flottant, boutons précédent / suivant, liste des 11 chants,
  lecture aléatoire activable/désactivable, réglage du volume, barre de progression

## 💌 Carte d'invitation officielle

Après le formulaire RSVP, la **carte d'invitation s'ouvre en animation** (la couverture
rouge pivote) : arche rouge, étoile dorée, « Célébrez la naissance de Jésus-Christ
avec nous », nom de l'invité, date, lieu et un **QR code** — scanné, il rouvre
directement la carte (`#billet-NUM`). Boutons : **⬇️ Télécharger la carte** (image PNG
générée dans le navigateur, avec le QR), **💬 Partager par WhatsApp**.

## 📸 Mur photo — « Je serai là ! »

Dans la section « Le mur des lumières », chaque membre de l'église peut :
1. choisir une photo (en cliquant ou en **glisser-déposant** — recadrée en carré
   et compressée automatiquement),
2. indiquer son nom et un petit mot,
3. cliquer sur **✨ Annoncer que je serai là !**

Le mur s'habille d'une **guirlande lumineuse animée**, affiche un
**compteur de participants** (« X lumières brillent déjà sur le mur ») et les
photos apparaissent en **polaroïds inclinés avec scotch doré ou rouge**,
une animation d'entrée en ressort, et un zoom élégant au survol.
Dans le back office (onglet « 📸 Mur photo »), elles peuvent être modérées.
Stockage : `data/photo-wall.json` (maximum 300 photos, ~500 Ko chacune).

## 🖥️ Back office (gestion des inscriptions)

Le dossier contient un **serveur Node.js sans aucune dépendance** (`server.js`)
qui héberge le site **et** un tableau de bord d'administration :

### Démarrer en local
```bash
node server.js
```
- Site : `http://localhost:3000`
- Back office : `http://localhost:3000/admin.html`
- Mot de passe par défaut : **noel2026** — ⚠️ à changer !

### Fonctionnalités du back office
- 🔐 Connexion protégée par mot de passe
- 📊 Statistiques : réponses reçues, présents, absents, personnes attendues, messages
- 💌 Table des inscriptions : recherche, filtre présent/absent, numéro de billet,
  téléphone avec bouton WhatsApp direct, notes
- 🗑️ Suppression d'inscriptions, de messages du livre d'or ou de photos du mur (modération)
- 📸 Onglet « Mur photo » : toutes les photos « Je serai là ! » avec suppression
- ⬇️ **Export CSV** (ouvrable dans Excel) des inscriptions
- 📋 Copie de tous les numéros des présents (pour un envoi groupé WhatsApp)
- 🔄 Actualisation automatique toutes les 30 secondes

### Stockage des données
Les réponses et messages sont enregistrés dans le dossier **`data/`**
(`rsvps.json`, `guestbook.json`, `photo-wall.json`). Sauvegardez ce dossier
régulièrement.
Sans serveur (site ouvert en double-cliquant sur `index.html`), le site
fonctionne quand même en mode local (données sur l'appareil du visiteur).

### Pousser sur GitHub
```bash
# 1. Créez le dépôt vide sur github.com (privé recommandé), puis :
git remote add origin https://github.com/VOTRE-PSEUDO/invitation-noel-aboisso.git
git push -u origin main
# 2. À chaque mise à jour : git add . ; git commit -m "…" ; git push
# → Render redéploie automatiquement à chaque push
```

### Stockage des données — PostgreSQL sur Neon 🐘
Le serveur utilise **Neon** (base PostgreSQL gratuite) si la variable
`DATABASE_URL` est définie — vos données survivent aux redéploiements :

1. Créez un compte sur **neon.tech** (bouton « Sign up with GitHub »)
2. **Create project** (nom : `noel-aboisso`, région la plus proche)
3. Copiez la **chaîne de connexion** (Connection string, format
   `postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require`)
4. Sur Render : **Environment** → ajoutez la variable **`DATABASE_URL`**
   avec cette chaîne → le serveur crée ses tables tout seul et
   **importe automatiquement** vos anciennes données JSON au premier démarrage

Sans `DATABASE_URL` (local, tests), le serveur replie sur des fichiers
JSON dans `data/` — le site fonctionne toujours, juste non partagé.

### Déployer sur Render (gratuit, comme l'exemple mariage)
1. Mettez le dossier sur GitHub
2. Sur render.com : **New → Web Service** → connectez le dépôt
3. Commande de démarrage : `node server.js` (aucun build nécessaire)
4. Ajoutez la variable d'environnement `ADMIN_PASSWORD` avec votre mot de passe

## 🎵 La musique
Les chants sont dans le dossier **`Playlists/`** (noms simplifiés pour le web :
`01-…` à `11-…`). La liste de lecture est définie par la constante `PLAYLIST`
dans `script.js` — ajoutez/retirez un chant en modifiant simplement ce tableau :

```js
const PLAYLIST = [
  { src: "Playlists/01-au-loin-dans-letable-accompagnement.mp3", title: "Au loin, dans l'étable (accompagnement)" },
  ...
];
```

- La **lecture aléatoire est activée par défaut** (bouton 🔀 dans le lecteur).
- La musique démarre quand le visiteur ouvre l'enveloppe (les navigateurs
  exigent une action du visiteur pour autoriser le son).
- Le volume choisi est mémorisé sur l'appareil du visiteur.

## Données RSVP
Avec le serveur (`node server.js`) ou sur Render, les réponses, messages
et photos sont centralisés (Neon PostgreSQL) et consultables dans le
**back office** `/admin.html`. Sans serveur (double-clic sur `index.html`),
le site fonctionne en mode local : les données restent sur l'appareil du
visiteur.
 
 