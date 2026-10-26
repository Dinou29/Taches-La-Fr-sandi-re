# La Frésandière — Travaux & entretiens de la maison

Application personnelle et familiale en français, React 19 / Vite. La V2 adapte l’application existante : accueil compact, calendrier semaine/mois/année, post-it, fiches Tâche et Entretien distinctes, achats, contacts et documents annexes.

## Démarrer

Node.js 22 ou 24 et npm. Depuis le dépôt existant :

```sh
npm ci --cache /tmp/maison-npm-cache
npm run dev
```

Le serveur écoute sur le port 5173. Aucun compte applicatif, secret, serveur de données ou service payant n’est nécessaire. Les processus sont à relancer après redémarrage de l’environnement. Chaque tâche cloud est déjà isolée : aucun worktree supplémentaire n’est nécessaire sauf demande explicite.

```sh
npm test             # modèle, dates, récurrences, compatibilité et fichiers
npm run test:e2e      # parcours Chromium ordinateur et téléphone
npm run build        # production dans dist/
npm run preview      # servir dist/
npm run build:pages  # V2 à la racine dans docs/ ; /v2/ redirige vers elle
```

Les tests navigateur utilisent `/usr/bin/chromium` (modifiable par `CHROMIUM_PATH`). Ils démarrent Vite au besoin, utilisent des contextes isolés et ne déposent aucune donnée d’exemple dans l’application.

## Périmètre livré

- Accueil : blason existant, mention de fonction, semaine actuelle calculée, combi terracotta/crème, création d’une tâche, calendrier, trois accès aux listes et post-it des prochaines interventions. Aucun formulaire, graphique ou statistique dominante sur l’accueil. Le bas de page comporte Paramètres, Entretiens, Tâches et Contacts, sans barre fixe ni menu latéral.
- Calendrier : semaine/mois/année, navigation et retour Aujourd’hui, jours entourés uniquement lorsqu’une intervention active existe. Aujourd’hui garde son fond sauge. Un clic sur une date ouvre les interventions du jour, chacune ouvrant le bon type de fiche.
- Tâche : titre, pièce, date facultative et personnes, puis Notes, Achats & matériel et Entreprise & contrat à déplier. Terminer/rouvrir en modification. Les anciens lots, périodes, objectifs, documents et historiques sont conservés dans les données, sans revenir dans la création.
- Entretien : Quoi, Quand, Qui contacter, Contrat & rendez-vous, Documents annexes, Notes et préparation facultative. Fréquence « À définir » par défaut, aucune échéance inventée. Une fréquence connue permet une seule occurrence suivante à la réalisation, selon l’échéance ou la date réelle. Historique conservé ; arrêt de la récurrence et annulation distincts d’une réalisation.
- Contacts : entreprises et personnes réutilisables, coordonnées communes aux interventions, interventions liées et archivage. Contrats, équipements, produits et outils accessibles depuis les fiches et les paramètres. Les références de contrat sont des textes, zéros initiaux compris.
- Achats et matériel : relations par identifiant, états distincts, dates automatiques recalculées lors d’un déplacement et dates personnalisées conservées. Sans date d’intervention, aucun délai inventé. Échéance provisoire pour un entretien sans rendez-vous. Matériel loué, emprunté ou fourni à confirmer explicitement.
- Paramètres : vue initiale du calendrier, horizon des post-it (21 jours par défaut : aujourd’hui et les 20 jours suivants), synthèse d’entretien mois/année, préférences hebdomadaires, exceptions de disponibilité, anticipation des achats et fuseau. Les jours non privilégiés restent planifiables ; rendre un jour indisponible conserve les tâches.

Les alertes sont internes. Les liens téléphone/courriel ouvrent les applications du terminal sans affirmer qu’un appel ou un message a été envoyé. Aucun prix, stock, délai de livraison, obligation réglementaire ou validité de contrat n’est déduit.

## Conservation et sauvegardes

Les données restent dans le **localStorage de cette origine et de ce navigateur**, sous la clé historique `maison-complice-v1` en développement. La version publiée utilise `maison-complice-v2` : à sa première ouverture, les données V1 sont copiées sans être modifiées. Ensuite, les deux plannings évoluent indépendamment, y compris après import/restauration. Une V2 existante, même vide, n’est jamais recopiée depuis la V1. La structure v1 est étendue de manière additive : réglages manquants complétés, collections `rooms` et `attachments` ajoutées si absentes, identifiants et champs historiques conservés. Aucune remise à zéro lors d’un changement de présentation. Un stockage illisible est protégé contre l’écrasement ; en cas d’échec d’enregistrement, les saisies restent en mémoire et peuvent être exportées.

Les **octets des pièces jointes** sont conservés dans **IndexedDB**, base `fresandiere-documents` en développement et `fresandiere-documents-v2` pour la V2 publiée, magasin `files`. Le JSON conserve leurs métadonnées et identifiants stables rattachés à l’entretien. Les fichiers ajoutés dans une nouvelle fiche annulée sont nettoyés. Retirer un document d’une fiche retire son rattachement ; les octets non référencés ne sont pas inclus dans les exports et sont remplacés lors d’une restauration ZIP complète.

Formats : PDF, PNG, JPEG, WebP et GIF, **10 Mo par fichier**. Les images sont affichables et les PDF sont ouverts dans le lecteur du navigateur ; un téléchargement reste disponible. L’affichage d’un PDF dépend des capacités du navigateur. Un quota insuffisant ou un type refusé affiche une erreur et n’ajoute aucune fausse référence.

Deux modes dans Paramètres :

- **ZIP avec documents** : manifeste JSON et tous les fichiers référencés, avec contrôle SHA-256 de leur intégrité. Limite : 100 Mo de fichiers et 10 Mo de manifeste. La restauration vérifie le format, les relations et chaque fichier avant confirmation. Les écritures de fichiers utilisent une transaction IndexedDB ; un échec du stockage JSON annule la transaction.
- **JSON sans fichiers** : toutes les données et références, y compris les anciens champs, mais **pas les octets des pièces jointes**. Les sauvegardes JSON historiques restent importables. Les références seules ne rendent pas des fichiers disponibles sur un autre navigateur ; l’interface le signale.

Les liens externes portent un nom et une catégorie. Ils restent distincts des pièces jointes : l’adresse est sauvegardée, pas le contenu distant. Un import invalide ne remplace rien ; tout remplacement intégral nécessite confirmation. Une archive incomplète ou altérée est refusée.

Fermer puis rouvrir le navigateur conserve les données tant que ses données de site ne sont pas effacées. Changer d’appareil, de domaine, de port ou de profil ne les transfère pas. Il n’y a **aucune synchronisation entre appareils**. Ne pas enregistrer de documents ou sauvegardes privés dans Git.

## Organisation du code

- `App.jsx` : navigation et stockage JSON.
- `Home.jsx`, `Calendar.jsx`, `Lists.jsx` : accueil, dates, listes et achats.
- `TaskForm.jsx`, `MaintenanceForm.jsx` : deux pages de saisie distinctes.
- `FormParts.jsx`, `Preparation.jsx`, `PurchaseForm.jsx`, `Catalog.jsx` : éléments et références réutilisables.
- `DocumentsPanel.jsx`, `documents.js` : pièces jointes, liens, IndexedDB et archives.
- `SettingsPage.jsx` : préférences et sauvegardes.
- `model.js` : règles partagées, dates locales, récurrences, validation et compatibilité.
- `style.css` : palette centralisée, espacement et adaptation téléphone ; remplace les anciens empilements de styles.

Les dates sans heure sont des chaînes locales `AAAA-MM-JJ`. Le calendrier, les post-it, les achats et les contacts lisent les mêmes interventions. Les échéances et rendez-vous restent distincts. Les fréquences ne sont jamais imposées à la création. Les occurrences réalisées gardent un instantané de leurs contacts et contrats.

## Ressources visuelles et limites de référence

Le combi existant a été recoloré en terracotta/crème ; il est embarqué et ne fait aucun appel à une IA à l’affichage. Le blason utilisé est **le fichier déjà présent dans le dépôt**. Le fichier original `upload/blason.png` cité dans la V2 n’est pas disponible dans cet environnement : le visuel existant reste provisoire et doit être remplacé par le PNG/SVG authentique avant validation définitive de l’identité. Aucun nouveau blason n’a été généré pour cette V2.

Les trois maquettes `exec-0749…`, `exec-ffb2…` et `exec-10f0…` citées dans le document ne sont pas présentes. La composition suit leur description et la capture de fiche Entretien transmise pendant l’implémentation. Les captures réalisées pendant les tests sont des vues de l’application, pas une preuve de publication.

## Version publiée sur GitHub Pages

Une seule application est conservée : **la V2**, à l’adresse principale :

`https://dinou29.github.io/Taches-La-Fr-sandi-re/`

L’ancien lien `https://dinou29.github.io/Taches-La-Fr-sandi-re/v2/` redirige vers cette même application. Ce dossier contient uniquement une page de redirection, pas une deuxième version.

`npm run build:pages` reconstruit `docs/` avec la V2 et ajoute la redirection de compatibilité. Le stockage reste `maison-complice-v2` et `fresandiere-documents-v2`, comme pour la V2 précédemment distribuée sous `/v2/` : les données et fichiers V2 existants sont donc conservés. Si aucune sauvegarde V2 n’existe encore, `storage.js` copie une fois les anciennes données de `maison-complice-v1`. Les anciennes sauvegardes restent présentes dans le navigateur et ne sont jamais effacées par la mise à jour.

Après construction, `npm run test:pages` vérifie l’ouverture de la V2 à la racine, la redirection de l’ancien lien et la conservation des données et fichiers V2. Les tests utilisent un navigateur temporaire, sans données personnelles.

L’hébergement lit toujours `main` et `/docs`. La publication de la V2 seule est effectuée à la demande de l’utilisatrice. Aucun réglage GitHub Pages ni changement de visibilité du dépôt n’est nécessaire. La V1 reste récupérable dans l’historique Git, mais n’est plus proposée sur le site.

Hors périmètre : comptes partagés, synchronisation Google/Outlook, notifications hors application, SMS/courriels automatiques et extraction d’obligations réglementaires.
