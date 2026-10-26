# Maison complice

Une application personnelle, en français, pour organiser les travaux et les entretiens de la maison. React 19 et Vite, sans compte, serveur de données ou service payant.

## Démarrer

Prérequis : Node.js 22 ou 24 et npm.

```sh
cd /workspace/Taches-La-Fr-sandi-re
npm ci --cache /tmp/maison-npm-cache
npm run dev
```

Le serveur écoute sur le port **5173**, sur toutes les interfaces. Il doit être relancé après le redémarrage de l’environnement. Le dépôt existant suffit : aucun worktree supplémentaire n’est nécessaire.

```sh
npm run build       # version de production dans dist/
npm run preview     # servir cette version
npm test            # tests du modèle
npm run test:e2e    # parcours dans Chromium
```

Les tests navigateur utilisent `/usr/bin/chromium`. Pour une autre installation, définir `CHROMIUM_PATH` avec le chemin du navigateur. Playwright lance Vite automatiquement si nécessaire. Les données de test restent dans des contextes navigateur isolés et ne préremplissent jamais l’application.

## Utilisation

- **Cette semaine** : objectif propre à chaque semaine, navigation sans limite fixe, tâches multiples par créneau, classement par pièce et lot, filtres et liste à planifier. Lundi matin et mercredi après-midi sont disponibles ; samedi et dimanche demandent confirmation. Rendre un créneau indisponible conserve les tâches à déplacer.
- **Agenda** : mois et semaine, création depuis une date, mêmes interventions que le planning. Les échéances d’entretien et les rendez-vous à heure connue ont des libellés distincts. Un rendez-vous après l’échéance est signalé.
- **Courses** : achats rattachés aux interventions, quantités libres, magasins, références, cinq états et filtres. Les échéances automatiques suivent le déplacement de l’intervention et le délai global. Les dates personnalisées sont conservées et signalées si elles dépassent l’intervention. Les achats non planifiés restent sans date ; les échéances fondées sur un entretien sans rendez-vous sont provisoires.
- **Entretiens** : vue annuelle, échéances inconnues, contact anticipé, rendez-vous à n’importe quelle date et heure, historique et périodicité choisie. Une réalisation crée une seule occurrence suivante avec des achats et outils à vérifier de nouveau. Le calcul suit l’échéance de référence ou la réalisation réelle. Les fins de mois sont ramenées au dernier jour existant. Une annulation ne vaut pas réalisation. L’arrêt d’une série empêche son renouvellement ; les occurrences déjà créées restent consultables.
- **Fiches d’intervention** : préparation, achats, produits réutilisables, outils et modes d’obtention, personnes et rôles, entreprise et contrat, documents sous forme de liens, notes et historique. Ajouter plusieurs fois le même produit aux courses d’une intervention ne crée pas de doublon. Un outil emprunté, loué ou fourni nécessite une confirmation explicite.
- **Carnet de maison** : équipements, entreprises, contrats, produits, outils et personnes réutilisables. Archiver une fiche conserve ses liens. Le numéro de contrat est du texte, y compris ses zéros initiaux. Sur téléphone, le carnet s’ouvre par l’icône de livre en haut à droite.
- **Réglages** : fuseau (Europe/Paris par défaut), délai de courses (deux jours calendaires par défaut), nom, couleur et foulard de la mascotte, affichage de ses bulles, export et import JSON.

La mascotte est un petit brabançon SVG original intégré au code, décliné en accueil, réflexion, courses, préparation et félicitations. Elle ne fait aucun appel à une IA. Les polices sont embarquées ; aucun service tiers n’est requis au simple affichage.

## Données et sauvegardes

Le premier lancement est vide. Les créneaux proposés ne sont pas des tâches ou des obligations préenregistrées.

Les données sont enregistrées dans le **localStorage de ce navigateur, pour cette origine** (clé `maison-complice-v1`). Elles survivent au rechargement et à la fermeture du navigateur, mais pas à son effacement de données. Changer de domaine, de port, de profil ou d’appareil ne transfère pas les données. Il n’y a pas de synchronisation distante.

Dans les réglages, **Exporter en JSON** conserve les interventions, objectifs, créneaux, séries, historiques, achats, carnets, relations et réglages. **Importer** vérifie la structure, les identifiants, les relations, les dates et les états avant de demander confirmation du remplacement. Un fichier invalide ne remplace rien. Une sauvegarde locale illisible est protégée contre l’écrasement automatique. Si le stockage échoue, une alerte invite à exporter l’état en mémoire.

Le format initial est versionné `1`. Il n’existe pas de format antérieur à migrer ; les versions inconnues sont refusées. `migrate()` est le point d’entrée prévu pour les futures migrations explicites.

Les documents restent des **liens**, pas des pièces jointes sauvegardées. Ouvrir les coordonnées utilise les liens téléphone/courriel du terminal sans affirmer qu’un appel ou un message a été effectué. Les coordonnées ne sont transmises à aucun service par le simple affichage.

## Architecture

- `src/model.js` : modèle partagé, dates locales, achats, préparation, récurrences, validation des sauvegardes.
- `src/App.jsx` : navigation, quatre vues, stockage et réglages.
- `src/Editor.jsx` : fiche commune et achats.
- `src/Catalog.jsx` : fiches réutilisables et archivage.
- `src/Dog.jsx` : illustration de la mascotte.
- `src/ui.jsx`, `src/style.css` : composants communs, adaptation téléphone et réduction des mouvements.
- `tests/` : tests unitaires et parcours navigateur.

Les dates sans heure sont des chaînes locales `AAAA-MM-JJ`, jamais des instants UTC. L’agenda et les courses dérivent des mêmes identifiants d’intervention. Les récurrences sont générées à la réalisation, sans tâche de fond ni notifications externes. Les snapshots d’entreprise et de contrat d’une réalisation sont conservés dans son historique.

## Périmètre et limites

Cette première version est personnelle et locale. Elle ne fournit ni comptes partagés, synchronisation Google/Outlook, notifications quand elle est fermée, SMS, courriels, stockage de pièces jointes ni règles réglementaires automatiques. La fréquence d’entretien est choisie par l’utilisateur. Les prix, stocks, délais de livraison, compatibilités et validités de contrat ne sont pas déduits.

Les modifications de cette occurrence concernent sa fiche et peuvent personnaliser son prochain calcul ; « cette occurrence et les suivantes » actualise aussi les fiches non réalisées de la série. Les dates déjà renseignées et les réalisations historiques ne sont pas réécrites. Arrêter une série ne supprime pas les occurrences déjà existantes.

## Publier sur GitHub Pages

Une version statique prête à servir est conservée dans `docs/`. Ses chemins sont relatifs pour fonctionner sous le nom du dépôt. Aucune donnée du navigateur n’est incluse dans ces fichiers.

Après l’envoi sur GitHub, ouvrir **Settings → Pages** du dépôt :

1. Sous **Build and deployment**, choisir **Deploy from a branch**.
2. Sélectionner la branche **main** et le dossier **/docs**, puis **Save**.
3. Attendre la fin de la publication et ouvrir l’adresse affichée par GitHub.

Pour mettre à jour le site après une modification :

```sh
npm run build:pages
# Enregistrer et envoyer aussi les nouveaux fichiers de docs/ sur GitHub.
```

L’adresse GitHub Pages attendue pour ce dépôt est `https://dinou29.github.io/Taches-La-Fr-sandi-re/`. Elle ne sera accessible qu’après activation et publication réussies par GitHub. Une adresse personnalisée déjà configurée dans GitHub peut remplacer cette adresse.

Sur un dépôt privé, la disponibilité de Pages dépend de l’offre GitHub du propriétaire. Aucun changement de visibilité du dépôt n’est effectué par ces instructions.
